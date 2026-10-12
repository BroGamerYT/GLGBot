import fs from "fs";
import path from "path";
import crypto from "crypto";
import { writeJsonAtomic } from "../utils/jsonFile";
import {
  Client,
  Guild,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";

export type AuditCategory = "message" | "member" | "channel" | "role" | "voice" | "server";

export interface AuditLogEntry {
  id: string;
  guildId: string;
  timestamp: string;
  category: AuditCategory;
  action: string;
  executor?: { id: string; tag: string; avatar?: string };
  target?: { id: string; tag?: string; name?: string };
  details: Record<string, any>;
}

export interface AuditLogConfig {
  logChannelId?: string;
  enabled: {
    messages: boolean;
    members: boolean;
    channels: boolean;
    roles: boolean;
    voice: boolean;
    server: boolean;
  };
  ignoredChannelIds?: string[];
  ignoredUserIds?: string[];
}

interface FullConfig {
  [guildId: string]: AuditLogConfig;
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "audit_log_config.json");
const LOGS_FILE = path.join(DATA_DIR, "audit_logs.json");
const MAX_ENTRIES = 3000;

class AuditLogService {
  private config: FullConfig = {};
  private logs: AuditLogEntry[] = [];
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
    this.loadLogs();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[AuditLogService] Fehler beim Laden der Audit-Log-Config:", e);
      this.config = {};
    }
  }

  private saveConfig() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(CONFIG_FILE, this.config);
    } catch (e) {
      console.error("[AuditLogService] Fehler beim Speichern der Audit-Log-Config:", e);
    }
  }

  private loadLogs() {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        this.logs = JSON.parse(fs.readFileSync(LOGS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[AuditLogService] Fehler beim Laden der Audit-Logs:", e);
      this.logs = [];
    }
  }

  private scheduleSaveLogs() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        this.ensureDataDir();
        writeJsonAtomic(LOGS_FILE, this.logs);
      } catch (e) {
        console.error("[AuditLogService] Fehler beim Speichern der Audit-Logs:", e);
      }
    }, 1000);
  }

  public getConfig(guildId: string): AuditLogConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {
        enabled: {
          messages: true,
          members: true,
          channels: true,
          roles: true,
          voice: true,
          server: true,
        },
        ignoredChannelIds: [],
        ignoredUserIds: [],
      };
      this.saveConfig();
    } else if (this.config[guildId].enabled.server === undefined) {
      this.config[guildId].enabled.server = true;
      this.saveConfig();
    }
    return this.config[guildId];
  }

  public setConfig(guildId: string, patch: Partial<AuditLogConfig>): AuditLogConfig {
    const current = this.getConfig(guildId);
    this.config[guildId] = {
      ...current,
      ...patch,
      enabled: {
        ...current.enabled,
        ...(patch.enabled || {}),
      },
    };
    this.saveConfig();
    return this.config[guildId];
  }

  public async ensureLogChannel(guild: Guild): Promise<TextChannel> {
    const current = this.getConfig(guild.id);
    if (current.logChannelId) {
      const existing = guild.channels.cache.get(current.logChannelId);
      if (existing && existing.type === ChannelType.GuildText) {
        return existing as TextChannel;
      }
    }

    // Suche existierenden Log-Kanal
    const found = guild.channels.cache.find(
      (c) => c.isTextBased() && (c.name.includes("audit-log") || c.name.includes("bot-log") || c.name.includes("mod-log"))
    );
    if (found && found.type === ChannelType.GuildText) {
      this.setConfig(guild.id, { logChannelId: found.id });
      return found as TextChannel;
    }

    // Neu anlegen mit privaten Rechten (nur Admins & Bot)
    const newChannel = await guild.channels.create({
      name: "📁・audit-logs",
      type: ChannelType.GuildText,
      topic: "Zentraler Sicherheits- und Audit-Log für Serveränderungen, Nachrichten, Mitglieder & Voice",
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
      reason: "Automatischer Setup des Audit-Log-Kanals",
    });

    this.setConfig(guild.id, { logChannelId: newChannel.id });
    console.log(`[AuditLogService] Neuer Audit-Log-Kanal erstellt: ${newChannel.name} (${newChannel.id})`);
    return newChannel;
  }

  public async log(
    entryData: Omit<AuditLogEntry, "id" | "timestamp">,
    client: Client
  ): Promise<AuditLogEntry | null> {
    const cfg = this.getConfig(entryData.guildId);

    // Prüfen, ob Kategorie aktiviert ist
    if (entryData.category === "message" && !cfg.enabled.messages) return null;
    if (entryData.category === "member" && !cfg.enabled.members) return null;
    if (entryData.category === "channel" && !cfg.enabled.channels) return null;
    if (entryData.category === "role" && !cfg.enabled.roles) return null;
    if (entryData.category === "voice" && !cfg.enabled.voice) return null;
    if (entryData.category === "server" && !cfg.enabled.server) return null;

    // Ignorierte Channels oder User
    if (entryData.details?.channelId && cfg.ignoredChannelIds?.includes(entryData.details.channelId)) {
      return null;
    }
    if (entryData.executor?.id && cfg.ignoredUserIds?.includes(entryData.executor.id)) {
      return null;
    }
    if (entryData.target?.id && cfg.ignoredUserIds?.includes(entryData.target.id)) {
      return null;
    }

    const fullEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entryData,
    };

    // Im Speicher & JSON persistieren
    this.logs.unshift(fullEntry);
    if (this.logs.length > MAX_ENTRIES) {
      this.logs = this.logs.slice(0, MAX_ENTRIES);
    }
    this.scheduleSaveLogs();

    // An Discord-Logkanal senden
    if (cfg.logChannelId) {
      try {
        const guild = client.guilds.cache.get(entryData.guildId);
        if (guild) {
          const ch = guild.channels.cache.get(cfg.logChannelId);
          if (ch && ch.isTextBased()) {
            const embed = this.createEmbed(fullEntry);
            await (ch as TextChannel).send({
              embeds: [embed],
              flags: MessageFlags.SuppressNotifications,
            }).catch((e) => {
              console.warn(`[AuditLogService] Konnte Embed nicht senden in #${ch.name}:`, e.message);
            });
          }
        }
      } catch (err) {
        console.error("[AuditLogService] Fehler beim Versenden des Logs an Discord:", err);
      }
    }

    return fullEntry;
  }

  public getLogs(
    guildId: string,
    options: {
      category?: string;
      action?: string;
      query?: string;
      page?: number;
      limit?: number;
    } = {}
  ): { logs: AuditLogEntry[]; total: number; page: number; totalPages: number } {
    let filtered = this.logs.filter((l) => l.guildId === guildId);

    if (options.category && options.category !== "all") {
      filtered = filtered.filter((l) => l.category === options.category);
    }
    if (options.action) {
      filtered = filtered.filter((l) => l.action.toLowerCase().includes(options.action!.toLowerCase()));
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter((l) => {
        return (
          l.executor?.tag.toLowerCase().includes(q) ||
          l.target?.tag?.toLowerCase().includes(q) ||
          l.target?.name?.toLowerCase().includes(q) ||
          JSON.stringify(l.details).toLowerCase().includes(q)
        );
      });
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      logs: paginated,
      total,
      page,
      totalPages,
    };
  }

  public getStats(guildId: string) {
    const list = this.logs.filter((l) => l.guildId === guildId);
    const counts: Record<string, number> = {
      message: 0,
      member: 0,
      channel: 0,
      role: 0,
      voice: 0,
      server: 0,
    };
    for (const item of list) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return {
      total: list.length,
      categories: counts,
      lastLog: list[0] ? list[0].timestamp : null,
    };
  }

  // --- EMBED BUILDER ---
  private createEmbed(entry: AuditLogEntry): EmbedBuilder {
    const embed = new EmbedBuilder().setTimestamp(new Date(entry.timestamp));

    switch (entry.action) {
      // Nachricht gelöscht
      case "MESSAGE_DELETE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("🗑️ Nachricht gelöscht")
          .addFields(
            { name: "Autor", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Unbekannt", inline: true },
            { name: "Kanal", value: entry.details?.channelName ? `<#${entry.details.channelId}> (\`#${entry.details.channelName}\`)` : "Unbekannt", inline: true },
            { name: "Inhalt", value: (entry.details?.content?.slice(0, 1000) || "*Kein Textinhalt (Embed oder Bild)*"), inline: false }
          );
        if (entry.details?.attachments && entry.details.attachments.length > 0) {
          embed.addFields({
            name: "Anhänge",
            value: entry.details.attachments.map((a: any) => `📎 [${a.name || "Datei"}](${a.url})`).join("\n").slice(0, 500),
            inline: false,
          });
        }
        break;
      }

      // Nachricht bearbeitet
      case "MESSAGE_UPDATE": {
        embed
          .setColor(0xfee75c) // Gelb
          .setTitle("✏️ Nachricht bearbeitet")
          .addFields(
            { name: "Autor", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Unbekannt", inline: true },
            { name: "Kanal", value: entry.details?.channelName ? `<#${entry.details.channelId}>` : "Unbekannt", inline: true },
            { name: "Vorher", value: (entry.details?.oldContent?.slice(0, 1000) || "*Kein Text*"), inline: false },
            { name: "Nachher", value: (entry.details?.newContent?.slice(0, 1000) || "*Kein Text*"), inline: false }
          );
        if (entry.details?.url) {
          embed.addFields({ name: "Sprunglink", value: `[Zur Nachricht](${entry.details.url})`, inline: true });
        }
        break;
      }

      // Mitglied beigetreten
      case "MEMBER_JOIN": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("📥 Mitglied beigetreten")
          .setThumbnail(entry.executor?.avatar || null)
          .addFields(
            { name: "Nutzer", value: `<@${entry.executor?.id}> (\`${entry.executor?.tag}\`)`, inline: true },
            { name: "Account erstellt", value: entry.details?.createdAt || "Unbekannt", inline: true },
            { name: "Mitgliederanzahl", value: `${entry.details?.memberCount || "?"}`, inline: true }
          );
        break;
      }

      // Mitglied verlassen
      case "MEMBER_LEAVE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("📤 Mitglied verlassen")
          .addFields(
            { name: "Nutzer", value: `\`${entry.executor?.tag}\` (${entry.executor?.id})`, inline: true },
            { name: "Rollen", value: entry.details?.roles?.join(", ") || "*Keine*", inline: false }
          );
        break;
      }

      // Nickname geändert
      case "MEMBER_NICK_UPDATE": {
        embed
          .setColor(0xe67e22) // Orange
          .setTitle("🏷️ Nickname geändert")
          .addFields(
            { name: "Nutzer", value: `<@${entry.target?.id}>`, inline: true },
            { name: "Geändert von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Selbst", inline: true },
            { name: "Alter Nickname", value: `\`${entry.details?.oldNick || "*Keiner*"}\``, inline: true },
            { name: "Neuer Nickname", value: `\`${entry.details?.newNick || "*Keiner*"}\``, inline: true }
          );
        break;
      }

      // Rollenvergabe geändert
      case "MEMBER_ROLES_UPDATE": {
        embed
          .setColor(0x5865f2) // Blurple
          .setTitle("🛡️ Mitglieder-Rollen geändert")
          .addFields(
            { name: "Nutzer", value: `<@${entry.target?.id}>`, inline: true },
            { name: "Ausgeführt von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Selbst", inline: true }
          );
        if (entry.details?.added && entry.details.added.length > 0) {
          embed.addFields({ name: "➕ Hinzugefügte Rollen", value: entry.details.added.map((r: string) => `\`${r}\``).join(", "), inline: false });
        }
        if (entry.details?.removed && entry.details.removed.length > 0) {
          embed.addFields({ name: "➖ Entfernte Rollen", value: entry.details.removed.map((r: string) => `\`${r}\``).join(", "), inline: false });
        }
        break;
      }

      // Mitglied gekickt
      case "MEMBER_KICK": {
        embed
          .setColor(0xed4245)
          .setTitle("👢 Mitglied gekickt")
          .addFields(
            { name: "Mitglied", value: `<@${entry.target?.id}> (\`${entry.target?.tag || entry.target?.name}\`)`, inline: true },
            { name: "Moderator", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Unbekannt / System", inline: true },
            { name: "Begründung", value: entry.details?.reason || "*Keine Begründung*", inline: false }
          );
        break;
      }

      // Mitglied gebannt
      case "MEMBER_BAN": {
        embed
          .setColor(0x992d22)
          .setTitle("🔨 Mitglied gebannt")
          .addFields(
            { name: "Mitglied", value: `<@${entry.target?.id}> (\`${entry.target?.tag || entry.target?.name}\`)`, inline: true },
            { name: "Moderator", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Unbekannt / System", inline: true },
            { name: "Begründung", value: entry.details?.reason || "*Keine Begründung*", inline: false }
          );
        break;
      }

      // Kanal erstellt
      case "CHANNEL_CREATE": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("📁 Kanal erstellt")
          .addFields(
            { name: "Kanal", value: `<#${entry.target?.id}> (\`#${entry.target?.name}\`)`, inline: true },
            { name: "Erstellt von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true },
            { name: "Typ", value: `\`${entry.details?.type}\``, inline: true }
          );
        if (entry.details?.parent) {
          embed.addFields({ name: "Kategorie", value: `\`${entry.details.parent}\``, inline: true });
        }
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Kanal gelöscht
      case "CHANNEL_DELETE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("🗑️ Kanal gelöscht")
          .addFields(
            { name: "Gelöschter Kanal", value: `\`#${entry.target?.name}\``, inline: true },
            { name: "Gelöscht von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true },
            { name: "Typ", value: `\`${entry.details?.type}\``, inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Kanal bearbeitet
      case "CHANNEL_UPDATE": {
        embed
          .setColor(0xfee75c) // Gelb
          .setTitle("⚙️ Kanal bearbeitet")
          .addFields(
            { name: "Kanal", value: `<#${entry.target?.id}> (\`#${entry.target?.name}\`)`, inline: true },
            { name: "Bearbeitet von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true }
          );
        if (entry.details?.nameChanged) {
          embed.addFields(
            { name: "Alter Name", value: `\`${entry.details.nameChanged.old}\``, inline: true },
            { name: "Neuer Name", value: `\`${entry.details.nameChanged.new}\``, inline: true }
          );
        }
        if (entry.details?.topicChanged) {
          embed.addFields(
            { name: "Neues Thema", value: entry.details.topicChanged.new ? `\`${entry.details.topicChanged.new.slice(0, 300)}\`` : "*Kein Thema*", inline: false }
          );
        }
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Rolle erstellt
      case "ROLE_CREATE": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("🎛️ Rolle erstellt")
          .addFields(
            { name: "Rolle", value: `<@&${entry.target?.id}> (\`${entry.target?.name}\`)`, inline: true },
            { name: "Erstellt von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true },
            { name: "Farbe", value: `\`#${entry.details?.color || "000000"}\``, inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Rolle gelöscht
      case "ROLE_DELETE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("🗑️ Rolle gelöscht")
          .addFields(
            { name: "Rolle", value: `\`${entry.target?.name}\``, inline: true },
            { name: "Gelöscht von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Rolle aktualisiert
      case "ROLE_UPDATE": {
        embed
          .setColor(0xfee75c) // Gelb
          .setTitle("⚙️ Rolle bearbeitet")
          .addFields(
            { name: "Rolle", value: `<@&${entry.target?.id}> (\`${entry.target?.name}\`)`, inline: true },
            { name: "Bearbeitet von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "System / Unbekannt", inline: true }
          );
        if (entry.details?.nameChanged) {
          embed.addFields(
            { name: "Alter Name", value: `\`${entry.details.nameChanged.old}\``, inline: true },
            { name: "Neuer Name", value: `\`${entry.details.nameChanged.new}\``, inline: true }
          );
        }
        if (entry.details?.colorChanged) {
          embed.addFields(
            { name: "Farbe alt/neu", value: `\`#${entry.details.colorChanged.old}\` ➔ \`#${entry.details.colorChanged.new}\``, inline: true }
          );
        }
        if (entry.details?.reason) {
          embed.addFields({ name: "Grund", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Voice Ereignisse
      case "VOICE_JOIN": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("🎙️ Voice beigetreten")
          .addFields(
            { name: "Nutzer", value: `<@${entry.executor?.id}>`, inline: true },
            { name: "Kanal", value: `<#${entry.details?.channelId}> (\`${entry.details?.channelName}\`)`, inline: true }
          );
        break;
      }

      case "VOICE_LEAVE": {
        const disconnByMod = entry.details?.disconnectedByModerator;
        embed
          .setColor(disconnByMod ? 0xed4245 : 0x95a5a6) // Rot falls Mod, sonst Grau
          .setTitle(disconnByMod ? "🚪 Aus Voice gekickt" : "🚪 Voice verlassen")
          .addFields(
            { name: "Nutzer", value: `<@${entry.target?.id || entry.executor?.id}>`, inline: true }
          );
        if (disconnByMod) {
          embed.addFields({
            name: "Gekickt von",
            value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Moderator",
            inline: true,
          });
        }
        embed.addFields(
          { name: "Kanal", value: `\`${entry.details?.channelName}\``, inline: true }
        );
        break;
      }

      case "VOICE_MOVE": {
        const movedByMod = entry.details?.movedByModerator;
        embed
          .setColor(movedByMod ? 0xeb459e : 0x5865f2) // Magenta falls Mod, sonst Blurple
          .setTitle(movedByMod ? "🔀 Durch Moderator verschoben" : "🔀 Voice-Kanal gewechselt")
          .addFields(
            { name: "Nutzer", value: `<@${entry.target?.id || entry.executor?.id}>`, inline: true }
          );
        if (movedByMod) {
          embed.addFields({
            name: "Verschoben von",
            value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Moderator",
            inline: true,
          });
        } else {
          embed.addFields({
            name: "Aktion",
            value: "Selbst gewechselt",
            inline: true,
          });
        }
        embed.addFields(
          { name: "Alter Kanal", value: `\`${entry.details?.oldChannelName}\``, inline: true },
          { name: "Neuer Kanal", value: `<#${entry.details?.newChannelId}> (\`${entry.details?.newChannelName}\`)`, inline: true }
        );
        break;
      }

      case "VOICE_STATE": {
        embed
          .setColor(0x9b59b6) // Lila
          .setTitle("🎙️ Voice-Status geändert")
          .addFields(
            { name: "Nutzer", value: `<@${entry.target?.id || entry.executor?.id}>`, inline: true },
            { name: "Änderung", value: entry.details?.change || "Status geändert", inline: true }
          );
        if (entry.executor && entry.target && entry.executor.id !== entry.target.id) {
          embed.addFields({
            name: "Ausgeführt von",
            value: `<@${entry.executor.id}> (\`${entry.executor.tag}\`)`,
            inline: true,
          });
        }
        break;
      }

      // Server-Einstellungen geändert
      case "GUILD_UPDATE": {
        embed
          .setColor(0x3498db) // Hellblau
          .setTitle("⚙️ Server-Einstellungen geändert")
          .addFields(
            {
              name: "Ausgeführt von",
              value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator / Unbekannt",
              inline: false,
            }
          );
        if (entry.details?.newIconUrl) {
          embed.setThumbnail(entry.details.newIconUrl);
        }
        if (entry.details?.changes && Array.isArray(entry.details.changes)) {
          for (const ch of entry.details.changes.slice(0, 10)) {
            embed.addFields({
              name: ch.label || ch.setting || "Einstellung",
              value: `\`${ch.oldValue || "*Leer*"}\` ➔ \`${ch.newValue || "*Leer*"}\``,
              inline: true,
            });
          }
        }
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      // Emoji Ereignisse
      case "EMOJI_CREATE": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("😀 Server-Emoji hinzugefügt")
          .addFields(
            { name: "Name", value: `\`:${entry.target?.name}:\``, inline: true },
            { name: "Hinzugefügt von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator", inline: true }
          );
        if (entry.details?.url) {
          embed.setThumbnail(entry.details.url);
        }
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      case "EMOJI_DELETE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("🗑️ Server-Emoji gelöscht")
          .addFields(
            { name: "Name", value: `\`:${entry.target?.name}:\``, inline: true },
            { name: "Gelöscht von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator", inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      case "EMOJI_UPDATE": {
        embed
          .setColor(0xfee75c) // Gelb
          .setTitle("✏️ Server-Emoji umbenannt")
          .addFields(
            { name: "Alter Name", value: `\`:${entry.details?.oldName}:\``, inline: true },
            { name: "Neuer Name", value: `\`:${entry.details?.newName}:\``, inline: true },
            { name: "Geändert von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator", inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      case "STICKER_CREATE": {
        embed
          .setColor(0x57f287) // Grün
          .setTitle("🏷️ Server-Sticker hinzugefügt")
          .addFields(
            { name: "Name", value: `\`${entry.target?.name}\``, inline: true },
            { name: "Hinzugefügt von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator", inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      case "STICKER_DELETE": {
        embed
          .setColor(0xed4245) // Rot
          .setTitle("🗑️ Server-Sticker gelöscht")
          .addFields(
            { name: "Name", value: `\`${entry.target?.name}\``, inline: true },
            { name: "Gelöscht von", value: entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Administrator", inline: true }
          );
        if (entry.details?.reason) {
          embed.addFields({ name: "Begründung", value: `\`${entry.details.reason}\``, inline: false });
        }
        break;
      }

      default: {
        embed
          .setColor(0x95a5a6) // Grau
          .setTitle(`ℹ️ ${entry.action}`)
          .setDescription(JSON.stringify(entry.details, null, 2).slice(0, 1000));
        break;
      }
    }

    embed.setFooter({
      text: `GLG Audit-Log • ID: ${entry.id.slice(0, 8)}`,
    });

    return embed;
  }
}

export const auditLogService = new AuditLogService();
