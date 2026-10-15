import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// .env aus dem Projekt-Root laden (dort liegt auch data/)
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config();

export const MUSICBOT_TOKEN = process.env.MUSICBOT_TOKEN || "";
export const MUSICBOT_CLIENT_ID = process.env.MUSICBOT_CLIENT_ID || "";
export const MUSIC_GUILD_ID = process.env.MUSIC_GUILD_ID || process.env.MUSICBOT_GUILD_ID || process.env.GUILD_ID || "";

if (!MUSICBOT_TOKEN) console.error("❌ [MusicBot] MUSICBOT_TOKEN fehlt in der .env");
if (!MUSIC_GUILD_ID) console.error("❌ [MusicBot] MUSIC_GUILD_ID (oder GUILD_ID) fehlt in der .env");

const DATA_DIR = path.join(__dirname, "../../data");
const RADIO_CONFIG = path.join(DATA_DIR, "radio_config.json");
const STATE_FILE = path.join(DATA_DIR, "musicbot.json");

export interface Station {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

const FALLBACK_STATIONS: Station[] = [
  { id: "ssl-edm", name: "SUNSHINE LIVE - EDM", url: "https://stream.sunshine-live.de/edm/mp3-192/stream.sunshine-live.de/", active: true },
  { id: "ssl-house", name: "SUNSHINE LIVE - House", url: "https://stream.sunshine-live.de/house/mp3-192/stream.sunshine-live.de/", active: true },
  { id: "ssl-classics", name: "SUNSHINE LIVE - Classics", url: "https://stream.sunshine-live.de/classics/mp3-192/stream.sunshine-live.de/", active: true },
  { id: "ssl-trance", name: "SUNSHINE LIVE - Trance", url: "https://stream.sunshine-live.de/trance/mp3-192/stream.sunshine-live.de/", active: true },
];

/** Sender aus der Dashboard-Config (radio_config.json), Fallback: Sunshine-Auswahl. */
export function loadStations(guildId: string): Station[] {
  try {
    if (fs.existsSync(RADIO_CONFIG)) {
      const all = JSON.parse(fs.readFileSync(RADIO_CONFIG, "utf-8"));
      const cfg = all[guildId];
      if (cfg) {
        const customs = Array.isArray(cfg.customStations) ? cfg.customStations : [];
        const defaults = Array.isArray(cfg.stations) && cfg.stations.length > 0 ? cfg.stations : FALLBACK_STATIONS;
        const list = [...defaults, ...customs]
          .filter((s) => s && typeof s.name === "string" && typeof s.url === "string" && /^https?:\/\//i.test(s.url))
          .map((s) => ({ id: String(s.id || s.name), name: s.name.slice(0, 60), url: s.url, active: s.active !== false }));
        if (list.length > 0) return list;
      }
    }
  } catch (e) {
    console.error("[MusicBot] radio_config.json fehlerhaft:", (e as Error).message);
  }
  return FALLBACK_STATIONS;
}

export function loadChannelMap(): Record<string, Record<string, string>> {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {}
  return {};
}

export function saveChannelMap(map: Record<string, Record<string, string>>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STATE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(map, null, 2), "utf-8");
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) {
    console.error("[MusicBot] Kanal-Zuordnung konnte nicht gespeichert werden:", (e as Error).message);
  }
}
