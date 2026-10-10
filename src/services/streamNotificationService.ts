import fs from "fs";
import path from "path";
import { 
  Client, 
  EmbedBuilder, 
  TextChannel, 
  GuildMember, 
  ChannelType,
  MessageFlags,
} from "discord.js";
import { liveStreamService } from "./liveStreamService";

export interface StreamNotification {
  id: string;
  guildId: string;
  platform: "twitch" | "youtube" | "kick";
  channelName: string; // z. B. "derbrogameryt" oder "@DerBroGamerYT"
  displayName?: string; // z. B. "DerBroGamerYT"
  profileImageUrl?: string;
  youtubeChannelId?: string;
  discordChannelId: string;
  pingRoleId?: string;
  linkedDiscordUserId?: string;
  customMessage?: string;
  silent?: boolean;
  lastNotified?: string;
  isLive?: boolean;
  currentStreamId?: string;
}

interface TwitchGqlResponse {
  data?: {
    user?: {
      id: string;
      displayName: string;
      profileImageURL: string;
      stream: {
        id: string;
        title: string;
        game?: {
          name: string;
        };
        viewersCount: number;
        previewImageURL: string;
      } | null;
    } | null;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "stream_notifications.json");
// Live-Status liegt in einer EIGENEN Datei, die nur der Bot schreibt.
// So kann das Dashboard oder ein Befehl den Status nie versehentlich zurücksetzen.
const STATE_FILE = path.join(DATA_DIR, "stream_live_state.json");

// Erst als offline werten, wenn der Stream so lange weg ist (kurze Abbrüche/Neustarts ignorieren)
const OFFLINE_GRACE_MS = 5 * 60 * 1000;
// Nie öfter als einmal in diesem Zeitraum für denselben Streamer benachrichtigen
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

interface LiveState {
  isLive: boolean;
  currentStreamId?: string;
  lastNotified?: string;
  offlineSince?: number;
}

class StreamNotificationService {
  private notifications: StreamNotification[] = [];
  private pollerInterval: NodeJS.Timeout | null = null;
  private client: Client | null = null;
  private state: Record<string, LiveState> = {};
  // Läuft gerade eine Prüfung? Dann wird keine zweite parallel gestartet.
  private runningCheck: Promise<void> | null = null;

  constructor() {
    this.ensureDataDir();
    this.loadNotifications();
    this.loadState();
  }

  private loadState() {
    try {
      this.state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) : {};
    } catch {
      this.state = {};
    }
  }

