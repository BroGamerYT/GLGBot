import fs from "fs";
import path from "path";
import {
  Client,
  Guild,
  GuildMember,
  ChannelType,
  Presence,
  ActivityType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

interface GuildLiveConfig {
  liveRoleId: string;
  announcementChannelId?: string;
  categoryId?: string;
  channelType: "voice" | "text";
  autoRole?: boolean;
  pingRoleId?: string;
  silent?: boolean;
  customMessage?: string;
}

interface LiveConfig {
  [guildId: string]: GuildLiveConfig;
}

/**
 * Woher weiß der Bot, dass jemand live ist?
 *  - presence: Discord-Status zeigt "Streamt" (Twitch/YouTube mit Discord verknüpft)
 *  - stream:   Twitch/YouTube-Poller (/streamer mit verknüpftem Discord-Nutzer)
 *  - manual:   /twitch-live start
 *  - role:     Ein Admin hat die Live-Rolle von Hand vergeben
 *
 * Rolle & Temp-Kanal bleiben, solange mindestens eine Quelle "live" meldet.
 */
export type LiveSource = "presence" | "stream" | "manual" | "role";

interface LiveEntry {
  guildId: string;
  userId: string;
  sources: LiveSource[];
  channelId?: string;
  channelType?: "voice" | "text";
}

interface LiveData {
  url?: string;
  title?: string;
  game?: string;
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "live_stream_config.json");
const ACTIVE_FILE = path.join(DATA_DIR, "active_live_channels.json");

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

class LiveStreamService {
  private config: LiveConfig = {};
  private entries: LiveEntry[] = [];
  // Verhindert doppelte Kanäle, wenn mehrere Events gleichzeitig feuern
  private pendingCreates: Map<string, Promise<void>> = new Map();
  // Stream-Infos (Link, Titel, Spiel) für den nächsten Kanal, egal welches Event ihn erstellt
  private pendingData: Map<string, LiveData> = new Map();
  private recentAnnouncements: Map<string, number> = new Map();

  public markAnnounced(guildId: string, userId: string) {
    this.recentAnnouncements.set(`${guildId}:${userId}`, Date.now());
  }

  public wasRecentlyAnnounced(guildId: string, userId: string): boolean {
    const ts = this.recentAnnouncements.get(`${guildId}:${userId}`);
    if (!ts) return false;
    return Date.now() - ts < 15 * 60 * 1000;
  }

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
    this.loadActive();
  }

  private key(guildId: string, userId: string) {
    return `${guildId}:${userId}`;
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
        const raw = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8"));
        // Altes Format (ohne "sources") übernehmen
        this.entries = (Array.isArray(raw) ? raw : []).map((e: any) => ({
          guildId: e.guildId,
          userId: e.userId,
          channelId: e.channelId,
          channelType: e.channelType,
          sources: Array.isArray(e.sources) && e.sources.length ? e.sources : ["role"],
        }));
      }
    } catch (e) {
      this.entries = [];
    }
  }

  private saveActive() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(ACTIVE_FILE, JSON.stringify(this.entries, null, 2), "utf-8");
    } catch (e) {
      console.error("[LiveStream] Fehler beim Speichern der aktiven Kanäle:", e);
    }
  }

  private getEntry(guildId: string, userId: string) {
    return this.entries.find((e) => e.guildId === guildId && e.userId === userId);
  }

  public setConfig(
    guildId: string,
    liveRoleId: string,
    announcementChannelId?: string,
    categoryId?: string,
    channelType: "voice" | "text" = "voice",
    autoRole: boolean = true,
    pingRoleId?: string,
    silent: boolean = false,
    customMessage?: string
  ) {
    this.config[guildId] = {
      liveRoleId,
      announcementChannelId,
      categoryId,
      channelType,
      autoRole,
      pingRoleId,
      silent,
      customMessage,
    };
    this.saveConfig();
    return this.config[guildId];
  }

  public disableConfig(guildId: string) {
    delete this.config[guildId];
    this.saveConfig();
  }

  public getConfig(guildId: string) {
    this.loadConfig();
    return this.config[guildId] || null;
  }

  public getSources(guildId: string, userId: string): LiveSource[] {
    return this.getEntry(guildId, userId)?.sources || [];
  }

  // Findet oder erstellt automatisch die Kategorie '🔴 Live Streams'
  public async ensureCategory(guild: Guild, configuredCategoryId?: string) {
    if (configuredCategoryId) {
      const existing = guild.channels.cache.get(configuredCategoryId);
      if (existing && existing.type === ChannelType.GuildCategory) {
        return existing;
      }
    }

    const voiceCat = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        (c.name.toLowerCase().includes("voice") || c.name.toLowerCase().includes("sprach"))
    );

    const found = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        (c.name.toLowerCase().includes("live stream") ||
          c.name.toLowerCase().includes("live-stream") ||
          c.name.toLowerCase().includes("livestream"))
    );
    if (found && found.type === ChannelType.GuildCategory) {
      if (voiceCat && voiceCat.type === ChannelType.GuildCategory && found.position !== voiceCat.position + 1) {
        await found.setPosition(voiceCat.position + 1).catch(() => null);
      }
      return found;
    }

    try {
      const created = await guild.channels.create({
        name: "🔴 Live Streams",
        type: ChannelType.GuildCategory,
        position: voiceCat && voiceCat.type === ChannelType.GuildCategory ? voiceCat.position + 1 : undefined,
      });
      console.log(`[LiveStream] Kategorie '🔴 Live Streams' automatisch erstellt auf ${guild.name}`);
      return created;
    } catch (e) {
      console.error("[LiveStream] Konnte Kategorie '🔴 Live Streams' nicht automatisch erstellen:", e);
      return null;
    }
  }

  // =====================================================================
  //  ZENTRALE LOGIK: live setzen / live beenden
  // =====================================================================

  /**
   * Markiert ein Mitglied als live (aus einer bestimmten Quelle).
   * Vergibt die Live-Rolle und erstellt den Temp-Kanal, falls noch nicht vorhanden.
   */
  public async setLive(member: GuildMember, source: LiveSource, data?: LiveData) {
    this.loadConfig();
    const cfg = this.config[member.guild.id];
    if (!cfg || !cfg.liveRoleId) {
      return { success: false, message: "❌ Das Live-System ist auf diesem Server noch nicht eingerichtet. Nutze `/setup-live set`." };
    }

    // 1. Quelle merken (Eintrag VOR der Rollenvergabe anlegen, damit das
    //    GuildMemberUpdate-Event weiß, dass der Bot die Rolle vergeben hat)
    let entry = this.getEntry(member.guild.id, member.id);
    if (!entry) {
      entry = { guildId: member.guild.id, userId: member.id, sources: [] };
      this.entries.push(entry);
    }
    if (!entry.sources.includes(source)) {
      entry.sources.push(source);
      this.saveActive();
    }

    if (data) this.pendingData.set(this.key(member.guild.id, member.id), data);

    // 2. Rolle vergeben
    if (!member.roles.cache.has(cfg.liveRoleId)) {
      try {
        await member.roles.add(cfg.liveRoleId, `Live (${source})`);
        console.log(`[LiveStream] Live-Rolle an ${member.user.tag} vergeben (Quelle: ${source})`);
      } catch (e) {
        console.error(`[LiveStream] Konnte Live-Rolle nicht vergeben (Bot-Rolle zu niedrig?):`, e);
        return { success: false, message: "❌ Die Live-Rolle konnte nicht vergeben werden. Die Bot-Rolle muss in den Server-Einstellungen **über** der Live-Rolle stehen." };
      }
    }

    // 3. Temp-Kanal erstellen (falls noch keiner existiert)
    const ok = await this.ensureLiveChannel(member, cfg, data);
    if (!ok) {
      return { success: false, message: "⚠️ Live-Rolle vergeben, aber der Live-Kanal konnte nicht erstellt werden (fehlen dem Bot Rechte?)." };
    }
    return { success: true, message: "🎉 Du bist jetzt als LIVE markiert! Rolle wurde zugewiesen und dein Live-Kanal erstellt." };
  }

  /**
   * Entfernt eine Live-Quelle. Erst wenn keine Quelle mehr übrig ist,
   * werden Live-Rolle und Temp-Kanal entfernt.
   * Mit source = "all" wird der Live-Status komplett beendet.
   */
  public async clearLive(member: GuildMember, source: LiveSource | "all") {
    const entry = this.getEntry(member.guild.id, member.id);
    if (entry) {
      entry.sources = source === "all" ? [] : entry.sources.filter((s) => s !== source);
      this.saveActive();
      if (entry.sources.length > 0) {
        console.log(`[LiveStream] ${member.user.tag}: Quelle '${source}' beendet, bleibt live über: ${entry.sources.join(", ")}`);
        return { success: true, stillLive: true };
      }
    }

    // Keine Quelle mehr -> Kanal löschen, dann Rolle entfernen
    await this.endLive(member.guild, member.id);

    this.loadConfig();
    const cfg = this.config[member.guild.id];
    if (cfg?.liveRoleId && member.roles.cache.has(cfg.liveRoleId)) {
      await member.roles.remove(cfg.liveRoleId, "Nicht mehr live").catch((e) =>
        console.error("[LiveStream] Konnte Live-Rolle nicht entfernen:", e)
      );
      console.log(`[LiveStream] Live-Rolle von ${member.user.tag} entfernt`);
    }
    return { success: true, stillLive: false };
  }

  /** Löscht Eintrag + Temp-Kanal eines Nutzers. */
  private async endLive(guild: Guild, userId: string) {
    const index = this.entries.findIndex((e) => e.guildId === guild.id && e.userId === userId);
    if (index === -1) return;

    const entry = this.entries[index];
    this.entries.splice(index, 1);
    this.saveActive();

    if (!entry.channelId) return;
    const channel = guild.channels.cache.get(entry.channelId);
    if (channel) {
      await channel.delete("Stream beendet").catch(() => null);
      console.log(`[LiveStream] Live-Kanal gelöscht: ${channel.name}`);
    }
  }

  // =====================================================================
  //  EVENTS
  // =====================================================================

  // Rolle wurde (von Hand oder vom Bot) vergeben / entfernt
  public async handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
    this.loadConfig();
    const cfg = this.config[newMember.guild.id];
    if (!cfg || !cfg.liveRoleId) return;

    const hadRole = oldMember.roles.cache.has(cfg.liveRoleId);
    const hasRole = newMember.roles.cache.has(cfg.liveRoleId);

    // Rolle erhalten
    if (!hadRole && hasRole) {
      let entry = this.getEntry(newMember.guild.id, newMember.id);
      if (!entry) {
        // Kein Eintrag -> ein Admin hat die Rolle von Hand vergeben
        entry = { guildId: newMember.guild.id, userId: newMember.id, sources: ["role"] };
        this.entries.push(entry);
        this.saveActive();
      }
      await this.ensureLiveChannel(newMember, cfg);
    }

    // Rolle verloren (z. B. von einem Admin entfernt) -> Live komplett beenden
    if (hadRole && !hasRole) {
      await this.endLive(newMember.guild, newMember.id);
    }
  }

  // Discord-Status "Streamt" -> automatisch live
  public async handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
    if (!newPresence.guild || !newPresence.member) return;
    this.loadConfig();
    const cfg = this.config[newPresence.guild.id];
    if (!cfg || !cfg.autoRole || !cfg.liveRoleId) return;

    const member = newPresence.member;
    const streaming = newPresence.activities.find((a) => a.type === ActivityType.Streaming);
    const hasPresenceSource = this.getSources(member.guild.id, member.id).includes("presence");

    if (streaming && !hasPresenceSource) {
      await this.setLive(member, "presence", {
        url: streaming.url || undefined,
        game: streaming.state || undefined,
        title: streaming.details || undefined,
      });
    } else if (!streaming && hasPresenceSource) {
      // Nur die Quelle "presence" entfernen - wer per /twitch-live oder
      // Poller live ist, behält Rolle & Kanal
      await this.clearLive(member, "presence");
    }
  }

  // =====================================================================
  //  /twitch-live start & stop
  // =====================================================================

  public async startLive(member: GuildMember, data?: LiveData) {
    if (data?.url && !isHttpUrl(data.url)) {
      return { success: false, message: "❌ Ungültiger Link. Bitte gib eine vollständige URL an, z. B. `https://twitch.tv/deinkanal`." };
    }
    return this.setLive(member, "manual", data);
  }

  public async stopLive(member: GuildMember) {
    await this.clearLive(member, "all");
    return { success: true, message: "🛑 Live-Status beendet. Deine Live-Rolle wurde entfernt und der Kanal gelöscht." };
  }

  // =====================================================================
  //  TEMP-KANAL
  // =====================================================================

  /** Erstellt den Live-Kanal, falls noch keiner existiert. Gibt false bei Fehler zurück. */
  private async ensureLiveChannel(member: GuildMember, cfg: GuildLiveConfig, data?: LiveData): Promise<boolean> {
    const key = this.key(member.guild.id, member.id);

    // Läuft gerade schon eine Erstellung (z. B. Event + Befehl gleichzeitig)? Dann darauf warten.
    const pending = this.pendingCreates.get(key);
    if (pending) {
      await pending;
      return Boolean(this.getEntry(member.guild.id, member.id)?.channelId);
    }

    const entry = this.getEntry(member.guild.id, member.id);
    if (!entry) return false;
    if (entry.channelId && member.guild.channels.cache.has(entry.channelId)) return true;

    const job = this.createLiveChannel(member, cfg, entry, data || this.pendingData.get(key));
    this.pendingCreates.set(key, job);
    try {
      await job;
    } finally {
      this.pendingCreates.delete(key);
      this.pendingData.delete(key);
    }
    return Boolean(entry.channelId);
  }

  private async createLiveChannel(member: GuildMember, cfg: GuildLiveConfig, entry: LiveEntry, data?: LiveData) {
    try {
      const streaming = member.presence?.activities.find((a) => a.type === ActivityType.Streaming);
      const rawUrl = data?.url || streaming?.url || "";
      const streamUrl = isHttpUrl(rawUrl) ? rawUrl : "";
      const streamGame = data?.game || streaming?.state || streaming?.details || streaming?.name || "Live-Stream";
      const streamTitle = (data?.title || streaming?.details || `🔴 ${member.displayName} überträgt live!`).slice(0, 256);

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setAuthor({
          name: `${member.displayName} ist jetzt LIVE!`,
          iconURL: member.user.displayAvatarURL(),
        })
        .setTitle(streamTitle)
        .addFields(
          { name: "🎮 Spiel / Kategorie", value: streamGame.slice(0, 1024), inline: true },
          { name: "🔗 Stream-Link", value: streamUrl ? `[Hier klicken zum Stream](${streamUrl})` : "*Kein Link hinterlegt*", inline: true }
        )
        .setFooter({ text: "GLGBot Live-Streamer Suite" })
        .setTimestamp();
      if (streamUrl) embed.setURL(streamUrl);

      const targetCategory = await this.ensureCategory(member.guild, cfg.categoryId);
      const parent = targetCategory ? targetCategory.id : undefined;

      if (cfg.channelType === "voice") {
        const voiceChannel = await member.guild.channels.create({
          name: `🔴・${member.displayName} ist live`.slice(0, 100),
          type: ChannelType.GuildVoice,
          parent,
        });

        // Sprachkanal-Status setzen, falls verfügbar
        const statusText = streamUrl ? `🔴 Live auf: ${streamUrl}` : `🔴 ${member.displayName} ist live!`;
        if (typeof (voiceChannel as any).setStatus === "function") {
          await (voiceChannel as any).setStatus(statusText).catch(() => null);
        }

        await voiceChannel.send({ embeds: [embed], flags: [MessageFlags.SuppressNotifications] }).catch(() => null);

        entry.channelId = voiceChannel.id;
        entry.channelType = "voice";
        console.log(`[LiveStream] Live-Sprachkanal erstellt für ${member.user.tag}`);
      } else {
        const name = `🔴・${member.displayName}-ist-live`
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9äöüß\-_🔴・]/g, "")
          .slice(0, 100);

        const textChannel = await member.guild.channels.create({
          name: name || "🔴・live",
          type: ChannelType.GuildText,
          parent,
        });

        // Kein @everyone mehr - nur der Streamer selbst wird erwähnt
        await textChannel
          .send({
            content: `📢 <@${member.id}> ist jetzt live!`,
            embeds: [embed],
            allowedMentions: { users: [member.id] },
          })
          .catch(() => null);

        entry.channelId = textChannel.id;
        entry.channelType = "text";
        console.log(`[LiveStream] Live-Textkanal erstellt für ${member.user.tag}`);
      }

      // Ankündigung in den konfigurierten Ankündigungskanal senden (mit anpassbarem Rollen-Ping und Silent-Einstellung)
      if (cfg.announcementChannelId && !this.wasRecentlyAnnounced(member.guild.id, member.id)) {
        const announceChannel = member.guild.channels.cache.get(cfg.announcementChannelId);
        if (announceChannel && announceChannel.isTextBased()) {
          const rolesCfgPath = path.join(DATA_DIR, "role_panel_config.json");
          let pingRoleId = cfg.pingRoleId;
          if (pingRoleId === undefined) {
            try {
              if (fs.existsSync(rolesCfgPath)) {
                const rolesData = JSON.parse(fs.readFileSync(rolesCfgPath, "utf-8"));
                pingRoleId = rolesData[member.guild.id]?.streamAlertRoleId || "";
              }
            } catch {}
          }

          let pingText = "";
          let allowedRoles: string[] | undefined = undefined;
          if (pingRoleId) {
            if (pingRoleId === "@everyone") {
              pingText = "@everyone ";
            } else if (pingRoleId === "@here") {
              pingText = "@here ";
            } else {
              pingText = `<@&${pingRoleId}> `;
              allowedRoles = [pingRoleId];
            }
          }

          const isSilent = Boolean(cfg.silent);
          let messageContent = "";
          if (cfg.customMessage && cfg.customMessage.trim().length > 0) {
            const hasPingPlaceholder = /{ping}|{role}|{everyone}|{here}/i.test(cfg.customMessage);
            const replaced = cfg.customMessage
              .replace(/{streamer}/gi, member.displayName)
              .replace(/{game}/gi, streamGame)
              .replace(/{title}/gi, streamTitle)
              .replace(/{url}/gi, streamUrl || "")
              .replace(/{ping}|{role}/gi, pingText.trim());
            messageContent = hasPingPlaceholder ? replaced : `${pingText}${replaced}`;
          } else {
            messageContent = `${pingText}📢 **${member.displayName}** ist jetzt live!`;
          }

          if (isSilent && !messageContent.startsWith("@silent")) {
            messageContent = `@silent ${messageContent}`;
          }

          await (announceChannel as any)
            .send({
              content: messageContent,
              embeds: [embed],
              flags: isSilent ? [MessageFlags.SuppressNotifications] : undefined,
              allowedMentions: allowedRoles ? { roles: allowedRoles } : undefined,
            })
            .catch((e: any) => console.error("[LiveStream] Konnte Ankündigung nicht senden:", e));

          this.markAnnounced(member.guild.id, member.id);
          console.log(`[LiveStream] Stream-Alert in #${(announceChannel as any).name} gesendet (Silent: ${isSilent}, Ping: ${pingRoleId || "keiner"}).`);
        }
      }

      this.saveActive();
    } catch (error) {
      console.error("[LiveStream] Fehler beim Erstellen des Live-Kanals:", error);
    }
  }

  // =====================================================================
  //  ABGLEICH BEIM START (Bot war offline)
  // =====================================================================

  /**
   * Räumt nach einem Neustart auf: Wer nicht mehr live ist, verliert Rolle & Kanal;
   * fehlende Kanäle werden neu erstellt.
   */
  public async reconcile(client: Client) {
    this.loadConfig();
    for (const entry of [...this.entries]) {
      const guild = client.guilds.cache.get(entry.guildId);
      const cfg = this.config[entry.guildId];
      if (!guild || !cfg) continue;

      const member = await guild.members.fetch(entry.userId).catch(() => null);
      if (!member) {
        await this.endLive(guild, entry.userId);
        continue;
      }

      // Discord-Status prüfen: streamt die Person noch?
      if (entry.sources.includes("presence")) {
        const streaming = member.presence?.activities.some((a) => a.type === ActivityType.Streaming);
        if (!streaming) entry.sources = entry.sources.filter((s) => s !== "presence");
      }

      // Rolle wurde entfernt, während der Bot offline war
      if (!member.roles.cache.has(cfg.liveRoleId)) entry.sources = [];

      if (entry.sources.length === 0) {
        await this.clearLive(member, "all");
      } else {
        await this.ensureLiveChannel(member, cfg);
      }
    }
    this.saveActive();
    console.log(`[LiveStream] Abgleich nach Start abgeschlossen (${this.entries.length} aktive Live-Nutzer).`);
  }
}

export const liveStreamService = new LiveStreamService();
