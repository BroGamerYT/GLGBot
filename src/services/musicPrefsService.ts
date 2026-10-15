import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";

const DATA_DIR = path.join(__dirname, "../../data");
const PREFS_FILE = path.join(DATA_DIR, "music_prefs.json");

interface ChannelPref {
  volume?: number;
}

interface GuildPrefs {
  channels: Record<string, ChannelPref>;
  users: Record<string, ChannelPref>;
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
}

export const musicPrefsService = new MusicPrefsService();
