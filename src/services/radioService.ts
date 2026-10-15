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
import { VoiceBasedChannel } from "discord.js";
import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import dns from "dns/promises";
import net from "net";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import { voiceDuckingService } from "./voiceDuckingService";

const DATA_DIR = path.join(__dirname, "../../data");
const STATE_FILE = path.join(DATA_DIR, "radio_state.json");

interface PersistedRadioState {
  channelId: string;
  url: string;
  name: string;
}

// ffmpeg-static liefert den Pfad zur Binary; Fallback ist ein System-ffmpeg im PATH.
const ffmpegPath: string = (require("ffmpeg-static") as string | null) || "ffmpeg";

const MAX_RECONNECTS = 5;

interface RadioSession {
  guildId: string;
  channelId: string;
  url: string;
  name: string;
  player: AudioPlayer;
  connection: VoiceConnection;
  voiceChannel: VoiceBasedChannel;
  ffmpeg: ChildProcess | null;
  ffmpegErr: string;
  audioBytes: number;
  streamAbort: AbortController | null;
  volume: number;
  liveVolume: { setVolume(n: number): void } | null;
  retryDelayMs: number;
  reconnects: number;
  stopped: boolean;
  paused: boolean;
  startedAt: number;
  nowPlaying: string | null;
  metaTimer: NodeJS.Timeout | null;
  lastError: string | null;
}

export interface RadioStatus {
  guildId: string;
  channelId: string;
  url: string;
  name: string;
  paused: boolean;
  startedAt: number;
  nowPlaying: string | null;
  lastError: string | null;
  volume: number;
}

/** Liest den aktuellen ICY-Titel (StreamTitle) eines Icecast/Shoutcast-Streams aus. */
export async function fetchIcyTitle(rawUrl: string, timeoutMs = 10_000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rawUrl, {
      signal: ctrl.signal,
      headers: { "Icy-MetaData": "1", "User-Agent": "GLGBot-Radio/1.0" },
    });
    const metaInt = Number(res.headers.get("icy-metaint"));
    if (!metaInt || !res.body) return null;
    const reader = res.body.getReader();
    try {
      let skipped = 0;
      while (skipped < metaInt) {
        const { done, value } = await reader.read();
        if (done) return null;
        skipped += value?.length ?? 0;
      }
      const { done, value } = await reader.read();
      if (done || !value || value.length === 0) return null;
      const metaLen = value[0] * 16;
      if (metaLen === 0) return null;
      let meta = Buffer.from(value.slice(1));
      while (meta.length < metaLen) {
        const chunk = await reader.read();
        if (chunk.done || !chunk.value) break;
        meta = Buffer.concat([meta, Buffer.from(chunk.value)]);
      }
      const text = meta.slice(0, metaLen).toString("utf-8");
      const m = text.match(/StreamTitle='([^']*)'/);
      const title = m?.[1]?.trim();
      return title || null;
    } finally {
      await reader.cancel().catch(() => null);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isBlockedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 0) return true;
    if (p[0] >= 224) return true;
    return false;
  }
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true;
  if (low.startsWith("fe80:") || low.startsWith("fec0:") || low.startsWith("fc") || low.startsWith("fd")) return true;
  if (low.startsWith("ff")) return true;
  return false;
}

/**
 * Strikte Stream-Validierung: nur http(s), keine lokalen/privaten Ziele (SSRF-Schutz),
 * dazu ein kurzer Erreichbarkeits-Test mit Timeout und Redirect-Begrenzung.
 */
