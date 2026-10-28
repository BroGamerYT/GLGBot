import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";

const DATA_DIR = path.join(__dirname, "../../data");
const PREFS_FILE = path.join(DATA_DIR, "music_prefs.json");

interface ChannelPref {
  volume?: number;
}

/** Einstellungen für das automatische Leiserstellen beim Sprechen (Ducking) */
export interface DuckingSettings {
  /** Ducking überhaupt aktiv? */
  enabled: boolean;
  /** Auf wie viel Prozent der normalen Lautstärke wird abgesenkt (5-100) */
  level: number;
  /** Wartezeit in Millisekunden, bis nach dem Sprechen wieder aufgedreht wird (100-5000) */
  releaseMs: number;
}

export const DUCKING_DEFAULTS: DuckingSettings = {
  enabled: true,
  level: 35,
  releaseMs: 800,
};

interface GuildPrefs {
  channels: Record<string, ChannelPref>;
  users: Record<string, ChannelPref>;
  ducking?: Partial<DuckingSettings>;
}

type PrefsFile = Record<string, GuildPrefs>;

function loadAll(): PrefsFile {
  try {
    if (fs.existsSync(PREFS_FILE)) return JSON.parse(fs.readFileSync(PREFS_FILE, "utf-8"));
  } catch {}
  return {};
}

function saveAll(all: PrefsFile) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonAtomic(PREFS_FILE, all);
  } catch (e) {
    console.error("[MusicPrefs] Speichern fehlgeschlagen:", (e as Error).message);
  }
}

function clamp(volume: number): number {
  return Math.max(0, Math.min(100, Math.round(volume)));
}

class MusicPrefsService {
  /** Gespeicherte Lautstärke: Kanal gewinnt, sonst User, sonst 100. */
  getVolume(guildId: string, channelId?: string | null, userId?: string | null): number {
    const guild = loadAll()[guildId];
    if (!guild) return 100;
    if (channelId && typeof guild.channels[channelId]?.volume === "number") {
      return clamp(guild.channels[channelId].volume!);
    }
    if (userId && typeof guild.users[userId]?.volume === "number") {
      return clamp(guild.users[userId].volume!);
    }
    return 100;
  }

  setVolume(guildId: string, volume: number, channelId?: string | null, userId?: string | null) {
    const all = loadAll();
    const guild = (all[guildId] ||= { channels: {}, users: {} });
    const v = clamp(volume);
    if (channelId) {
      guild.channels[channelId] = { ...(guild.channels[channelId] || {}), volume: v };
    } else if (userId) {
      guild.users[userId] = { ...(guild.users[userId] || {}), volume: v };
    } else {
      return;
    }
    saveAll(all);
  }

  /** Ducking-Einstellungen eines Servers (mit Standardwerten aufgefüllt). */
  getDucking(guildId: string): DuckingSettings {
    const saved = loadAll()[guildId]?.ducking || {};
    return {
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : DUCKING_DEFAULTS.enabled,
      level: clampRange(saved.level, 5, 100, DUCKING_DEFAULTS.level),
      releaseMs: clampRange(saved.releaseMs, 100, 5000, DUCKING_DEFAULTS.releaseMs),
    };
  }

  /** Ducking-Einstellungen ändern; übergibt nur die Felder, die sich ändern sollen. */
  setDucking(guildId: string, patch: Partial<DuckingSettings>): DuckingSettings {
    const all = loadAll();
    const guild = (all[guildId] ||= { channels: {}, users: {} });
    const current = this.getDucking(guildId);
    guild.ducking = {
      enabled: typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
      level: patch.level === undefined ? current.level : clampRange(patch.level, 5, 100, current.level),
      releaseMs: patch.releaseMs === undefined ? current.releaseMs : clampRange(patch.releaseMs, 100, 5000, current.releaseMs),
    };
    saveAll(all);
    return guild.ducking as DuckingSettings;
  }
}

function clampRange(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export const musicPrefsService = new MusicPrefsService();