  private saveState() {
    try {
      this.ensureDataDir();
      // Erst in Temp-Datei schreiben, dann umbenennen -> Datei ist nie halb geschrieben
      const tmp = STATE_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), "utf-8");
      fs.renameSync(tmp, STATE_FILE);
    } catch (e) {
      console.error("[StreamNotification] Fehler beim Speichern des Live-Status:", e);
    }
  }

  /** Live-Status eines Eintrags (aus der Status-Datei, Fallback: alte Felder im Eintrag). */
  private getState(notif: StreamNotification): LiveState {
    if (!this.state[notif.id]) {
      this.state[notif.id] = {
        isLive: Boolean(notif.isLive),
        currentStreamId: notif.currentStreamId,
        lastNotified: notif.lastNotified,
      };
    }
    return this.state[notif.id];
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public loadNotifications(): StreamNotification[] {
    try {
      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
        this.notifications = JSON.parse(raw);
      } else {
        this.notifications = [];
      }
    } catch (e) {
      this.notifications = [];
    }
    return this.notifications;
  }

  public saveNotifications() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(this.notifications, null, 2), "utf-8");
    } catch (e) {
      console.error("[StreamNotification] Fehler beim Speichern:", e);
    }
  }

  public getByGuild(guildId: string): StreamNotification[] {
    this.loadNotifications();
    return this.notifications
      .filter((n) => n.guildId === guildId)
      .map((n) => {
        const st = this.state[n.id];
        return st ? { ...n, isLive: st.isLive, lastNotified: st.lastNotified } : n;
      });
  }

  // Fragt Twitch User- & Stream-Status über die Web-GQL-Schnittstelle ab
  public async fetchTwitchUser(channelName: string): Promise<{
    exists: boolean;
    displayName: string;
    profileImageUrl: string;
    stream: {
      id: string;
      title: string;
      game: string;
      viewersCount: number;
      previewImageUrl: string;
    } | null;
  }> {
    try {
      const cleanName = channelName.trim().toLowerCase().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/[^a-z0-9_]/gi, "");
      const query = `query { user(login: "${cleanName}") { id displayName profileImageURL(width: 300) stream { id title game { name } viewersCount previewImageURL(width: 640, height: 360) } } }`;

      const res = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        headers: {
          "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        return { exists: false, displayName: cleanName, profileImageUrl: "", stream: null };
      }

      const json: TwitchGqlResponse = await res.json();
      const user = json?.data?.user;

      if (!user) {
        return { exists: false, displayName: cleanName, profileImageUrl: "", stream: null };
      }

      return {
        exists: true,
        displayName: user.displayName || cleanName,
        profileImageUrl: user.profileImageURL || "",
        stream: user.stream ? {
          id: user.stream.id,
          title: user.stream.title,
          game: user.stream.game?.name || "Just Chatting",
          viewersCount: user.stream.viewersCount || 0,
          previewImageUrl: user.stream.previewImageURL || "",
        } : null,
      };
    } catch (e) {
      console.error(`[StreamNotification] Fehler beim Abrufen von Twitch (${channelName}):`, e);
      return { exists: false, displayName: channelName, profileImageUrl: "", stream: null };
    }
  }

  // Fragt YouTube Kanal- & Live-Status ab
  public async fetchYouTubeUser(channelOrHandle: string, knownChannelId?: string): Promise<{
    exists: boolean;
    displayName: string;
    channelId: string;
    profileImageUrl: string;
    stream: {
      id: string;
      title: string;
      game: string;
      previewImageUrl: string;
    } | null;
  }> {
    try {
      const clean = channelOrHandle.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//i, "");
      const handle = clean.startsWith("@") ? clean : (clean.startsWith("UC") ? clean : `@${clean}`);
      
      let channelId = knownChannelId || "";
      let displayName = clean.replace(/^@/, "");
      let profileImageUrl = "";

      // Kanal-Info abrufen
      const ytUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : `https://www.youtube.com/${handle}`;
      const res = await fetch(ytUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const html = await res.text();
        const chMatch = html.match(/channel_id=([a-zA-Z0-9_-]+)/) || html.match(/"channelId":"([a-zA-Z0-9_-]+)"/);
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
        if (chMatch) channelId = chMatch[1];
        if (titleMatch) displayName = titleMatch[1];
        if (imageMatch) profileImageUrl = imageMatch[1];
      }

      if (!channelId) {
        return { exists: false, displayName, channelId: "", profileImageUrl: "", stream: null };
      }

      // Live-Status prüfen
      const liveUrl = `https://www.youtube.com/channel/${channelId}/live`;
      const liveRes = await fetch(liveUrl, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
      const liveHtml = await liveRes.text();
      // Geplante/angekündigte Streams ("isUpcoming") zählen NICHT als live
      const isUpcoming = liveHtml.includes('"isUpcoming":true');
      const isLive = !isUpcoming && (liveHtml.includes('"isLiveNow":true') || liveHtml.includes('"isLive":true'));

      let stream = null;
      if (isLive) {
        const videoIdMatch =
          liveHtml.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/) ||
          liveHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        const streamTitleMatch = liveHtml.match(/<meta property="og:title" content="([^"]+)">/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "";
        if (videoId) {
          stream = {
            id: videoId,
            title: streamTitleMatch ? streamTitleMatch[1] : `${displayName} ist live auf YouTube!`,
            game: "YouTube Live",
            previewImageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          };
        }
      }

      return {
        exists: true,
        displayName,
        channelId,
        profileImageUrl,
        stream,
      };
    } catch (e) {
      console.error(`[StreamNotification] Fehler beim Abrufen von YouTube (${channelOrHandle}):`, e);
      return { exists: false, displayName: channelOrHandle, channelId: "", profileImageUrl: "", stream: null };
    }
  }

  // Benachrichtigung hinzufügen oder aktualisieren
  public async addOrUpdateNotification(params: {
    id?: string;
    guildId: string;
    platform?: "twitch" | "youtube";
    channelName: string;
    displayName?: string;
    profileImageUrl?: string;
    channelId?: string;
    discordChannelId: string;
    pingRoleId?: string;
    linkedDiscordUserId?: string;
    customMessage?: string;
    silent?: boolean;
  }): Promise<{ success: boolean; notification?: StreamNotification; message?: string }> {
    const platform = params.platform || "twitch";
    const cleanName = params.channelName.trim();
    if (!cleanName) {
      return { success: false, message: "Ungültiger Kanalname." };
    }

    let displayName = params.displayName || cleanName;
    let profileImageUrl = params.profileImageUrl || "";
    let youtubeChannelId = params.channelId;
    let isLive = false;
    let streamId: string | undefined = undefined;

    if (platform === "twitch") {
      const twitchInfo = await this.fetchTwitchUser(cleanName);
      if (!twitchInfo.exists) {
        return { success: false, message: `Der Twitch-Kanal "${cleanName}" konnte nicht gefunden werden.` };
      }
      displayName = twitchInfo.displayName;
      profileImageUrl = twitchInfo.profileImageUrl;
      isLive = twitchInfo.stream !== null;
      streamId = twitchInfo.stream ? twitchInfo.stream.id : undefined;
    } else if (platform === "youtube") {
      const ytInfo = await this.fetchYouTubeUser(cleanName, youtubeChannelId);
      if (!ytInfo.exists) {
        return { success: false, message: `Der YouTube-Kanal "${cleanName}" konnte nicht gefunden werden.` };
      }
      displayName = ytInfo.displayName;
      profileImageUrl = ytInfo.profileImageUrl;
      youtubeChannelId = ytInfo.channelId;
      isLive = ytInfo.stream !== null;
      streamId = ytInfo.stream ? ytInfo.stream.id : undefined;
    }

    this.loadNotifications();
    let existingIndex = -1;
    if (params.id) {
      existingIndex = this.notifications.findIndex((n) => n.id === params.id);
    }
    if (existingIndex < 0) {
      existingIndex = this.notifications.findIndex(
        (n) => n.guildId === params.guildId && n.platform === platform && n.channelName.toLowerCase() === cleanName.toLowerCase()
      );
    }

    const notif: StreamNotification = {
      id: params.id || (existingIndex >= 0 ? this.notifications[existingIndex].id : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      guildId: params.guildId,
      platform,
      channelName: cleanName,
      displayName: params.displayName || displayName,
      profileImageUrl: profileImageUrl || (existingIndex >= 0 ? this.notifications[existingIndex].profileImageUrl : ""),
      youtubeChannelId,
      discordChannelId: params.discordChannelId,
      pingRoleId: params.pingRoleId || undefined,
      linkedDiscordUserId: params.linkedDiscordUserId || undefined,
      customMessage: params.customMessage || undefined,
      silent: params.silent !== undefined ? params.silent : (existingIndex >= 0 ? this.notifications[existingIndex].silent : false),
      lastNotified: existingIndex >= 0 ? this.notifications[existingIndex].lastNotified : undefined,
      isLive: existingIndex >= 0 ? this.notifications[existingIndex].isLive : isLive,
      currentStreamId: streamId || (existingIndex >= 0 ? this.notifications[existingIndex].currentStreamId : undefined),
    };

    if (existingIndex >= 0) {
      this.notifications[existingIndex] = notif;
    } else {
      this.notifications.push(notif);
    }

    this.saveNotifications();
    return { success: true, notification: notif };
  }

  // Benachrichtigung entfernen
  public removeNotification(guildId: string, idOrChannelName: string): boolean {
    this.loadNotifications();
    const clean = idOrChannelName.trim().toLowerCase();
    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(
      (n) => !(n.guildId === guildId && (n.id === idOrChannelName || n.channelName.toLowerCase() === clean))
    );
    if (this.notifications.length !== beforeCount) {
      this.saveNotifications();
      return true;
    }
    return false;
  }

  // Startet den Hintergrund-Poller (prüft alle 60 Sekunden)
  public startPoller(client: Client) {
    if (this.pollerInterval) return;
    this.client = client;

    console.log("📺 [StreamNotification] Live-Stream Poller (Twitch & YouTube) gestartet (Intervall: 60 Sekunden)");

    // Initialer Durchlauf nach 10 Sekunden
    setTimeout(async () => {
      await this.checkAllStreams();
    }, 10000);

    // Alle 60 Sekunden wiederholen
    this.pollerInterval = setInterval(async () => {
      await this.checkAllStreams();
    }, 60000);
  }

  /**
   * Prüft alle eingetragenen Streamer. Läuft bereits eine Prüfung (Poller + /streamer check
   * gleichzeitig), wird auf diese gewartet statt eine zweite zu starten.
   */
  public checkAllStreams(): Promise<void> {
    if (!this.runningCheck) {
      this.runningCheck = this.runCheck().finally(() => {
        this.runningCheck = null;
      });
    }
    return this.runningCheck;
  }

  private async runCheck() {
    if (!this.client) return;
    const notifications = [...this.loadNotifications()];
    if (notifications.length === 0) return;

    // Status von gelöschten Einträgen aufräumen
    const ids = new Set(notifications.map((n) => n.id));
    for (const id of Object.keys(this.state)) if (!ids.has(id)) delete this.state[id];

    for (const notif of notifications) {
      try {
        const guild = this.client.guilds.cache.get(notif.guildId);
        if (!guild) continue;

        let isNowLive = false;
        let streamData: any = null;
        let fetchedDisplayName: string | undefined;
        let fetchedAvatar: string | undefined;

        if (notif.platform === "youtube") {
          const ytInfo = await this.fetchYouTubeUser(notif.channelName, notif.youtubeChannelId);
          if (!ytInfo.exists) continue; // Abruf fehlgeschlagen -> Status NICHT ändern
          isNowLive = ytInfo.stream !== null;
          streamData = ytInfo.stream;
          fetchedDisplayName = ytInfo.displayName;
          fetchedAvatar = ytInfo.profileImageUrl;
        } else {
          const twitchInfo = await this.fetchTwitchUser(notif.channelName);
          if (!twitchInfo.exists) continue; // Abruf fehlgeschlagen -> Status NICHT ändern
          isNowLive = twitchInfo.stream !== null;
          streamData = twitchInfo.stream;
          fetchedDisplayName = twitchInfo.displayName;
          fetchedAvatar = twitchInfo.profileImageUrl;
        }

        this.updateProfile(notif, fetchedDisplayName, fetchedAvatar);
        const st = this.getState(notif);
        const now = Date.now();
        const platformLabel = notif.platform === "youtube" ? "YouTube" : "Twitch";
        const name = notif.displayName || notif.channelName;

        if (isNowLive) {
          st.offlineSince = undefined;

          if (st.isLive) {
            // War schon live (evtl. neue Stream-ID nach Neustart des Streams) -> KEIN neuer Alert
            st.currentStreamId = streamData?.id;
            this.saveState();
            continue;
          }

          // Wechsel offline -> live
          st.isLive = true;
          st.currentStreamId = streamData?.id;
          const last = st.lastNotified ? new Date(st.lastNotified).getTime() : 0;
          const inCooldown = now - last < ALERT_COOLDOWN_MS;

          const linkedId = notif.linkedDiscordUserId;
          if (inCooldown) {
            console.log(`⏸️ [StreamNotification] ${name} ist wieder live - Alert übersprungen (letzter vor < 30 Min.).`);
            this.saveState();
          } else if (linkedId && liveStreamService.wasRecentlyAnnounced(guild.id, linkedId)) {
            // Das Live-System hat dieses Mitglied gerade schon angekündigt -> kein zweiter Post
            console.log(`⏸️ [StreamNotification] ${name} wurde gerade schon angekündigt - Alert übersprungen.`);
            st.lastNotified = new Date(now).toISOString();
            this.saveState();
          } else {
            if (linkedId) liveStreamService.markAnnounced(guild.id, linkedId);
            console.log(`🔴 [StreamNotification] ${name} ist jetzt LIVE auf ${platformLabel}!`);
            st.lastNotified = new Date(now).toISOString();
            this.saveState(); // VOR dem Senden speichern -> auch bei Absturz kein zweiter Alert
            await this.sendLiveAlert(guild, notif, {
              displayName: name,
              profileImageUrl: notif.profileImageUrl || "",
              stream: streamData,
            });
          }

          if (notif.linkedDiscordUserId) {
            await this.handleLinkedMemberLive(guild, notif, streamData);
          }
        } else if (st.isLive) {
          // Erst nach OFFLINE_GRACE_MS als offline werten (kurze Abbrüche ignorieren)
          if (!st.offlineSince) {
            st.offlineSince = now;
            this.saveState();
            continue;
          }
          if (now - st.offlineSince < OFFLINE_GRACE_MS) continue;

          console.log(`⚪ [StreamNotification] ${name} ist jetzt OFFLINE.`);
          st.isLive = false;
          st.currentStreamId = undefined;
          st.offlineSince = undefined;
          this.saveState();

          if (notif.linkedDiscordUserId) {
            await this.handleLinkedMemberOffline(guild, notif);
          }
        }
      } catch (err) {
        console.error(`[StreamNotification] Fehler bei der Prüfung von ${notif.channelName}:`, err);
      }
    }
  }

  /** Anzeigename/Avatar aktualisieren - frisch einlesen, damit Änderungen aus dem Dashboard erhalten bleiben. */
  private updateProfile(notif: StreamNotification, displayName?: string, avatar?: string) {
    const nameChanged = displayName && displayName !== notif.displayName;
    const avatarChanged = avatar && avatar !== notif.profileImageUrl;
    if (!nameChanged && !avatarChanged) return;

    this.loadNotifications();
    const fresh = this.notifications.find((n) => n.id === notif.id);
    if (!fresh) return;
    if (displayName) fresh.displayName = notif.displayName = displayName;
    if (avatar) fresh.profileImageUrl = notif.profileImageUrl = avatar;
    this.saveNotifications();
  }

  // Sendet das stylische Stream-Alert-Embed in den Discord-Kanal
  public async sendLiveAlert(
    guild: any, 
    notif: StreamNotification, 
    streamInfo: { displayName: string; profileImageUrl: string; stream: any }
  ) {
    const channel = guild.channels.cache.get(notif.discordChannelId);
    if (!channel || !channel.isTextBased()) return;

    const isYoutube = notif.platform === "youtube";
    const stream = streamInfo.stream;
    const streamUrl = isYoutube 
      ? `https://youtube.com/watch?v=${stream?.id}`
      : `https://twitch.tv/${notif.channelName}`;

    const streamTitle = stream?.title || `${notif.displayName} ist jetzt live!`;
    const gameName = stream?.game || (isYoutube ? "YouTube Live" : "Just Chatting");
    const previewUrl = stream?.previewImageUrl ? `${stream.previewImageUrl}?t=${Date.now()}` : "";

    // Ping festlegen
    let ping = "";
    if (notif.pingRoleId) {
      if (notif.pingRoleId === "@everyone") ping = "@everyone ";
      else if (notif.pingRoleId === "@here") ping = "@here ";
      else ping = `<@&${notif.pingRoleId}> `;
    }

    const streamerName = notif.displayName || notif.channelName;
    const defaultMsg = isYoutube
      ? `📢 **${streamerName}** ist jetzt live auf YouTube!`
      : `📢 **${streamerName}** ist jetzt live auf Twitch!`;

    let content = "";
    if (notif.customMessage && notif.customMessage.trim().length > 0) {
      const pingText = ping.trim();
      const hasPingPlaceholder = /{ping}|{role}|{everyone}|{here}/i.test(notif.customMessage);
      const replaced = notif.customMessage
        .replace(/{streamer}/gi, streamerName)
        .replace(/{game}/gi, gameName)
        .replace(/{title}/gi, streamTitle)
        .replace(/{url}/gi, streamUrl)
        .replace(/{ping}|{role}/gi, pingText);

      content = hasPingPlaceholder ? replaced : (ping ? `${ping}${replaced}` : replaced);
    } else {
      content = `${ping}${defaultMsg}`;
    }

    const embed = new EmbedBuilder()
      .setColor(isYoutube ? 0xff0000 : 0x9146ff) // YouTube Rot oder Twitch Lila
      .setAuthor({
        name: `${streamerName} ist jetzt LIVE auf ${isYoutube ? "YouTube" : "Twitch"}!`,
        iconURL: notif.profileImageUrl || undefined,
        url: streamUrl,
      })
      .setTitle(streamTitle)
      .setURL(streamUrl)
      .setDescription(`Schaut jetzt live vorbei und seid im Stream dabei!`)
      .addFields(
        { name: "🎮 Kategorie", value: `**${gameName}**`, inline: true },
        { name: "🔗 Zum Stream", value: `[Hier klicken zum Stream](${streamUrl})`, inline: true }
      )
      .setFooter({ text: `GLGBot Live-Alerts | ${isYoutube ? "YouTube" : "Twitch"}` })
      .setTimestamp();

    if (stream?.viewersCount) {
      embed.addFields({ name: "👥 Zuschauer", value: `${stream.viewersCount}`, inline: true });
    }

    if (notif.profileImageUrl) {
      embed.setThumbnail(notif.profileImageUrl);
    }

    if (previewUrl) {
      embed.setImage(previewUrl);
    }

    const isSilent = Boolean(notif.silent);
    const finalContent = isSilent ? (content.startsWith("@silent") ? content : `@silent ${content}`) : content;

    await (channel as TextChannel).send({
      content: finalContent,
      embeds: [embed],
      flags: isSilent ? MessageFlags.SuppressNotifications : undefined,
      allowedMentions: notif.pingRoleId ? { roles: [notif.pingRoleId] } : undefined,
    }).catch((e) => console.error("[StreamNotification] Konnte Alert nicht senden:", e));
  }

  // Verknüpftes Mitglied: Rolle & Temp-Kanal erzeugen
  private async handleLinkedMemberLive(guild: any, notif: StreamNotification, streamData: any) {
    try {
      const member: GuildMember | null = await guild.members.fetch(notif.linkedDiscordUserId!).catch(() => null);
      if (!member) return;

      const isYoutube = notif.platform === "youtube";
      const streamUrl = isYoutube ? `https://youtube.com/watch?v=${streamData?.id}` : `https://twitch.tv/${notif.channelName}`;

      const result = await liveStreamService.setLive(member, "stream", {
        url: streamUrl,
        title: streamData?.title,
        game: streamData?.game,
      });
      if (!result.success) console.warn(`[StreamNotification] ${member.user.tag}: ${result.message}`);
    } catch (e) {
      console.error("[StreamNotification] Fehler bei verknüpftem Mitglied (Live):", e);
    }
  }

  // Verknüpftes Mitglied: Rolle entfernen & Kanal löschen
  private async handleLinkedMemberOffline(guild: any, notif: StreamNotification) {
    try {
      const member: GuildMember | null = await guild.members.fetch(notif.linkedDiscordUserId!).catch(() => null);
      if (!member) return;

      // Nur die Quelle "stream" beenden - streamt die Person z. B. noch laut Discord-Status, bleibt sie live
      await liveStreamService.clearLive(member, "stream");
      console.log(`[StreamNotification] Stream von verknüpftem Mitglied ${member.user.tag} beendet.`);
    } catch (e) {
      console.error("[StreamNotification] Fehler bei verknüpftem Mitglied (Offline):", e);
    }
  }
}

export const streamNotificationService = new StreamNotificationService();

// Verknüpfte Streamer kündigt nur der Stream-Alert an (siehe liveStreamService.isLinkedStreamer)
liveStreamService.isLinkedStreamer = (guildId, userId) =>
  streamNotificationService.getByGuild(guildId).some((n) => n.linkedDiscordUserId === userId);