export async function validateStreamUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Ungueltige URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Nur http:// und https:// Streams werden unterstuetzt.");
  }
  if (!parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Ungueltige Stream-URL.");
  }
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
      throw new Error("Dieser Host ist nicht erlaubt (nur öffentliche Server).");
    }
  } catch (e: any) {
    if (e?.message?.includes("nicht erlaubt")) throw e;
    throw new Error("Host konnte nicht aufgelöst werden.");
  }
  async function probe(method: string): Promise<{ status: number; icyName: string | null; contentType: string | null }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    try {
      const res = await fetch(parsed.toString(), {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "GLGBot-Radio/1.0", Range: "bytes=0-0" },
      });
      // Body sofort verwerfen – nur Header/Status interessieren
      await res.arrayBuffer().catch(() => null);
      return { status: res.status, icyName: res.headers.get("icy-name"), contentType: res.headers.get("content-type") };
    } finally {
      clearTimeout(timer);
    }
  }
  try {
    let r = await probe("HEAD").catch(() => null);
    // Manche Server lehnen HEAD ab – dann GET mit Range 0-0 versuchen
    if (!r || r.status === 403 || r.status === 405) {
      r = await probe("GET").catch(() => null);
    }
    if (!r) throw new Error("Stream ist nicht erreichbar.");
    if (r.status >= 500) throw new Error(`Stream antwortet nicht (HTTP ${r.status}).`);
    if (r.status >= 400 && r.status !== 206) {
      throw new Error(`Stream verweigert Zugriff (HTTP ${r.status}).`);
    }
    if (r.contentType && /text\/html/i.test(r.contentType) && !r.icyName) {
      throw new Error("Das ist eine Webseite, kein Audio-Stream. Nutze die direkte Stream-URL (z. B. aus dem Dashboard).");
    }
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Stream ist nicht erreichbar (Timeout).");
    if (e?.message) throw e;
    throw new Error("Stream ist nicht erreichbar.");
  }
  return parsed;
}

export class RadioService {
  private sessions = new Map<string, RadioSession>();

  getStatus(guildId: string): RadioStatus | null {
    const s = this.sessions.get(guildId);
    if (!s) return null;
    return {
      guildId: s.guildId,
      channelId: s.channelId,
      url: s.url,
      name: s.name,
      paused: s.paused,
      startedAt: s.startedAt,
      nowPlaying: s.nowPlaying,
      lastError: s.lastError,
      volume: s.volume,
    };
  }

