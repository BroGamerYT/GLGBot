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
import { VoiceBasedChannel } from "discord.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const MUSIC_DIR = path.join(DATA_DIR, "music");

const ALLOWED_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a"]);
const MAX_FILE_MB = 25;

export interface SoundEntry {
  /** Relativer Pfad, z. B. "intro.mp3" oder "jingles/intro.mp3" */
  file: string;
  name: string;
  /** Ordnername oder "" für Hauptverzeichnis */
  folder: string;
  sizeKb: number;
}

function ensureDir() {
  if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

function cleanPart(part: string): string | null {
  if (!part || typeof part !== "string") return null;
  const trimmed = part.trim();
  if (trimmed === "." || trimmed === ".." || trimmed.startsWith(".") || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
    return null;
  }
  if (trimmed.length > 255) return null;
  return trimmed;
}

/** Erlaubt "datei.mp3" oder "ordner/datei.mp3" (genau eine Ebene), sonst null. */
function safeRel(rel: string): string | null {
  const parts = rel.replace(/\\/g, "/").split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  const cleaned = parts.map(cleanPart);
  if (cleaned.some((p) => !p)) return null;
  const file = cleaned[cleaned.length - 1]!;
  if (!ALLOWED_EXT.has(path.extname(file).toLowerCase())) return null;
  return cleaned.join("/");
}

function safeName(file: string): string | null {
  const rel = safeRel(file);
  if (!rel || rel.includes("/")) return null;
  return rel;
}

/** Prüft Pfad (inkl. Ordner) und liefert den absoluten Pfad oder null. */
export function getSoundPath(file: string): string | null {
  const rel = safeRel(file);
  if (!rel) return null;
  ensureDir();
  const full = path.join(MUSIC_DIR, rel);
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size > MAX_FILE_MB * 1024 * 1024) return null;
    return full;
  } catch {
    return null;
  }
}

export const SOUND_MAX_MB = MAX_FILE_MB;

class SoundboardService {
  list(): SoundEntry[] {
    ensureDir();
    const out: SoundEntry[] = [];
    try {
      const pushFile = (rel: string, folder: string) => {
        try {
          const stat = fs.statSync(path.join(MUSIC_DIR, rel));
          if (!stat.isFile() || stat.size > MAX_FILE_MB * 1024 * 1024) return;
          const base = path.basename(rel);
          out.push({
            file: rel,
            name: path.basename(base, path.extname(base)),
            folder,
            sizeKb: Math.round(stat.size / 1024),
          });
        } catch {}
      };
      for (const entry of fs.readdirSync(MUSIC_DIR)) {
        const full = path.join(MUSIC_DIR, entry);
        try {
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            const rel = safeRel(entry);
            if (rel) pushFile(rel, "");
          } else if (stat.isDirectory() && cleanPart(entry)) {
            for (const sub of fs.readdirSync(full)) {
              const rel = safeRel(`${entry}/${sub}`);
              if (rel) pushFile(rel, entry);
            }
          }
        } catch {}
      }
    } catch {}
    return out.sort(
      (a, b) => a.folder.localeCompare(b.folder, "de") || a.name.localeCompare(b.name, "de"),
    );
  }

  /** Alle Ordnernamen (für Anzeige/Gruppierung). */
  folders(): string[] {
    return [...new Set(this.list().map((s) => s.folder).filter(Boolean))].sort();
  }

  /** Speicherverbrauch der Bibliothek (rekursiv, inkl. Unterordner). */
  usage(): { bytes: number; files: number } {
    ensureDir();
    let bytes = 0;
    let files = 0;
    const walk = (dir: string) => {
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry);
        try {
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            bytes += stat.size;
            files++;
          } else if (stat.isDirectory()) {
            walk(full);
          }
        } catch {}
      }
    };
    walk(MUSIC_DIR);
    return { bytes, files };
  }

  /** Spielt einen kurzen Sound im Voice-Kanal des Mitglieds ab (eigene Verbindung, lässt Radio/Musik unangetastet). */
  async play(channel: VoiceBasedChannel, file: string): Promise<string> {
    const base = safeName(file);
    if (!base) throw new Error("Unbekannter Sound.");
    ensureDir();
    const full = path.join(MUSIC_DIR, base);
    if (!fs.existsSync(full)) throw new Error("Sound-Datei nicht gefunden.");
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size > MAX_FILE_MB * 1024 * 1024) {
      throw new Error(`Datei zu groß (max. ${MAX_FILE_MB} MB).`);
    }

    const connection: VoiceConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      connection.destroy();
      throw new Error("Verbindung zum Voice-Kanal fehlgeschlagen.");
    }

    const ffmpegPath: string = (require("ffmpeg-static") as string | null) || "ffmpeg";
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    connection.subscribe(player);

    const ffmpeg = spawn(
      ffmpegPath,
      ["-i", full, "-vn", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    // Raw-PCM braucht expliziten Typ – die Auto-Erkennung scheitert ohne Container-Header
    const resource = createAudioResource(ffmpeg.stdout!, { inputType: StreamType.Raw });
    player.play(resource);

    const done = new Promise<void>((resolve) => {
      player.on(AudioPlayerStatus.Idle, () => resolve());
      player.on("error", () => resolve());
    });
    await Promise.race([
      done,
      new Promise<void>((resolve) => setTimeout(resolve, 120_000)),
    ]);
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
    player.stop(true);
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
    return base;
  }
}

export const soundboardService = new SoundboardService();
