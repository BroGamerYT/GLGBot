import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "radio_config.json");

export interface StoredStation {
  id: string;
  name: string;
  url: string;
  source?: string;
  channelId?: string;
  userLimit?: number;
  active?: boolean;
}

function sanitize(s: any): StoredStation | null {
  if (!s || typeof s.name !== "string" || typeof s.url !== "string") return null;
  const url = s.url.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    id: String(s.id || `custom-${Date.now()}`),
    name: s.name.slice(0, 60),
    url: url.slice(0, 500),
    source: typeof s.source === "string" ? s.source.slice(0, 40) : undefined,
    channelId: typeof s.channelId === "string" && s.channelId ? s.channelId : undefined,
    userLimit: Number.isFinite(Number(s.userLimit)) ? Math.max(0, Math.min(99, Number(s.userLimit))) : undefined,
    active: s.active === false ? false : true,
  };
}

function loadAll(): Record<string, { customStations?: any[] }> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveAll(all: Record<string, unknown>) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  writeJsonAtomic(CONFIG_FILE, all);
}

const BUILTIN_STATIONS: StoredStation[] = [
  // SomaFM
  { id: "soma-groove", name: "SomaFM Groove Salad (werbefrei)", url: "https://ice1.somafm.com/groovesalad-128-mp3", source: "somafm", active: true },
  { id: "soma-deep", name: "SomaFM Deep Space One (werbefrei)", url: "https://ice1.somafm.com/deepspaceone-128-mp3", source: "somafm", active: true },
  { id: "soma-defcon", name: "SomaFM DEF CON Radio (werbefrei)", url: "https://ice1.somafm.com/defcon-128-mp3", source: "somafm", active: true },

  // SUNSHINE LIVE
  { id: "ssl-edm", name: "SUNSHINE LIVE - EDM", url: "https://stream.sunshine-live.de/edm/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-festival", name: "SUNSHINE LIVE - Festival", url: "https://stream.sunshine-live.de/festival/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-house", name: "SUNSHINE LIVE - House", url: "https://stream.sunshine-live.de/house/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-classics", name: "SUNSHINE LIVE - Classics", url: "https://stream.sunshine-live.de/classics/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-trance", name: "SUNSHINE LIVE - Trance", url: "https://stream.sunshine-live.de/trance/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-lounge", name: "SUNSHINE LIVE - Lounge", url: "https://stream.sunshine-live.de/lounge/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-techno", name: "SUNSHINE LIVE - Techno", url: "https://stream.sunshine-live.de/techno/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },

  // Laut.fm
  { id: "lautfm-hardtekk", name: "Hardtekk Radio", url: "https://stream.laut.fm/hardtekk-radio", source: "laut.fm", active: true },
  { id: "lautfm-chillout", name: "Chillout Radio", url: "https://stream.laut.fm/chillout", source: "laut.fm", active: true },
  { id: "lautfm-house", name: "House Radio", url: "https://stream.laut.fm/house", source: "laut.fm", active: true },
  { id: "lautfm-trap", name: "Trap Radio", url: "https://stream.laut.fm/trap", source: "laut.fm", active: true },
  { id: "lautfm-hiphop", name: "Hip-Hop Radio", url: "https://stream.laut.fm/hiphop", source: "laut.fm", active: true },

  // FluxFM
  { id: "flux-live", name: "FluxFM - Live", url: "https://channels.fluxfm.de/FluxFM/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-alternative", name: "FluxFM - Alternative", url: "https://channels.fluxfm.de/alternative/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-indiedisco", name: "FluxFM - Indie Disco", url: "https://channels.fluxfm.de/indiedisco/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-chillhop", name: "FluxFM - Chillhop", url: "https://channels.fluxfm.de/chillhop/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-chillout", name: "FluxFM - Chillout", url: "https://channels.fluxfm.de/chillout-radio/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-elektro", name: "FluxFM - Elektro-Flux", url: "https://channels.fluxfm.de/elektro-flux/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-clubsandwich", name: "FluxFM - Clubsandwich", url: "https://channels.fluxfm.de/clubsandwich/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-soundofberlin", name: "FluxFM - Sound of Berlin", url: "https://channels.fluxfm.de/sound-of-berlin/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-beachhouse", name: "FluxFM - Berlin Beach House", url: "https://channels.fluxfm.de/berlin-beach-house/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-metalfm", name: "FluxFM - Metal FM", url: "https://channels.fluxfm.de/metal-fm/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-xjazz", name: "FluxFM - X-Jazz", url: "https://channels.fluxfm.de/x-jazz/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-80er", name: "FluxFM - 80er", url: "https://channels.fluxfm.de/80s/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-90er", name: "FluxFM - 90er", url: "https://channels.fluxfm.de/90s/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-2000er", name: "FluxFM - 2000er", url: "https://channels.fluxfm.de/2000er/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
];

class RadioStationService {
  listCustom(guildId: string): StoredStation[] {
    const cfg = loadAll()[guildId];
    if (!cfg || !Array.isArray(cfg.customStations)) return [];
    return cfg.customStations.map(sanitize).filter((s): s is StoredStation => !!s);
  }

  /** Standard-Sender (aus Dashboard-Config oder eingebaut) + eigene gespeicherte Sender. */
  listAll(guildId: string): StoredStation[] {
    const customs = this.listCustom(guildId).filter((s) => s.active !== false);
    const cfg = loadAll()[guildId] as { stations?: unknown[] } | undefined;
    if (cfg && Array.isArray(cfg.stations)) {
      const defaults = cfg.stations
        .map(sanitize)
        .filter((s): s is StoredStation => !!s && s.active !== false);
      if (defaults.length > 0) {
        const existingIds = new Set(defaults.map((s) => s.id));
        const missingBuiltins = BUILTIN_STATIONS.filter((b) => !existingIds.has(b.id));
        return [...defaults, ...missingBuiltins, ...customs];
      }
    }
    return [...BUILTIN_STATIONS, ...customs];
  }

  add(guildId: string, name: string, url: string): StoredStation {
    const station = sanitize({ name, url, active: true });
    if (!station) throw new Error("Ungültiger Name oder URL (nur http(s)).");
    const all = loadAll();
    const cfg = all[guildId] || {};
    const list = Array.isArray((cfg as any).customStations) ? (cfg as any).customStations : [];
    if (list.length >= 25) throw new Error("Maximal 25 eigene Sender pro Server.");
    if (list.some((s: any) => s?.url === station.url)) throw new Error("Dieser Sender ist bereits gespeichert.");
    list.push(station);
    (cfg as any).customStations = list;
    all[guildId] = cfg;
    saveAll(all);
    return station;
  }

  remove(guildId: string, query: string): StoredStation | null {
    const all = loadAll();
    const cfg = all[guildId];
    if (!cfg || !Array.isArray((cfg as any).customStations)) return null;
    const list = (cfg as any).customStations as any[];
    const idx = list.findIndex(
      (s) => s?.id === query || s?.name?.toLowerCase() === query.toLowerCase(),
    );
    if (idx < 0) return null;
    const [removed] = list.splice(idx, 1);
    all[guildId] = cfg;
    saveAll(all);
    return removed;
  }
}

export const radioStationService = new RadioStationService();
