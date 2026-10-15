import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
} from "@discordjs/voice";
import { Guild, VoiceBasedChannel } from "discord.js";
import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import dns from "dns/promises";
import net from "net";

const ffmpegPath: string = (require("ffmpeg-static") as string | null) || "ffmpeg";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_RECONNECTS = 5;

export interface StationStatus {
  stationId: string;
  name: string;
  url: string;
  channelId: string | null;
  playing: boolean;
  paused: boolean;
  nowPlaying: string | null;
  lastError: string | null;
  startedAt: number | null;
}

interface Session {
  stationId: string;
  name: string;
  url: string;
  channelId: string;
  voiceChannel: VoiceBasedChannel;
  player: AudioPlayer;
  connection: VoiceConnection;
  ffmpeg: ChildProcess | null;
  streamAbort: AbortController | null;
  reconnects: number;
  stopped: boolean;
  paused: boolean;
  startedAt: number;
  nowPlaying: string | null;
  lastError: string | null;
  ffmpegErr: string;
  audioBytes: number;
  metaTimer: NodeJS.Timeout | null;
  retryDelayMs: number;
}

function isBlockedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] >= 224) return true;
    return false;
  }
  const low = ip.toLowerCase();
  return low === "::1" || low === "::" || low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("ff");
}

/** Stream-URL prüfen: http(s), kein lokales Ziel, liefert wirklich Audio (ffmpeg-Probe). */
export async function checkStream(rawUrl: string): Promise<{ ok: boolean; detail: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, detail: "Ungültige URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, detail: "Nur http(s) erlaubt." };
  }
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
      return { ok: false, detail: "Host nicht erlaubt (nur öffentliche Server)." };
    }
  } catch {
    return { ok: false, detail: "Host nicht auflösbar." };
  }
  return new Promise((resolve) => {
    const ffmpeg = spawn(
      ffmpegPath,
      ["-hide_banner", "-nostats", "-t", "6", "-user_agent", UA, "-i", parsed.toString(), "-vn", "-f", "null", "-"],
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
      if (code === 0 && audioLine) resolve({ ok: true, detail: audioLine.slice(0, 200) });
      else if (code === 0) resolve({ ok: false, detail: "Kein Audio-Stream gefunden." });
      else {
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

async function fetchIcyTitle(rawUrl: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(rawUrl, { signal: ctrl.signal, headers: { "Icy-MetaData": "1", "User-Agent": UA } });
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
      const m = meta.slice(0, metaLen).toString("utf-8").match(/StreamTitle='([^']*)'/);
      return m?.[1]?.trim() || null;
    } finally {
      await reader.cancel().catch(() => null);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export class StationPlayer {
  private sessions = new Map<string, Session>();

  private key(guildId: string, stationId: string) {
    return `${guildId}:${stationId}`;
  }

  getStatuses(guildId: string, known: { id: string; name: string; url: string }[]): StationStatus[] {
    return known.map((s) => {
      const sess = this.sessions.get(this.key(guildId, s.id));
      if (!sess) {
        return { stationId: s.id, name: s.name, url: s.url, channelId: null, playing: false, paused: false, nowPlaying: null, lastError: null, startedAt: null };
      }
      return {
        stationId: s.id, name: sess.name, url: sess.url, channelId: sess.channelId,
        playing: !sess.stopped, paused: sess.paused, nowPlaying: sess.nowPlaying,
        lastError: sess.lastError, startedAt: sess.startedAt,
      };
    });
  }

  public onStatusChange?: (guildId: string) => void;

  getActiveSession(guildId: string): Session | undefined {
    for (const [k, s] of this.sessions) {
      if (k.startsWith(`${guildId}:`) && !s.stopped) return s;
    }
    return undefined;
  }

  async start(channel: VoiceBasedChannel, stationId: string, rawUrl: string, name: string): Promise<void> {
    const guild = channel.guild as Guild;
    const normalized = rawUrl.trim().replace(/^https?:\/\/(www\.)?laut\.fm\//i, "https://stream.laut.fm/");
    await this.stop(guild.id).catch(() => null);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      try {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
      } catch {}
      throw new Error("Voice-Verbindung fehlgeschlagen.");
    }

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    connection.subscribe(player);

    const session: Session = {
      stationId, name, url: normalized, channelId: channel.id, voiceChannel: channel,
      player, connection, ffmpeg: null, streamAbort: null, reconnects: 0,
      stopped: false, paused: false, startedAt: Date.now(),
      nowPlaying: null, lastError: null, ffmpegErr: "", audioBytes: 0, metaTimer: null, retryDelayMs: 10_000,
    };
    this.sessions.set(this.key(guild.id, stationId), session);

    player.on(AudioPlayerStatus.Idle, () => {
      if (session.stopped || session.paused) return;
      if (session.audioBytes === 0 && !session.lastError) {
        session.lastError = "ffmpeg lieferte keine Audiodaten (Stream-URL prüfen)";
      }
      if (session.ffmpegErr && !session.lastError) {
        const interesting = [...session.ffmpegErr.split("\n").map((l) => l.trim()).filter(Boolean)]
          .reverse()
          .find((l) => /error|404|403|invalid|not found|unable|failed|refused|timeout/i.test(l));
        if (interesting) session.lastError = `ffmpeg: ${interesting}`.slice(0, 200);
      }
      if (session.reconnects >= MAX_RECONNECTS) {
        console.error(
          `[MusicBot] ${session.name} nach ${MAX_RECONNECTS} Versuchen beendet. URL: ${session.url}` +
          (session.lastError ? ` Fehler: ${session.lastError}` : ""),
        );
        void this.stop(guild.id, stationId).catch(() => null);
        return;
      }
      session.reconnects++;
      session.retryDelayMs = Math.min(10_000 * 2 ** Math.max(0, session.reconnects - 1), 120_000);
      setTimeout(() => {
        if (!session.stopped && !session.paused) void this.play(session);
      }, session.retryDelayMs);
    });

    player.on("error", (error) => {
      session.lastError = `Player: ${error.message}`.slice(0, 200);
      console.error(`[MusicBot] Player-Fehler ${session.name}:`, error.message);
    });

    this.attachDisconnectHandler(guild, stationId, session);

    this.startMetaPolling(session);
    await this.play(session);
  }

  private attachDisconnectHandler(guild: Guild, stationId: string, session: Session) {
    session.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (session.stopped || !this.has(guild.id, stationId)) return;
      console.warn(`[MusicBot] Verbindung verloren (${session.name}), versuche Wiederaufbau …`);
      try {
        await Promise.race([
          entersState(session.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(session.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log(`[MusicBot] Verbindung wiederhergestellt (${session.name}).`);
        return;
      } catch {}
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (session.stopped || !this.has(guild.id, stationId)) return;
        try {
          try {
            session.connection.destroy();
          } catch {}
          const fresh = joinVoiceChannel({
            channelId: session.channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
          });
          await entersState(fresh, VoiceConnectionStatus.Ready, 15_000);
          fresh.subscribe(session.player);
          session.connection = fresh;
          this.attachDisconnectHandler(guild, stationId, session);
          session.reconnects = 0;
          console.log(`[MusicBot] Neu verbunden (${session.name}, Versuch ${attempt}).`);
          await this.play(session);
          return;
        } catch (e) {
          console.warn(`[MusicBot] Neuaufbau ${attempt}/3:`, (e as Error).message);
          await new Promise((r) => setTimeout(r, 5_000 * attempt));
        }
      }
      session.lastError = "Voice-Verbindung dauerhaft verloren.";
      void this.stop(guild.id, stationId).catch(() => null);
    });
  }

  private async play(session: Session) {
    this.killFfmpeg(session);
    const ctrl = new AbortController();
    session.streamAbort = ctrl;
    let res: Response;
    try {
      res = await fetch(session.url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": UA, "Icy-MetaData": "0" },
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
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      session.retryDelayMs = 10_000;
    } catch (e: unknown) {
      if (!session.stopped) {
        const msg = e instanceof Error ? e.message : "fehlgeschlagen";
        session.lastError = `Stream-Abruf: ${msg}`.slice(0, 200);
        console.error(`[MusicBot] Stream-Abruf ${session.name}:`, msg);
      }
      return;
    }

    const ffmpeg: ChildProcess = spawn(
      ffmpegPath,
      ["-thread_queue_size", "1024", "-i", "pipe:0", "-vn", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
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
    ffmpeg.on("error", (error: Error) => {
      session.lastError = `ffmpeg: ${error.message}`.slice(0, 200);
      console.error("[MusicBot] ffmpeg-Fehler:", error.message);
    });

    try {
      Readable.fromWeb(res.body as any).pipe(ffmpeg.stdin!);
    } catch (pipeErr: any) {
      console.error("[MusicBot] Stream-Pipe Fehler:", pipeErr?.message);
    }

    session.player.play(createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw }));
  }

  private killFfmpeg(session: Session) {
    try {
      session.streamAbort?.abort();
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

  private startMetaPolling(session: Session) {
    const tick = async () => {
      if (session.stopped) return;
      const title = await fetchIcyTitle(session.url).catch(() => null);
      if (session.stopped) return;
      if (title && title !== session.nowPlaying) {
        session.nowPlaying = title;
        try {
          const vc = session.voiceChannel;
          if (vc && typeof (vc as unknown as { setStatus?: unknown }).setStatus === "function") {
            await (vc as unknown as { setStatus: (s: string) => Promise<unknown> }).setStatus(`🎵 ${title}`.slice(0, 100));
          }
        } catch {}
        this.onStatusChange?.(session.voiceChannel.guild.id);
      } else if (!title && session.nowPlaying) {
        session.nowPlaying = null;
        this.onStatusChange?.(session.voiceChannel.guild.id);
      }
    };
    void tick();
    session.metaTimer = setInterval(() => void tick(), 60_000);
    session.metaTimer.unref?.();
  }

  pause(guildId: string, stationId?: string): boolean {
    let ok = false;
    for (const [k, s] of this.sessions) {
      if (!k.startsWith(`${guildId}:`)) continue;
      if (stationId && s.stationId !== stationId) continue;
      s.paused = true;
      this.killFfmpeg(s);
      try {
        s.player.stop(true);
      } catch {}
      ok = true;
    }
    return ok;
  }

  resume(guildId: string, stationId?: string): boolean {
    let ok = false;
    for (const [k, s] of this.sessions) {
      if (!k.startsWith(`${guildId}:`)) continue;
      if (stationId && s.stationId !== stationId) continue;
      s.paused = false;
      s.reconnects = 0;
      void this.play(s);
      ok = true;
    }
    return ok;
  }

  async stop(guildId: string, stationId?: string): Promise<boolean> {
    let ok = false;
    for (const [k, s] of [...this.sessions]) {
      if (!k.startsWith(`${guildId}:`)) continue;
      if (stationId && s.stationId !== stationId) continue;
      s.stopped = true;
      this.sessions.delete(k);
      if (s.metaTimer) clearInterval(s.metaTimer);
      this.killFfmpeg(s);
      try {
        s.player.stop(true);
      } catch {}
      try {
        if (s.connection.state.status !== VoiceConnectionStatus.Destroyed) s.connection.destroy();
      } catch {}
      ok = true;
    }
    return ok;
  }

  async stopAll() {
    await Promise.all([...this.sessions.keys()].map((k) => {
      const [guildId, ...rest] = k.split(":");
      return this.stop(guildId, rest.join(":"));
    }));
  }

  has(guildId: string, stationId: string) {
    return this.sessions.has(this.key(guildId, stationId));
  }
}

export const stationPlayer = new StationPlayer();
