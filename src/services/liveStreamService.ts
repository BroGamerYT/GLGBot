import fs from "fs";
import path from "path";
import { 
  GuildMember, 
  ChannelType, 
  Presence, 
  ActivityType, 
  EmbedBuilder,
  VoiceChannel,
  TextChannel
} from "discord.js";

interface LiveConfig {
  [guildId: string]: {
    liveRoleId: string;
    announcementChannelId?: string;
    categoryId?: string;
    channelType: "voice" | "text";
    autoRole?: boolean;
  };
}

interface ActiveLiveChannel {
  guildId: string;
  userId: string;
  channelId: string;
  channelType: "voice" | "text";
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "live_stream_config.json");
const ACTIVE_FILE = path.join(DATA_DIR, "active_live_channels.json");

class LiveStreamService {
  private config: LiveConfig = {};
  private activeChannels: ActiveLiveChannel[] = [];

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
    this.loadActive();
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
      this.config = {};
    }
  }

  private saveConfig() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (e) {
      console.error("[LiveStream] Fehler beim Speichern der Konfiguration:", e);
    }
  }

  private loadActive() {
    try {
      if (fs.existsSync(ACTIVE_FILE)) {
        this.activeChannels = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8"));
      }
    } catch (e) {
      this.activeChannels = [];
    }
  }

  private saveActive() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(ACTIVE_FILE, JSON.stringify(this.activeChannels, null, 2), "utf-8");
    } catch (e) {
      console.error("[LiveStream] Fehler beim Speichern der aktiven Kanäle:", e);
    }
  }

  public setConfig(
    guildId: string, 
    liveRoleId: string, 
    announcementChannelId?: string, 
    categoryId?: string, 
    channelType: "voice" | "text" = "voice", 
    autoRole: boolean = true
  ) {
    this.config[guildId] = {
      liveRoleId,
      announcementChannelId,
      categoryId,
      channelType,
      autoRole,
    };
    this.saveConfig();
  }

  public disableConfig(guildId: string) {
    delete this.config[guildId];
    this.saveConfig();
  }

  public getConfig(guildId: string) {
    this.loadConfig();
    return this.config[guildId] || null;
  }

  // Findet oder erstellt automatisch die Kategorie '🔴 Live Streams'
  public async ensureCategory(guild: any, configuredCategoryId?: string) {
    if (configuredCategoryId) {
      const existing = guild.channels.cache.get(configuredCategoryId);
      if (existing && existing.type === ChannelType.GuildCategory) {
        return existing;
      }
    }

    const found = guild.channels.cache.find(
      (c: any) => c.type === ChannelType.GuildCategory && 
        (c.name.toLowerCase().includes("live stream") || c.name.toLowerCase().includes("live-stream") || c.name.toLowerCase().includes("livestream"))
    );
    if (found) return found;

    try {
      const created = await guild.channels.create({
        name: "🔴 Live Streams",
        type: ChannelType.GuildCategory,
      });
      console.log(`[LiveStream] Kategorie '🔴 Live Streams' automatisch erstellt auf ${guild.name}`);
      return created;
    } catch (e) {
      console.error("[LiveStream] Konnte Kategorie '🔴 Live Streams' nicht automatisch erstellen:", e);
      return null;
    }
  }

  // --- MEMBER UPDATE (Rollen-Prüfung) ---
  public async handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
    this.loadConfig();
    const guildId = newMember.guild.id;
    const cfg = this.config[guildId];
    if (!cfg || !cfg.liveRoleId) return;

    const hadRole = oldMember.roles.cache.has(cfg.liveRoleId);
    const hasRole = newMember.roles.cache.has(cfg.liveRoleId);

    // Rolle erhalten -> Live Kanal erstellen
    if (!hadRole && hasRole) {
      await this.createLiveChannel(newMember, cfg);
    }

    // Rolle verloren -> Live Kanal löschen
    if (hadRole && !hasRole) {
      await this.deleteChannelForUser(newMember.guild, newMember.id);
    }
  }

  // --- PRESENCE UPDATE (Automatisches Zuweisen der Live-Rolle bei Stream-Start) ---
  public async handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
    if (!newPresence.guild || !newPresence.member) return;
    this.loadConfig();
    const guildId = newPresence.guild.id;
    const cfg = this.config[guildId];
    if (!cfg || !cfg.autoRole || !cfg.liveRoleId) return;

    const member = newPresence.member;
    const streamingActivity = newPresence.activities.find((a) => a.type === ActivityType.Streaming);

    // Nutzer streamt -> Live-Rolle zuweisen
    if (streamingActivity) {
      if (!member.roles.cache.has(cfg.liveRoleId)) {
        await member.roles.add(cfg.liveRoleId).catch(() => null);
        console.log(`[LiveStream] Auto-Live-Rolle an ${member.user.tag} vergeben (${streamingActivity.name})`);
      }
    } else {
      // Nutzer streamt nicht mehr -> Live-Rolle entfernen
      if (member.roles.cache.has(cfg.liveRoleId)) {
        await member.roles.remove(cfg.liveRoleId).catch(() => null);
        console.log(`[LiveStream] Auto-Live-Rolle von ${member.user.tag} entfernt`);
      }
    }
  }

  // --- LIVE KANAL ERSTELLEN ---
  private async createLiveChannel(
    member: GuildMember, 
    cfg: { announcementChannelId?: string; categoryId?: string; channelType: "voice" | "text" },
    customData?: { url?: string; title?: string; game?: string }
  ) {
    // Prüfen ob bereits ein Kanal für diesen Nutzer existiert
    const existing = this.activeChannels.find((c) => c.guildId === member.guild.id && c.userId === member.id);
    if (existing) return;

    try {
      const streaming = member.presence?.activities.find((a) => a.type === ActivityType.Streaming);
      const streamUrl = customData?.url || streaming?.url || "";
      const streamGame = customData?.game || streaming?.state || streaming?.details || streaming?.name || "Twitch Live-Stream";
      const streamTitle = customData?.title || streaming?.details || `🔴 ${member.displayName} überträgt live!`;

      const channelName = `🔴・${member.displayName} ist live`;

      const embed = new EmbedBuilder()
        .setColor(0x9146ff) // Twitch Lila
        .setAuthor({
          name: `${member.displayName} ist jetzt LIVE!`,
          iconURL: member.user.displayAvatarURL(),
        })
        .setTitle(streamTitle)
        .setURL(streamUrl || "https://twitch.tv")
        .addFields(
          { name: "🎮 Spiel / Kategorie", value: streamGame, inline: true },
          { name: "🔗 Stream-Link", value: streamUrl ? `[Hier klicken zum Stream](${streamUrl})` : "*Kein Link hinterlegt*", inline: true }
        )
        .setFooter({ text: "BroBot Live-Alerts" })
        .setTimestamp();

      // 1. Benachrichtigung in den ausgewählten Ankündigungskanal senden
      if (cfg.announcementChannelId) {
        try {
          const announceChannel = member.guild.channels.cache.get(cfg.announcementChannelId);
          if (announceChannel && "send" in announceChannel) {
            const announceText = streamUrl 
              ? `📢 **<@${member.id}> ist jetzt live auf Twitch!** Schaut vorbei auf **${streamUrl}**!` 
              : `📢 **<@${member.id}> ist jetzt live!**`;
            await (announceChannel as any).send({
              content: announceText,
              embeds: [embed],
            });
            console.log(`[LiveStream] Ankündigung gesendet in <#${cfg.announcementChannelId}> für ${member.user.tag}`);
          }
        } catch (annErr) {
          console.error("[LiveStream] Fehler beim Senden der Ankündigung:", annErr);
        }
      }

      // 2. Ziel-Kategorie ermitteln oder automatisch '🔴 Live Streams' erstellen
      const targetCategory = await this.ensureCategory(member.guild, cfg.categoryId);

      if (cfg.channelType === "voice") {
        const voiceChannel = await member.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: targetCategory ? targetCategory.id : undefined,
        });

        // Setze Sprachkanal-Status, falls Discord-Feature verfügbar ist
        const statusText = streamUrl ? `🔴 Live auf: ${streamUrl}` : `🔴 ${member.displayName} ist live!`;
        if (typeof (voiceChannel as any).setStatus === "function") {
          await (voiceChannel as any).setStatus(statusText).catch(() => null);
        }

        // Sende Info-Embed in den Textchat des Sprachkanals
        if (voiceChannel.isSendable()) {
          await voiceChannel.send({ embeds: [embed] }).catch(() => null);
        }

        this.activeChannels.push({
          guildId: member.guild.id,
          userId: member.id,
          channelId: voiceChannel.id,
          channelType: "voice",
        });
        this.saveActive();
        // KEIN AUTOMOVE: Nutzer wird nicht verschoben
        console.log(`[LiveStream] Live-Sprachkanal erstellt: ${channelName} für ${member.user.tag} (kein automove)`);
      } else {
        // Textkanal
        const textChannel = await member.guild.channels.create({
          name: `🔴・${member.displayName}-ist-live`.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
          type: ChannelType.GuildText,
          parent: targetCategory ? targetCategory.id : undefined,
        });

        await textChannel.send({
          content: streamUrl ? `📢 <@${member.id}> ist jetzt live auf **${streamUrl}**! @everyone` : `📢 <@${member.id}> ist jetzt live!`,
          embeds: [embed],
        });

        this.activeChannels.push({
          guildId: member.guild.id,
          userId: member.id,
          channelId: textChannel.id,
          channelType: "text",
        });
        this.saveActive();
        console.log(`[LiveStream] Live-Textkanal erstellt für ${member.user.tag}`);
      }
    } catch (error) {
      console.error("[LiveStream] Fehler beim Erstellen des Live-Kanals:", error);
    }
  }

  // --- MANUELLER START / BEFEHL (/twitch-live) ---
  public async startLive(member: GuildMember, customData?: { url?: string; title?: string; game?: string }) {
    this.loadConfig();
    const guildId = member.guild.id;
    const cfg = this.config[guildId];
    if (!cfg) {
      return { success: false, message: "❌ Das Live-System ist auf diesem Server noch nicht eingerichtet. Nutze `/setup-live set`." };
    }

    // 1. Live-Rolle vergeben
    if (cfg.liveRoleId && !member.roles.cache.has(cfg.liveRoleId)) {
      await member.roles.add(cfg.liveRoleId).catch(() => null);
      console.log(`[LiveStream] Live-Rolle manuell vergeben an ${member.user.tag}`);
    }

    // 2. Kanal erstellen & Benachrichtigung senden (kein automove)
    await this.createLiveChannel(member, cfg, customData);
    return { success: true, message: "🎉 Du bist jetzt als LIVE markiert! Rolle wurde zugewiesen und Kanal erstellt." };
  }

  // --- MANUELLES BEENDEN (/twitch-end) ---
  public async stopLive(member: GuildMember) {
    this.loadConfig();
    const guildId = member.guild.id;
    const cfg = this.config[guildId];

    // Live-Rolle entfernen
    if (cfg && cfg.liveRoleId && member.roles.cache.has(cfg.liveRoleId)) {
      await member.roles.remove(cfg.liveRoleId).catch(() => null);
    }

    // Kanal löschen
    await this.deleteChannelForUser(member.guild, member.id);
    return { success: true, message: "🛑 Live-Status beendet. Deine Live-Rolle wurde entfernt und der Kanal gelöscht." };
  }

  // --- LIVE KANAL ENTFERNEN ---
  private async removeLiveChannel(guildId: string, userId: string) {
    const index = this.activeChannels.findIndex((c) => c.guildId === guildId && c.userId === userId);
    if (index === -1) return;

    const item = this.activeChannels[index];
    this.activeChannels.splice(index, 1);
    this.saveActive();

    try {
      const guild = this.activeChannels.length ? null : null; // Guild fetch
      // Hole den Kanal über Client
      // Der Client-Cache wird im Aufrufer oder über guild gelöscht
    } catch (e) {
      // Ignoriere
    }
  }

  public async deleteChannelForUser(guild: any, userId: string) {
    const index = this.activeChannels.findIndex((c) => c.guildId === guild.id && c.userId === userId);
    if (index === -1) return;

    const item = this.activeChannels[index];
    this.activeChannels.splice(index, 1);
    this.saveActive();

    try {
      const channel = guild.channels.cache.get(item.channelId);
      if (channel) {
        await channel.delete("Stream beendet (Live-Rolle entfernt)").catch(() => null);
        console.log(`[LiveStream] Live-Kanal gelöscht: ${channel.name}`);
      }
    } catch (e) {
      console.error("[LiveStream] Fehler beim Löschen des Live-Kanals:", e);
    }
  }
}

export const liveStreamService = new LiveStreamService();
