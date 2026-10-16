import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
} from "@discordjs/voice";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import { moduleService } from "./moduleService";
import { voiceDuckingService } from "./voiceDuckingService";

const HISTORY_DIR = path.join(__dirname, "../../data");
const HISTORY_FILE = path.join(HISTORY_DIR, "music_history.json");
const HISTORY_MAX = 100;

export interface HistoryEntry {
  title: string;
  source: "youtube" | "local";
  by: string;
  at: number;
}

function loadHistory(): Record<string, HistoryEntry[]> {
  try {
    if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {}
  return {};
}
import {
  VoiceBasedChannel,
  GuildMember,
  EmbedBuilder,
  User,
} from "discord.js";
import ytdl from "@distube/ytdl-core";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yts = require("yt-search") as (query: string) => Promise<{
  videos: Array<{ videoId: string; url: string; title: string; image: string; timestamp: string }>;
}>;

const MAX_QUEUE_SIZE = 50;

export interface QueueItem {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  requestedBy: User;
  source: "youtube" | "local";
  /** Direkte Audio-URL (Piped-Fallback) statt ytdl-Stream */
  directAudio?: boolean;
}

const PIPED_API = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
];

interface PipedAudio {
  audioUrl: string;
  title: string;
  thumbnail: string;
  duration: string;
}

/** Holt Audio-URL + Metadaten über Piped (Fallback wenn ytdl geblockt ist). */
async function pipedLookup(videoId: string): Promise<PipedAudio | null> {
  for (const base of PIPED_API) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const res = await fetch(`${base}/streams/${videoId}`, { signal: ctrl.signal });
        if (!res.ok) continue;
        const data = await res.json() as {
          title?: string; duration?: number; thumbnailUrl?: string;
          audioStreams?: Array<{ url?: string; bitrate?: number; codec?: string }>;
        };
        const audios = (data.audioStreams || []).filter((a) => a.url);
        if (audios.length === 0) continue;
        audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        return {
          audioUrl: audios[0].url!,
          title: data.title || "YouTube-Video",
          thumbnail: data.thumbnailUrl || "",
          duration: data.duration ? formatDur(data.duration) : "Live",
        };
      } finally {
        clearTimeout(timer);
      }
    } catch {}
  }
  return null;
}