  async start(channel: VoiceBasedChannel, rawUrl: string, name = "Web-Radio", userId?: string): Promise<RadioStatus> {
    // laut.fm-Seiten-URLs automatisch auf den echten Stream umschreiben (Seite liefert HTML, kein Audio)
    const normalized = rawUrl.trim().replace(/^https?:\/\/(www\.)?laut\.fm\//i, "https://stream.laut.fm/");
    const url = (await validateStreamUrl(normalized)).toString();
    // Gespeicherte Lautstärke (Kanal gewinnt, sonst User)
    let startVolume = 100;
    try {
      const { musicPrefsService } = await import("./musicPrefsService");
      startVolume = musicPrefsService.getVolume(channel.guild.id, channel.id, userId);
    } catch {}
    try {
      const { musicService } = await import("./musicService");
      musicService.stop(channel.guild.id);
    } catch {}
    try {
      await this.stop(channel.guild.id);
    } catch {}

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

    // Kanal-Bitrate auf Musik-Niveau heben (gegen Lag durch Transcoding)
    try {
      const { ensureMusicBitrate } = await import("../utils/voiceQuality");
      await ensureMusicBitrate(channel);
    } catch {}

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    connection.subscribe(player);

    const session: RadioSession = {
      guildId: channel.guild.id,
      channelId: channel.id,
      url,
      name,
      player,
      connection,
      voiceChannel: channel,
      ffmpeg: null,
      reconnects: 0,
      stopped: false,
      paused: false,
      startedAt: Date.now(),
      nowPlaying: null,
      metaTimer: null,
      lastError: null,
      ffmpegErr: "",
      audioBytes: 0,
      streamAbort: null,
      volume: startVolume,
      liveVolume: null,
      retryDelayMs: 10_000,
    };
    this.sessions.set(session.guildId, session);
    this.saveState(session);
    this.startMetaPolling(session);

    player.on(AudioPlayerStatus.Idle, () => {
      // Live-Streams enden nur bei Verbindungsabbruch -> neu verbinden.
      if (session.stopped || session.paused) return;
      // Keine Audiodaten angekommen, obwohl ffmpeg lief -> URL liefert kein Audio
      if (session.audioBytes === 0 && !session.lastError) {
        session.lastError = "ffmpeg lieferte keine Audiodaten (Stream-URL prüfen)";
      }
      // ffmpeg-Meldung als Fehler übernehmen (z. B. 404, falsches Format)
      if (session.ffmpegErr && !session.lastError) {
        const lines = session.ffmpegErr.split("\n").map((l) => l.trim()).filter(Boolean);
        const interesting = [...lines].reverse().find((l) =>
          /error|404|403|invalid|not found|unable|failed|connection|timeout|refused/i.test(l),
        );
        if (interesting) session.lastError = `ffmpeg: ${interesting}`.slice(0, 200);
      }
      if (session.reconnects >= MAX_RECONNECTS) {
        console.error(
          `[Radio] Stream fuer ${session.guildId} nach ${MAX_RECONNECTS} Versuchen beendet. URL: ${session.url}` +
          (session.lastError ? ` Letzter Fehler: ${session.lastError}` : " (kein Fehler gemeldet – Stream liefert kein Audio)") +
          (session.ffmpegErr ? ` ffmpeg-Log: ${session.ffmpegErr.split("\n").map((l) => l.trim()).filter(Boolean).slice(-3).join(" | ").slice(0, 400)}` : ""),
        );
        void this.stop(session.guildId).catch(() => null);
        return;
      }
      session.reconnects++;
      // Exponentieller Backoff (10s → 120s max), damit der Hoster nicht drosselt (HTTP 429)
      session.retryDelayMs = Math.min(10_000 * 2 ** Math.max(0, session.reconnects - 1), 120_000);
      setTimeout(() => {
        if (!session.stopped && !session.paused) void this.play(session);
      }, session.retryDelayMs);
    });

    player.on("error", (error) => {
      session.lastError = `Player: ${error.message}`.slice(0, 200);
      console.error(`[Radio] Player-Fehler in ${session.guildId}:`, error.message);
    });

    this.attachDisconnectHandler(session);

    void this.play(session);
    return this.getStatus(session.guildId)!;
  }

  private attachDisconnectHandler(session: RadioSession) {
    session.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (session.stopped) return;
      console.warn(`[Radio] Verbindung verloren (${session.name}), versuche Wiederaufbau …`);
      try {
        await Promise.race([
          entersState(session.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(session.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log(`[Radio] Verbindung wiederhergestellt (${session.name}).`);
        return;
      } catch {}
      // Kompletter Neuaufbau: alte Verbindung weg, neu joinen, weiter spielen
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (session.stopped) return;
        try {
          try {
            session.connection.destroy();
          } catch {}
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
          session.reconnects = 0;
          console.log(`[Radio] Neu verbunden (${session.name}, Versuch ${attempt}).`);
          await this.play(session);
          return;
        } catch (e) {
          console.warn(`[Radio] Neuaufbau ${attempt}/3 fehlgeschlagen:`, (e as Error).message);
          await new Promise((r) => setTimeout(r, 5_000 * attempt));
        }
      }
      session.lastError = "Voice-Verbindung dauerhaft verloren.";
      void this.stop(session.guildId).catch(() => null);
    });
  }

  private async play(session: RadioSession) {
    this.killFfmpeg(session);

    const ctrl = new AbortController();
    session.streamAbort = ctrl;
    let res: Response;
    try {
      res = await fetch(session.url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Icy-MetaData": "0",
        },
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitSec = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 300) : 90;
        session.retryDelayMs = waitSec * 1000;
        try {
          await res.arrayBuffer().catch(() => null);
        } catch {}
        throw new Error(`Host drosselt (HTTP 429) – neuer Versuch in ${waitSec}s.`);
      }
      if (!res.ok || !res.body) throw new Error(`Stream antwortet mit HTTP ${res.status}.`);
      session.retryDelayMs = 10_000;
    } catch (e: any) {
      if (!session.stopped) {
        session.lastError = `Stream-Abruf: ${e?.message || "fehlgeschlagen"}`.slice(0, 200);
        console.error(`[Radio] Stream-Abruf fehlgeschlagen (${session.guildId}):`, e?.message);
      }
      return;
    }

    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-thread_queue_size", "1024",
        "-i", "pipe:0",
        "-vn",
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    session.ffmpeg = ffmpeg;
    session.ffmpegErr = "";
    session.audioBytes = 0;

    ffmpeg.stderr?.on("data", (d: Buffer) => {
      session.ffmpegErr = (session.ffmpegErr + d.toString()).slice(-2000);
    });
    ffmpeg.stdout?.on("data", (d: Buffer) => {
      session.audioBytes += d.length;
    });
    ffmpeg.stdin?.on("error", () => null);

    ffmpeg.on("error", (error) => {
      session.lastError = `ffmpeg: ${error.message}`.slice(0, 200);
      console.error("[Radio] ffmpeg konnte nicht gestartet werden:", error.message);
    });

    try {
      const stream = Readable.fromWeb(res.body as any);
      stream.on("error", () => null);
      stream.pipe(ffmpeg.stdin!);
    } catch (pipeErr: any) {
      console.error("[Radio] Stream-Pipe Fehler:", pipeErr?.message);
    }

    const resource = createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw, inlineVolume: true });
    resource.volume?.setVolume(session.volume / 100);
    session.liveVolume = resource.volume || null;
    session.player.play(resource);

    voiceDuckingService.attach({
      guildId: session.guildId,
      connection: session.connection,
      clientUserId: session.voiceChannel.guild.members.me?.id || session.voiceChannel.client.user?.id,
      getBaseVolume: () => session.volume,
      setLiveVolume: (fraction) => {
        session.liveVolume?.setVolume(fraction);
      },
    });
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
    try {
      const { musicPrefsService } = require("./musicPrefsService") as typeof import("./musicPrefsService");
      musicPrefsService.setVolume(guildId, s.volume, channelId || s.channelId, userId);
    } catch {}
    return true;
  }

  private killFfmpeg(session: RadioSession) {
    try {
      if (session.streamAbort && !session.streamAbort.signal.aborted) {
        session.streamAbort.abort();
      }
    } catch {}
    session.streamAbort = null;
    const ff = session.ffmpeg;
    session.ffmpeg = null;
    if (ff) {
      try {
        ff.stdin?.destroy();
      } catch {}
      if (!ff.killed) ff.kill("SIGKILL");
    }
  }

  private startMetaPolling(session: RadioSession) {
    const tick = async () => {
      if (session.stopped) return;
      const title = await fetchIcyTitle(session.url).catch(() => null);
      if (session.stopped) return;
      if (title && title !== session.nowPlaying) {
        session.nowPlaying = title;
        // Kanal-Status nur bei tatsächlichem Titelwechsel setzen (Rate-Limit schonen)
        void this.updateChannelStatus(session, `🎵 ${title}`.slice(0, 100));
      } else if (!title) {
        session.nowPlaying = null;
      }
    };
    void tick();
    session.metaTimer = setInterval(() => void tick(), 60_000);
    session.metaTimer.unref?.();
  }

  private async updateChannelStatus(session: RadioSession, status: string) {
    try {
      const vc = session.voiceChannel;
      if (vc && typeof (vc as unknown as { setStatus?: unknown }).setStatus === "function") {
        await (vc as unknown as { setStatus: (s: string) => Promise<unknown> }).setStatus(status);
      }
    } catch {}
  }

  private stopMetaPolling(session: RadioSession) {
    if (session.metaTimer) clearInterval(session.metaTimer);
    session.metaTimer = null;
  }

  pause(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.paused = true;
    this.killFfmpeg(s);
    s.player.stop(true);
    return true;
  }

  resume(guildId: string): boolean {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    s.paused = false;
    s.reconnects = 0;
    this.play(s);
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

  async stop(guildId: string): Promise<boolean> {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    voiceDuckingService.detach(guildId);
    s.stopped = true;
    this.sessions.delete(guildId);
    this.stopMetaPolling(s);
    this.clearState(guildId);
    this.killFfmpeg(s);
    try {
      s.player.stop(true);
    } catch {}
    this.safeDestroy(s.connection);
    return true;
  }

  async stopAll() {
    await Promise.all([...this.sessions.keys()].map((id) => this.stop(id)));
  }

  private loadStates(): Record<string, PersistedRadioState> {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[Radio] Konnte gespeicherten Status nicht lesen:", (e as Error).message);
    }
    return {};
  }

  private saveState(session: RadioSession) {
    try {
      const states = this.loadStates();
      states[session.guildId] = { channelId: session.channelId, url: session.url, name: session.name };
      writeJsonAtomic(STATE_FILE, states);
    } catch (e) {
      console.error("[Radio] Konnte Status nicht speichern:", (e as Error).message);
    }
  }

  private clearState(guildId: string) {
    try {
      const states = this.loadStates();
      if (states[guildId]) {
        delete states[guildId];
        writeJsonAtomic(STATE_FILE, states);
      }
    } catch (e) {
      console.error("[Radio] Konnte Status nicht löschen:", (e as Error).message);
    }
  }

  /**
   * Selbsttest: 5s Sinuston im Voice-Kanal. Hörbar = Voice-Pipeline (ffmpeg/Opus/UDP) ok,
   * dann liegt Stille an der Stream-URL. Nicht hörbar = Server kann kein Audio senden.
   */
  async selfTest(channel: VoiceBasedChannel): Promise<void> {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      try {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
      } catch {}
      throw new Error("Verbindung zum Voice-Kanal fehlgeschlagen.");
    }
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    connection.subscribe(player);
    const ffmpeg = spawn(
      ffmpegPath,
      ["-f", "lavfi", "-i", "sine=frequency=440:duration=5", "-vn", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    const resource = createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw });
    player.play(resource);
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      player.on(AudioPlayerStatus.Idle, done);
      player.on("error", done);
      setTimeout(done, 8_000);
    });
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
    player.stop(true);
    try {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
    } catch {}
  }

  /**
   * Prüft auf dem Server, ob eine URL wirklich Audio liefert (6s Probe via ffmpeg).
   * Für Dashboard-URL-Test und Diagnose.
   */
  async probeUrl(rawUrl: string): Promise<{ ok: boolean; detail: string }> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return { ok: false, detail: "Ungültige URL." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, detail: "Nur http(s) erlaubt." };
    }
    return new Promise((resolve) => {
      const ffmpeg = spawn(
        ffmpegPath,
        ["-hide_banner", "-nostats", "-t", "6",
          "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "-i", parsed.toString(), "-vn", "-f", "null", "-"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let err = "";
      ffmpeg.stderr?.on("data", (d: Buffer) => {
        err = (err + d.toString()).slice(-2000);
      });
      const timer = setTimeout(() => {
        if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
        resolve({ ok: false, detail: "Timeout – Stream antwortet nicht." });
      }, 15_000);
      ffmpeg.on("close", (code) => {
        clearTimeout(timer);
        const audioLine = err.split("\n").find((l) => /Stream.*Audio/i.test(l))?.trim() || null;
        if (code === 0 && audioLine) {
          resolve({ ok: true, detail: audioLine.slice(0, 200) });
        } else if (code === 0) {
          resolve({ ok: false, detail: "Kein Audio-Stream gefunden." });
        } else {
          const interesting = [...err.split("\n").map((l) => l.trim()).filter(Boolean)]
            .reverse()
            .find((l) => /error|404|403|invalid|not found|unable|failed|refused|timeout/i.test(l));
          resolve({ ok: false, detail: (interesting || `ffmpeg-Code ${code}`).slice(0, 200) });
        }
      });
      ffmpeg.on("error", (e) => {
        clearTimeout(timer);
        resolve({ ok: false, detail: `ffmpeg: ${e.message}`.slice(0, 200) });
      });
    });
  }

  /** Stellt nach einem Bot-Neustart alle gespeicherten Radio-Streams wieder her. */
  async restoreAll(client: import("discord.js").Client): Promise<void> {
    if ((process.env.MUSIC_MODE || "embedded") === "disabled") return;
    if ((process.env.RADIO_AUTO_RESUME || "true") === "false") return;
    const states = this.loadStates();
    for (const [guildId, st] of Object.entries(states)) {
      try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          this.clearState(guildId);
          continue;
        }
        const channel = await guild.channels.fetch(st.channelId).catch(() => null);
        if (!channel || !channel.isVoiceBased()) {
          this.clearState(guildId);
          continue;
        }
        // Keinem leeren Kanal nach Neustart etwas vorspielen
        try {
          const humans = channel.members.filter((m) => !m.user.bot).size;
          if (humans === 0) continue;
        } catch {}
        await this.start(channel, st.url, st.name);
        console.log(`[Radio] Stream für ${guild.name} wiederhergestellt: ${st.name}`);
      } catch (e) {
        console.error(`[Radio] Wiederherstellung für ${guildId} fehlgeschlagen:`, (e as Error).message);
        this.clearState(guildId);
      }
    }
  }
}

export const radioService = new RadioService();