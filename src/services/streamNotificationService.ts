import fs from "fs";
import path from "path";
import { 
  Client, 
  EmbedBuilder, 
  TextChannel, 
  GuildMember, 
  ChannelType 
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

class StreamNotificationService {
  private notifications: StreamNotification[] = [];
  private pollerInterval: NodeJS.Timeout | null = null;
  private client: Client | null = null;

  constructor() {
    this.ensureDataDir();
    this.loadNotifications();
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
    return this.notifications.filter((n) => n.guildId === guildId);
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
      const isLive = liveHtml.includes("\"isLive\":true") || liveHtml.includes("\"liveStreamabilityRenderer\"");

      let stream = null;
      if (isLive) {
        const videoIdMatch = liveHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
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

  // Prüft alle eingetragenen Benachrichtigungen (Twitch & YouTube)
  public async checkAllStreams() {
    if (!this.client) return;
    this.loadNotifications();

    if (this.notifications.length === 0) return;

    for (const notif of this.notifications) {
      try {
        const guild = this.client.guilds.cache.get(notif.guildId);
        if (!guild) continue;

        let isNowLive = false;
        let streamData: any = null;
        let fetchedDisplayName = notif.displayName;
        let fetchedAvatar = notif.profileImageUrl;

        if (notif.platform === "youtube") {
          const ytInfo = await this.fetchYouTubeUser(notif.channelName, notif.youtubeChannelId);
          if (!ytInfo.exists) continue;
          isNowLive = ytInfo.stream !== null;
          streamData = ytInfo.stream;
          if (ytInfo.displayName) fetchedDisplayName = ytInfo.displayName;
          if (ytInfo.profileImageUrl) fetchedAvatar = ytInfo.profileImageUrl;
        } else {
          // Twitch
          const twitchInfo = await this.fetchTwitchUser(notif.channelName);
          if (!twitchInfo.exists) continue;
          isNowLive = twitchInfo.stream !== null;
          streamData = twitchInfo.stream;
          if (twitchInfo.displayName) fetchedDisplayName = twitchInfo.displayName;
          if (twitchInfo.profileImageUrl) fetchedAvatar = twitchInfo.profileImageUrl;
        }

        if (fetchedDisplayName) notif.displayName = fetchedDisplayName;
        if (fetchedAvatar) notif.profileImageUrl = fetchedAvatar;

        // Fall 1: Streamer geht LIVE
        if (isNowLive && (!notif.isLive || notif.currentStreamId !== streamData?.id)) {
          const platformLabel = notif.platform === "youtube" ? "YouTube" : "Twitch";
          console.log(`🔴 [StreamNotification] ${notif.displayName} ist jetzt LIVE auf ${platformLabel}!`);
          notif.isLive = true;
          notif.currentStreamId = streamData?.id;
          notif.lastNotified = new Date().toISOString();

          await this.sendLiveAlert(guild, notif, {
            displayName: notif.displayName || notif.channelName,
            profileImageUrl: notif.profileImageUrl || "",
            stream: streamData,
          });

          // Falls ein Discord-Mitglied verknüpft ist: Live-Rolle vergeben & Live-Kanal erstellen
          if (notif.linkedDiscordUserId) {
            await this.handleLinkedMemberLive(guild, notif, streamData);
          }

          this.saveNotifications();
        } 
        // Fall 2: Streamer geht OFFLINE
        else if (!isNowLive && notif.isLive) {
          console.log(`⚪ [StreamNotification] ${notif.displayName} ist jetzt OFFLINE.`);
          notif.isLive = false;
          notif.currentStreamId = undefined;

          // Falls verknüpft: Live-Rolle entziehen & Live-Kanal löschen
          if (notif.linkedDiscordUserId) {
            await this.handleLinkedMemberOffline(guild, notif);
          }

          this.saveNotifications();
        }
      } catch (err) {
        console.error(`[StreamNotification] Fehler bei der Prüfung von ${notif.channelName}:`, err);
      }
    }
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

    await (channel as TextChannel).send({
      content,
      embeds: [embed],
    }).catch((e) => console.error("[StreamNotification] Konnte Alert nicht senden:", e));
  }

  // Verknüpftes Mitglied: Rolle & Kanal erzeugen
  private async handleLinkedMemberLive(guild: any, notif: StreamNotification, streamData: any) {
    try {
      const member: GuildMember | null = await guild.members.fetch(notif.linkedDiscordUserId!).catch(() => null);
      if (!member) return;

      const liveCfg = liveStreamService.getConfig(guild.id);
      if (liveCfg && liveCfg.liveRoleId) {
        if (!member.roles.cache.has(liveCfg.liveRoleId)) {
          await member.roles.add(liveCfg.liveRoleId).catch(() => null);
          console.log(`[StreamNotification] Live-Rolle an verknüpftes Mitglied ${member.user.tag} vergeben.`);
        }
      }

      const isYoutube = notif.platform === "youtube";
      const streamUrl = isYoutube ? `https://youtube.com/watch?v=${streamData?.id}` : `https://twitch.tv/${notif.channelName}`;

      await liveStreamService.startLive(member, {
        url: streamUrl,
        title: streamData?.title,
        game: streamData?.game,
      });
    } catch (e) {
      console.error("[StreamNotification] Fehler bei verknüpftem Mitglied (Live):", e);
    }
  }

  // Verknüpftes Mitglied: Rolle entfernen & Kanal löschen
  private async handleLinkedMemberOffline(guild: any, notif: StreamNotification) {
    try {
      const member: GuildMember | null = await guild.members.fetch(notif.linkedDiscordUserId!).catch(() => null);
      if (!member) return;

      await liveStreamService.stopLive(member);
      console.log(`[StreamNotification] Live-Status für verknüpftes Mitglied ${member.user.tag} beendet.`);
    } catch (e) {
      console.error("[StreamNotification] Fehler bei verknüpftem Mitglied (Offline):", e);
    }
  }
}

export const streamNotificationService = new StreamNotificationService();