function formatDur(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export type LoopMode = "off" | "track" | "queue";

export interface MusicStatus {
  guildId: string;
  channelId?: string;
  current: QueueItem | null;
  queueLength: number;
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  loop: LoopMode;
  lastError: string | null;
}

interface GuildSession {
  guildId: string;
  channelId: string;
  voiceChannel: VoiceBasedChannel;
  player: AudioPlayer;
  connection: VoiceConnection;
  queue: QueueItem[];
  current: QueueItem | null;
  isPaused: boolean;
  volume: number;
  loop: LoopMode;
  lastError: string | null;
  liveVolume: { setVolume(n: number): void } | null;
  /** Timer, der prüft, ob noch jemand zuhört (siehe startEmptyCheck) */
  emptyTimer: NodeJS.Timeout | null;
  /** Zähler für aufeinanderfolgende leere Durchläufe */
  emptyTicks: number;
}

export class MusicService {
  private sessions = new Map<string, GuildSession>();

  getStatus(guildId: string): MusicStatus | null {
    const s = this.sessions.get(guildId);
    if (!s) return null;
    return {
      guildId: s.guildId,
      channelId: s.channelId,
      current: s.current,
      queueLength: s.queue.length,
      isPlaying: s.player.state.status === AudioPlayerStatus.Playing,
      isPaused: s.isPaused,
      volume: s.volume,
      loop: s.loop,
      lastError: s.lastError,
    };
  }

  getQueue(guildId: string): QueueItem[] {
    return this.sessions.get(guildId)?.queue ?? [];
  }

  /** Zuletzt gespielte Songs (YouTube + lokal), neueste zuerst. */
  getHistory(guildId: string, limit = 10): HistoryEntry[] {
    const all = loadHistory()[guildId] || [];
    return all.slice(-Math.max(1, limit)).reverse();
  }

  /** Extrahiert die YouTube-Playlist-ID aus einer URL (list=...). */
  extractPlaylistId(url: string): string | null {
    try {
      const u = new URL(url);
      if (!/^(www\.)?(youtube\.com|youtu\.be)$/i.test(u.hostname)) return null;
      return u.searchParams.get("list");
    } catch {
      return null;
    }
  }

  /** Liest Video-IDs + Name einer YouTube-Playlist über Piped (max. `limit`). */
  private async fetchYouTubePlaylist(listId: string, limit = 30): Promise<{ name: string; videoIds: string[] }> {
    for (const base of PIPED_API) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12_000);
        try {
          const res = await fetch(`${base}/playlists/${listId}`, { signal: ctrl.signal });
          if (!res.ok) continue;
          const data = (await res.json()) as {
            name?: string;
            relatedStreams?: Array<{ url?: string; title?: string }>;
          };
          const ids: string[] = [];
          for (const s of data.relatedStreams || []) {
            if (ids.length >= limit) break;
            const m = (s.url || "").match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (m) ids.push(m[1]);
          }
          if (ids.length > 0) return { name: data.name || "YouTube-Playlist", videoIds: ids };
        } finally {
          clearTimeout(timer);
        }
      } catch {}
    }
    throw new Error("Playlist konnte nicht gelesen werden (privat/gelöscht oder API blockiert).");
  }

  /** Importiert eine YouTube-Playlist in die Queue. Gibt {name, added, failed} zurück. */
  async importYouTubePlaylist(
    channel: VoiceBasedChannel,
    listId: string,
    requester: User,
  ): Promise<{ name: string; added: number; failed: number }> {
    const { name, videoIds } = await this.fetchYouTubePlaylist(listId);
    let added = 0;
    let failed = 0;
    for (const id of videoIds) {
      try {
        await this.play(channel, `https://www.youtube.com/watch?v=${id}`, requester);
        added++;
      } catch {
        failed++;
      }
    }
    if (added === 0) throw new Error("Kein Song der Playlist konnte hinzugefügt werden.");
    return { name, added, failed };
  }

  /** Importiert eine Spotify-Playlist (Titel → YouTube-Suche) in die Queue. */
  async importSpotifyPlaylist(
    channel: VoiceBasedChannel,
    playlistInput: string,
    requester: User,
  ): Promise<{ name: string; added: number; failed: number }> {
    const { parsePlaylistId, getPlaylistTracks } = await import("./spotifyService");
    const id = parsePlaylistId(playlistInput);
    if (!id) throw new Error("Kein gültiger Spotify-Playlist-Link.");
    const { name, tracks } = await getPlaylistTracks(id);
    let added = 0;
    let failed = 0;
    for (const t of tracks) {
      try {
        const query = t.artist ? `${t.artist} - ${t.title}` : t.title;
        await this.play(channel, query, requester);
        added++;
      } catch {
        failed++;
      }
    }
    if (added === 0) throw new Error("Kein Song der Playlist konnte hinzugefügt werden.");
    return { name, added, failed };
  }

  private recordHistory(guildId: string, item: QueueItem) {
    try {
      const all = loadHistory();
      const list = all[guildId] || [];
      list.push({ title: item.title, source: item.source, by: item.requestedBy.tag, at: Date.now() });
      all[guildId] = list.slice(-HISTORY_MAX);
      if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
      writeJsonAtomic(HISTORY_FILE, all);
    } catch (e) {
      console.error("[Music] Verlauf konnte nicht gespeichert werden:", (e as Error).message);
    }
  }

  async play(channel: VoiceBasedChannel, query: string, requester: User): Promise<{ status: "started" | "queued" | "limit"; item?: QueueItem; position?: number }> {
    // Modul-Schalter auch hier prüfen - das Dashboard ruft diese Funktion direkt auf
    if (!moduleService.isEnabled(channel.guild.id, "music")) {
      throw new Error("Das Modul „Radio & Musik“ ist auf diesem Server ausgeschaltet.");
    }
    // Radio-Session sauber beenden (ein Bot = ein Voice-Stream pro Server)
    try {
      const { radioService } = await import("./radioService");
      if (radioService.getStatus(channel.guild.id)) await radioService.stop(channel.guild.id);
    } catch {}
    const session = await this.ensureSession(channel);
    // Gespeicherte Lautstärke anwenden (Kanal gewinnt, sonst User)
    try {
      const { musicPrefsService } = await import("./musicPrefsService");
      session.volume = musicPrefsService.getVolume(channel.guild.id, channel.id, requester.id);
    } catch {}

    if (session.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Queue ist voll (max. ${MAX_QUEUE_SIZE} Songs).`);
    }

    const info = await this.resolve(query);
    const item: QueueItem = {
      title: info.title,
      url: info.url,
      thumbnail: info.thumbnail,
      duration: info.duration,
      requestedBy: requester,
      source: info.source,
      directAudio: info.directAudio,
    };

    session.queue.push(item);

    if (session.player.state.status === AudioPlayerStatus.Idle || session.player.state.status === AudioPlayerStatus.Paused) {
      await this.playNext(session);
      return { status: "started", item };
    }

    return { status: "queued", item, position: session.queue.length };
  }

  skip(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.player.stop(true);
    return true;
  }

  /** Best-effort Aufräumen – wirft nie (wichtig bei Races mit bereits zerstörten Connections). */
  private safeDestroy(connection: VoiceConnection | undefined) {
    try {
      if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
    } catch {}
  }

  stop(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    this.stopEmptyCheck(s);
    voiceDuckingService.detach(guildId);
    s.queue = [];
    s.current = null;
    try {
      s.player.stop(true);
    } catch {}
    this.safeDestroy(s.connection);
    this.sessions.delete(guildId);
    return true;
  }

  pause(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.isPaused = true;
    s.player.pause();
    return true;
  }

  resume(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.isPaused = false;
    s.player.unpause();
    return true;
  }

  shuffle(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s || s.queue.length < 2) return false;
    for (let i = s.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s.queue[i], s.queue[j]] = [s.queue[j], s.queue[i]];
    }
    return true;
  }

  setVolume(guildId: string, percent: number, channelId?: string | null, userId?: string | null): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.volume = Math.max(0, Math.min(100, percent));
    try {
      voiceDuckingService.onVolumeChange(guildId, s.volume);
    } catch {
      try {
        s.liveVolume?.setVolume(s.volume / 100);
      } catch {}
    }
    // Merken: expliziter Kanal gewinnt, sonst User
    try {
      const { musicPrefsService } = require("./musicPrefsService") as typeof import("./musicPrefsService");
      musicPrefsService.setVolume(guildId, s.volume, channelId || s.channelId, userId);
    } catch {}
    return true;
  }

  remove(guildId: string, index: number): QueueItem | null {
    const s = this.sessions.get(guildId);
    if (!s || index < 0 || index >= s.queue.length) return null;
    return s.queue.splice(index, 1)[0] ?? null;
  }

  async ensureSession(channel: VoiceBasedChannel): Promise<GuildSession> {
    const existing = this.sessions.get(channel.guild.id);
    if (existing) return existing;

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      this.safeDestroy(connection);
      throw new Error("Verbindung zum Voice-Kanal fehlgeschlagen.");
    }

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    connection.subscribe(player);

    const session: GuildSession = {
      guildId: channel.guild.id,
      channelId: channel.id,
      voiceChannel: channel,
      player,
      connection,
      queue: [],
      current: null,
      isPaused: false,
      volume: 100,
      loop: "off",
      lastError: null,
      liveVolume: null,
      emptyTimer: null,
      emptyTicks: 0,
    };

    player.on(AudioPlayerStatus.Idle, () => {
      this.onIdle(session);
    });

    player.on("error", (error) => {
      session.lastError = `Player: ${error.message}`.slice(0, 200);
      console.error(`[Music] Player-Fehler in ${session.guildId}:`, error.message);
      this.onIdle(session);
    });

    this.sessions.set(channel.guild.id, session);
    this.attachDisconnectHandler(session);

    connection.on("stateChange", (_oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Ready) {
        this.startEmptyCheck(session);
      }
    });

    return session;
  }

  private attachDisconnectHandler(session: GuildSession) {
    session.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (!this.sessions.get(session.guildId)) return;
      console.warn(`[Music] Verbindung verloren, versuche Wiederaufbau …`);
      try {
        await Promise.race([
          entersState(session.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(session.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log("[Music] Verbindung wiederhergestellt.");
        return;
      } catch {}
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (!this.sessions.get(session.guildId)) return;
        try {
          this.safeDestroy(session.connection);
          const guild = session.voiceChannel.guild;
          const fresh = joinVoiceChannel({
            channelId: session.channelId,
            guildId: session.guildId,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
          });
          await entersState(fresh, VoiceConnectionStatus.Ready, 15_000);
          fresh.subscribe(session.player);
          session.connection = fresh;
          this.attachDisconnectHandler(session);
          console.log(`[Music] Neu verbunden (Versuch ${attempt}).`);
          // Aktuellen Song fortsetzen
          if (session.current && !session.isPaused) {
            session.queue.unshift(session.current);
            session.current = null;
            await this.playNext(session);
          }
          return;
        } catch (e) {
          console.warn(`[Music] Neuaufbau ${attempt}/3 fehlgeschlagen:`, (e as Error).message);
          await new Promise((r) => setTimeout(r, 5_000 * attempt));
        }
      }
      session.lastError = "Voice-Verbindung dauerhaft verloren.";
      this.stop(session.guildId);
    });
  }

  setLoop(guildId: string, mode: LoopMode): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.loop = mode;
    return true;
  }

  private onIdle(session: GuildSession) {
    if (session.loop === "track" && session.current) {
      void this.playItem(session, session.current);
      return;
    }
    if (session.loop === "queue" && session.current) {
      session.queue.push(session.current);
    }
    const next = session.queue.shift();
    if (next) {
      void this.playItem(session, next);
    } else {
      session.current = null;
      session.isPaused = false;
      voiceDuckingService.detach(session.guildId);
    }
  }

  /**
   * Verlässt den Sprachkanal, sobald niemand mehr zuhört.
   *
   * Wichtig: Es darf nur EIN Timer je Sitzung laufen. Die Verbindung meldet "Ready"
   * auch nach jeder Neuverbindung erneut - ohne diese Prüfung bliebe bei jedem Mal
   * ein weiterer Timer bis zum Bot-Neustart zurück.
   */
  private startEmptyCheck(session: GuildSession) {
    if (session.emptyTimer) return;
    session.emptyTimer = setInterval(() => {
      const current = this.sessions.get(session.guildId);
      if (current !== session) {
        this.stopEmptyCheck(session);
        return;
      }
      // Immer den aktuellen Kanal aus der Sitzung nehmen - der Bot kann verschoben worden sein
      const channelId = session.connection.joinConfig.channelId || session.voiceChannel.id;
      const guild = session.voiceChannel.guild;
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isVoiceBased()) return;

      const listeners = channel.members.filter((m: GuildMember) => !m.user.bot);
      if (listeners.size > 0) {
        session.emptyTicks = 0;
        return;
      }
      // Erst nach zwei leeren Durchläufen (ca. 60 s) beenden - bei kurzem
      // Verbindungsabriss bleibt die Warteschlange so erhalten.
      session.emptyTicks = (session.emptyTicks || 0) + 1;
      if (session.emptyTicks >= 2) {
        console.log(`🎵 [Musik] Niemand mehr in ${channel.name} (${guild.name}) - Wiedergabe beendet.`);
        this.stop(session.guildId);
      }
    }, 30_000);
    session.emptyTimer.unref?.();
  }

  private stopEmptyCheck(session: GuildSession) {
    if (session.emptyTimer) {
      clearInterval(session.emptyTimer);
      session.emptyTimer = null;
    }
  }

  private async playNext(session: GuildSession): Promise<void> {
    const item = session.queue.shift();
    if (!item) {
      session.current = null;
      return;
    }
    await this.playItem(session, item);
  }

  private async playItem(session: GuildSession, item: QueueItem): Promise<void> {
    try {
      const ffmpegPath: string = (require("ffmpeg-static") as string | null) || "ffmpeg";
      const { spawn } = await import("child_process");
      let resource;
      if (item.source === "local") {
        const { getSoundPath } = await import("./soundboardService");
        const full = getSoundPath(item.url.slice(6));
        if (!full) throw new Error("Lokale Datei nicht mehr vorhanden.");
        const ffmpeg = spawn(
          ffmpegPath,
          ["-i", full, "-vn", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
          { stdio: ["ignore", "pipe", "ignore"] },
        );
        // Raw-PCM braucht expliziten Typ – die Auto-Erkennung scheitert ohne Container-Header
        resource = createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw, inlineVolume: true });
      } else if (item.directAudio) {
        // Piped-Fallback: direkte Audio-URL per ffmpeg laden (Node-Pipe umgeht UA/TLS-Probleme)
        const ctrl = new AbortController();
        const res = await fetch(item.url, {
          signal: ctrl.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          },
        });
        if (!res.ok || !res.body) throw new Error(`Audio-URL antwortet mit HTTP ${res.status}.`);
        const ffmpeg = spawn(
          ffmpegPath,
          ["-thread_queue_size", "1024", "-i", "pipe:0", "-vn", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
          { stdio: ["pipe", "pipe", "pipe"] },
        );
        const reader = res.body.getReader();
        const pump = (async () => {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!value || ffmpeg.killed) break;
              try {
                if (!ffmpeg.stdin!.write(value)) {
                  await new Promise<void>((r) => ffmpeg.stdin!.once("drain", () => r()));
                }
              } catch {
                break;
              }
            }
          } catch {} finally {
            try {
              await reader.cancel();
            } catch {}
            try {
              ctrl.abort();
            } catch {}
          }
        })();
        pump.catch(() => null);
        ffmpeg.stdin?.on("error", () => null);
        ffmpeg.on("error", (e: Error) => {
          session.lastError = `ffmpeg: ${e.message}`.slice(0, 200);
        });
        // Pump bei Songwechsel/Skip abbrechen
        const stopPump = () => {
          try {
            ctrl.abort();
          } catch {}
          try {
            ffmpeg.stdin?.destroy();
          } catch {}
        };
        session.player.once(AudioPlayerStatus.Idle, stopPump);
        resource = createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw, inlineVolume: true });
      } else {
        const stream = ytdl(item.url, {
          filter: "audioonly",
          quality: "highestaudio",
          highWaterMark: 1 << 25,
          requestOptions: {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
              "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            },
          },
        });
        stream.on("error", (e: Error) => {
          session.lastError = `YouTube: ${e.message}`.slice(0, 200);
          console.error(`[Music] Stream-Fehler bei "${item.title}":`, e.message);
        });
        resource = createAudioResource(stream, { inlineVolume: true });
      }

      resource.volume?.setVolume(session.volume / 100);
      session.liveVolume = resource.volume || null;

      session.player.play(resource);
      session.current = item;
      session.isPaused = false;
      this.recordHistory(session.guildId, item);

      voiceDuckingService.attach({
        guildId: session.guildId,
        connection: session.connection,
        clientUserId: session.voiceChannel.guild.members.me?.id || session.voiceChannel.client.user?.id,
        getBaseVolume: () => session.volume,
        setLiveVolume: (fraction) => {
          session.liveVolume?.setVolume(fraction);
        },
      });
    } catch (error) {
      session.lastError = `Abspielen: ${(error as Error)?.message || "unbekannt"}`.slice(0, 200);
      console.error(`[Music] Fehler beim Abspielen von "${item.title}":`, error);
      this.onIdle(session);
    }
  }

  private async resolve(query: string): Promise<{ title: string; url: string; thumbnail: string; duration: string; source: "youtube" | "local"; directAudio?: boolean }> {
    const trimmed = query.trim();
    if (!trimmed) throw new Error("Bitte einen Suchbegriff oder eine YouTube-URL angeben.");
    if (/^local:/i.test(trimmed)) {
      const { soundboardService, getSoundPath } = await import("./soundboardService");
      const wanted = trimmed.slice(6).trim().toLowerCase();
      if (!wanted) throw new Error("Bitte einen Dateinamen angeben, z. B. `local:intro`.");
      const hit = soundboardService
        .list()
        .find((s) => s.file.toLowerCase() === wanted || s.name.toLowerCase() === wanted);
      if (!hit || !getSoundPath(hit.file)) {
        throw new Error("Lokale Datei nicht gefunden. Mit `/soundboard list` alle Sounds anzeigen.");
      }
      return { title: hit.name, url: `local:${hit.file}`, thumbnail: "", duration: "Lokal", source: "local" };
    }
    const isUrl = /^https?:\/\//i.test(trimmed);

    try {
      if (isUrl) {
        if (!ytdl.validateURL(trimmed)) {
          throw new Error("Diese URL ist kein gültiges YouTube-Video (Playlists werden nicht unterstützt – Einzelvideo nutzen).");
        }
        try {
          const info = await ytdl.getInfo(trimmed);
          const videoDetails = info.videoDetails;
          return {
            title: videoDetails.title ?? "Unbekannter Titel",
            url: videoDetails.video_url,
            thumbnail: videoDetails.thumbnails[0]?.url ?? "",
            duration: this.formatDuration(Number(videoDetails.lengthSeconds) || 0),
            source: "youtube",
          };
        } catch {
          // ytdl geblockt (Server-IP) -> Piped-Fallback
          let videoId: string | null = null;
          try {
            videoId = ytdl.getURLVideoID(trimmed);
          } catch {}
          if (videoId) {
            const piped = await pipedLookup(videoId);
            if (piped) {
              return {
                title: piped.title,
                url: piped.audioUrl,
                thumbnail: piped.thumbnail,
                duration: piped.duration,
                source: "youtube",
                directAudio: true,
              };
            }
          }
          throw new Error("YouTube blockt diesen Server. Alternative: Radio oder MP3-Upload nutzen.");
        }
      }

      const result = await yts(trimmed);
      const first = result.videos?.[0];
      if (!first) {
        throw new Error("Song konnte nicht gefunden werden. Bitte versuche es mit einem anderen Suchbegriff oder einer YouTube-URL.");
      }
      return {
        title: first.title ?? "Unbekannter Titel",
        url: first.url,
        thumbnail: first.image ?? "",
        duration: first.timestamp || "Live",
        source: "youtube",
      };
    } catch (e: any) {
      if (e?.message) throw e;
      throw new Error("Song konnte nicht gefunden werden. Bitte versuche es mit einem anderen Suchbegriff oder einer YouTube-URL.");
    }
  }

  private formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "Live";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  buildNowPlayingEmbed(item: string, queueLength: number, isPaused: boolean, volume: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(isPaused ? 0xffa500 : 0x00ff00)
      .setTitle(isPaused ? "⏸️ Pausiert" : "🎵 Spielt gerade")
      .setDescription(item)
      .addFields(
        { name: "Queue", value: `${queueLength} Song${queueLength === 1 ? "" : "s"}`, inline: true },
        { name: "Lautstärke", value: `${volume}%`, inline: true },
      )
      .setTimestamp();
  }
}

export const musicService = new MusicService();
