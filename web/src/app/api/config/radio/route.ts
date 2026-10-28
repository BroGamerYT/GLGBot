import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getActiveGuildId } from "@/lib/serverGuild";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const MAX_PLAYLISTS_PER_USER = 2;

const DATA_DIR = path.join(process.cwd(), "../data");
const CONFIG_FILE = path.join(DATA_DIR, "radio_config.json");

export interface RadioStation {
  id: string;
  name: string;
  url: string;
  source?: string;
  /** Standard-Voice-Kanal für diesen Sender (optional) */
  channelId?: string;
  /** Nutzerlimit für den Sender-Kanal (0 = unbegrenzt) */
  userLimit?: number;
  /** Deaktivierte Sender werden nicht gestartet */
  active?: boolean;
}

const DEFAULT_STATIONS: RadioStation[] = [
  { id: "soma-groove", name: "SomaFM Groove Salad (werbefrei)", url: "https://ice1.somafm.com/groovesalad-128-mp3", source: "somafm", active: true },
  { id: "soma-deep", name: "SomaFM Deep Space One (werbefrei)", url: "https://ice1.somafm.com/deepspaceone-128-mp3", source: "somafm", active: true },
  { id: "soma-defcon", name: "SomaFM DEF CON Radio (werbefrei)", url: "https://ice1.somafm.com/defcon-128-mp3", source: "somafm", active: true },
  { id: "ssl-edm", name: "SUNSHINE LIVE - EDM", url: "https://stream.sunshine-live.de/edm/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-festival", name: "SUNSHINE LIVE - Festival", url: "https://stream.sunshine-live.de/festival/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-house", name: "SUNSHINE LIVE - House", url: "https://stream.sunshine-live.de/house/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-classics", name: "SUNSHINE LIVE - Classics", url: "https://stream.sunshine-live.de/classics/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-trance", name: "SUNSHINE LIVE - Trance", url: "https://stream.sunshine-live.de/trance/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-lounge", name: "SUNSHINE LIVE - Lounge", url: "https://stream.sunshine-live.de/lounge/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-techno", name: "SUNSHINE LIVE - Techno", url: "https://stream.sunshine-live.de/techno/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "lautfm-hardtekk", name: "Hardtekk Radio", url: "https://stream.laut.fm/hardtekk-radio", source: "laut.fm", active: true },
  { id: "lautfm-chillout", name: "Chillout Radio", url: "https://stream.laut.fm/chillout", source: "laut.fm", active: true },
  { id: "lautfm-house", name: "House Radio", url: "https://stream.laut.fm/house", source: "laut.fm", active: true },
  { id: "lautfm-trap", name: "Trap Radio", url: "https://stream.laut.fm/trap", source: "laut.fm", active: true },
  { id: "lautfm-hiphop", name: "Hip-Hop Radio", url: "https://stream.laut.fm/hiphop", source: "laut.fm", active: true },
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

export interface RadioPlaylist {
  id: string;
  name: string;
  files: string[];
  /** Dashboard-User-ID des Besitzers (max. 2 Playlisten pro Nutzer) */
  ownerId?: string;
}

function sanitizeRel(rel: unknown): string | null {
  if (typeof rel !== "string") return null;
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  for (const p of parts) {
    if (p === "." || p === ".." || p.startsWith(".") || p.includes("..")) return null;
  }
  const file = parts[parts.length - 1];
  if (!/\.(mp3|wav|ogg|m4a)$/i.test(file)) return null;
  return parts.join("/").slice(0, 260);
}

function sanitizePlaylist(p: any, ownerId?: string): RadioPlaylist | null {
  if (!p || typeof p.name !== "string" || !p.name.trim()) return null;
  const files = Array.isArray(p.files)
    ? (p.files as unknown[]).map(sanitizeRel).filter((f: unknown): f is string => !!f).slice(0, 500)
    : [];
  const pl: RadioPlaylist = { id: String(p.id || `pl-${Date.now()}`), name: p.name.slice(0, 60), files };
  // Besitzer nur serverseitig setzen, nie vom Client übernehmen
  const keepOwner = typeof p.ownerId === "string" && p.ownerId ? p.ownerId : undefined;
  if (keepOwner) pl.ownerId = keepOwner.slice(0, 32);
  else if (ownerId) pl.ownerId = ownerId;
  return pl;
}

function sanitizeStation(s: any): RadioStation | null {
  if (!s || typeof s.name !== "string" || typeof s.url !== "string") return null;
  const url = s.url.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    id: String(s.id || `custom-${Date.now()}`),
    name: s.name.slice(0, 60),
    url: url.slice(0, 500),
    source: typeof s.source === "string" ? s.source.slice(0, 40) : undefined,
    channelId: typeof s.channelId === "string" && s.channelId ? s.channelId.slice(0, 32) : undefined,
    userLimit: Number.isFinite(Number(s.userLimit)) ? Math.max(0, Math.min(99, Number(s.userLimit))) : undefined,
    active: s.active === false ? false : true,
  };
}

async function getGuildId() {
  return getActiveGuildId();
}

export async function GET() {
  try {
    const guildId = await getGuildId();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      const cfg = data[guildId];
      if (cfg) {
        const custom = Array.isArray(cfg.customStations) ? cfg.customStations.map(sanitizeStation).filter(Boolean) : [];
        const playlists = Array.isArray(cfg.playlists) ? cfg.playlists.map(sanitizePlaylist).filter(Boolean) : [];
        return NextResponse.json({ botName: cfg.botName || "Radio Bot", stations: DEFAULT_STATIONS, customStations: custom, playlists });
      }
    }
    return NextResponse.json({ stations: DEFAULT_STATIONS, customStations: [], playlists: [], botName: "Radio Bot" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guildId = await getGuildId();
    const body = await req.json();
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    const uid = session?.uid || "";

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let allConfig: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      allConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }

    const customStations = Array.isArray(body.customStations)
      ? body.customStations.map(sanitizeStation).filter(Boolean)
      : [];
    const prevPlaylists: RadioPlaylist[] = Array.isArray(allConfig[guildId]?.playlists)
      ? allConfig[guildId].playlists.map((p: any) => sanitizePlaylist(p)).filter((p: RadioPlaylist | null): p is RadioPlaylist => !!p)
      : [];
    const prevById = new Map(prevPlaylists.map((p) => [p.id, p]));
    const incoming = Array.isArray(body.playlists) ? body.playlists : [];
    // Neue Playlisten bekommen den eingeloggten Nutzer als Besitzer (max. 2 pro Nutzer)
    const freshCount = incoming.filter((p: any) => p && !prevById.has(String(p.id || ""))).length;
    const ownedCount = prevPlaylists.filter((p) => p.ownerId && p.ownerId === uid).length;
    if (uid && ownedCount + freshCount > MAX_PLAYLISTS_PER_USER) {
      return NextResponse.json({ error: `Maximal ${MAX_PLAYLISTS_PER_USER} eigene Playlisten pro Nutzer.` }, { status: 400 });
    }
    const playlists = incoming
      .map((p: any) => {
        const clean = sanitizePlaylist(p);
        if (!clean) return null;
        const prev = prevById.get(clean.id);
        if (prev?.ownerId) clean.ownerId = prev.ownerId;
        else if (uid) clean.ownerId = uid;
        return clean;
      })
      .filter((p: RadioPlaylist | null): p is RadioPlaylist => !!p)
      .slice(0, 20);

    allConfig[guildId] = {
      botName: typeof body.botName === "string" ? body.botName.slice(0, 60) : "Radio Bot",
      stations: DEFAULT_STATIONS,
      customStations,
      playlists,
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true, config: allConfig[guildId] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
