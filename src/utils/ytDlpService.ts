import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export interface YtVideoResult {
  title: string;
  url: string; // Direkter Audio-Stream-Link
  webpageUrl: string; // Originale YouTube-Video-URL
  thumbnail: string;
  duration: string;
  durationSeconds: number;
}

export interface YtPlaylistItem {
  id: string;
  title: string;
  duration: string;
  url: string;
}

export interface YtPlaylistResult {
  title: string;
  items: YtPlaylistItem[];
}

/**
 * Ermittelt den Pfad zur yt-dlp-Binärdatei.
 */
export function getYtDlpPath(): string {
  if (process.platform === "win32") {
    const localExe = path.join(process.cwd(), "bin", "yt-dlp.exe");
    if (fs.existsSync(localExe)) return localExe;
    return "yt-dlp";
  }

  // Linux / macOS: System-Pfad zuerst (wurde dort als Linux ELF installiert)
  if (fs.existsSync("/usr/local/bin/yt-dlp")) return "/usr/local/bin/yt-dlp";
  if (fs.existsSync("/usr/bin/yt-dlp")) return "/usr/bin/yt-dlp";

  const localBin = path.join(process.cwd(), "bin", "yt-dlp");
  if (fs.existsSync(localBin)) return localBin;

  return "yt-dlp";
}

/**
 * Prüft, ob es sich um eine YouTube-URL handelt.
 */
export function isYouTubeUrl(raw: string): boolean {
  try {
    const trimmed = raw.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    const u = new URL(trimmed);
    return /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Prüft, ob die URL auf einen YouTube-KANAL zeigt (und nicht auf ein Video).
 *
 * Wichtig, weil yt-dlp bei einem Kanal-Link sonst den kompletten Kanal durchgeht -
 * bei großen Kanälen dauert das Minuten und läuft in den Timeout. `--no-playlist`
 * hilft dabei nicht, das greift nur bei Playlists.
 */
export function isYouTubeChannelUrl(raw: string): boolean {
  try {
    const trimmed = raw.trim();
    if (!isYouTubeUrl(trimmed)) return false;
    const p = new URL(trimmed).pathname;
    // Ein Video unter einem Handle (/@name/video-id) ist KEIN Kanal-Link
    if (/\/(watch|shorts|live|embed|v)\//i.test(p) || /^\/watch$/i.test(p)) return false;
    return /^\/(channel\/|c\/|user\/|@)/i.test(p);
  } catch {
    return false;
  }
}

/**
 * Macht aus einem Kanal-Link die Basis-Adresse ohne angehängten Reiter
 * (…/videos, …/live, …/streams, …/featured).
 */
export function channelBaseUrl(raw: string): string {
  const u = new URL(raw.trim());
  const clean = u.pathname.replace(/\/(videos|live|streams|featured|shorts|playlists|community)\/?$/i, "");
  return `${u.origin}${clean.replace(/\/+$/, "")}`;
}

/**
 * Prüft, ob es sich um eine reine YouTube-Playlist-URL handelt.
 */
export function isYouTubePlaylistUrl(raw: string): boolean {
  try {
    const trimmed = raw.trim();
    if (!isYouTubeUrl(trimmed)) return false;
    const u = new URL(trimmed);
    const listId = u.searchParams.get("list");
    if (!listId || listId.startsWith("RD")) return false;
    return u.pathname.includes("/playlist") || (!u.searchParams.has("v") && !u.pathname.includes("/watch"));
  } catch {
    return false;
  }
}

/**
 * Extrahiert die Playlist-ID aus einer YouTube-URL.
 */
export function extractPlaylistId(raw: string): string | null {
  try {
    const trimmed = raw.trim();
    if (!isYouTubeUrl(trimmed)) return null;
    const u = new URL(trimmed);
    const list = u.searchParams.get("list");
    if (!list || list.startsWith("RD") || list.startsWith("UL")) return null;
    return list;
  } catch {
    return null;
  }
}

/**
 * Extrahiert eine saubere 11-stellige YouTube-Video-ID.
 */
export function extractVideoId(raw: string): string | null {
  try {
    const trimmed = raw.trim();
    const m = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i,
    );
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Löst ein einzelnes YouTube-Video auf und extrahiert den direkten Audio-Stream-Link.
 */
export function resolveVideo(
  urlOrId: string,
  options: { timeoutMs?: number; extraArgs?: string[] } = {}
): Promise<YtVideoResult> {
  return new Promise((resolve, reject) => {
    const targetUrl = urlOrId.startsWith("http")
      ? urlOrId
      : `https://www.youtube.com/watch?v=${urlOrId}`;

    const bin = getYtDlpPath();
    const args = ["--no-playlist", "--no-warnings", ...(options.extraArgs || []), "-j", "-f", "bestaudio/best", targetUrl];
    const cp = spawn(bin, args, {
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try {
        cp.kill();
      } catch {}
      reject(new Error("Timeout beim Laden des YouTube-Videos."));
    }, options.timeoutMs ?? 20_000);

    cp.stdout.on("data", (d) => (stdout += d));
    cp.stderr.on("data", (d) => (stderr += d));

    cp.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `yt-dlp beendet mit Fehlercode ${code}`));
      }
      try {
        // yt-dlp gibt pro Treffer eine eigene JSON-Zeile aus. Bei mehreren Zeilen
        // würde JSON.parse über das Gesamt-Ergebnis scheitern - darum nur die erste nehmen.
        const firstLine = stdout.split("\n").find((l) => l.trim().startsWith("{"));
        if (!firstLine) throw new Error("yt-dlp hat keine Video-Daten geliefert.");
        const data = JSON.parse(firstLine);
        const streamUrl = data.url;
        if (!streamUrl) throw new Error("Kein Audio-Stream gefunden.");

        const sec = typeof data.duration === "number" ? data.duration : 0;
        const durStr = data.duration_string || formatDuration(sec);

        resolve({
          title: data.title || data.fulltitle || "YouTube-Audio",
          url: streamUrl,
          webpageUrl: data.webpage_url || targetUrl,
          thumbnail: data.thumbnail || (data.thumbnails?.[0]?.url ?? ""),
          duration: durStr,
          durationSeconds: sec,
        });
      } catch (e: any) {
        reject(new Error(`Fehler beim Parsen der Video-Metadaten: ${e.message}`));
      }
    });

    cp.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Löst einen YouTube-KANAL-Link auf.
 *
 * Reihenfolge: läuft gerade ein Livestream, wird der genommen - sonst das neueste Video.
 * Beides mit `--playlist-end 1`, damit nicht der ganze Kanal durchsucht wird.
 */
export async function resolveChannelLatest(
  raw: string
): Promise<{ video: YtVideoResult; wasLive: boolean }> {
  const base = channelBaseUrl(raw);

  // 1. Läuft gerade ein Stream? (/live leitet auf den laufenden Stream weiter)
  try {
    const live = await resolveVideo(`${base}/live`, { timeoutMs: 15_000, extraArgs: ["--playlist-end", "1"] });
    return { video: live, wasLive: true };
  } catch {
    // Nicht live - weiter mit dem neuesten Video
  }

  // 2. Neuestes Video des Kanals
  try {
    const latest = await resolveVideo(`${base}/videos`, {
      timeoutMs: 25_000,
      extraArgs: ["--playlist-end", "1"],
    });
    return { video: latest, wasLive: false };
  } catch (e: any) {
    throw new Error(
      `Der Kanal konnte nicht gelesen werden (${e?.message || "unbekannter Fehler"}). ` +
        "Bitte den Link zu einem einzelnen Video statt zum Kanal verwenden."
    );
  }
}

/**
 * Löst eine YouTube-Playlist auf (bis zu `limit` Einträge).
 */
export function resolvePlaylist(urlOrListId: string, limit = 50): Promise<YtPlaylistResult> {
  return new Promise((resolve, reject) => {
    const playlistUrl = urlOrListId.startsWith("http")
      ? urlOrListId
      : `https://www.youtube.com/playlist?list=${urlOrListId}`;

    const bin = getYtDlpPath();
    const cp = spawn(
      bin,
      [
        "--flat-playlist",
        "--playlist-items",
        `1:${limit}`,
        "--no-warnings",
        "-j",
        playlistUrl,
      ],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try {
        cp.kill();
      } catch {}
      reject(new Error("Timeout beim Laden der YouTube-Playlist."));
    }, 25_000);

    cp.stdout.on("data", (d) => (stdout += d));
    cp.stderr.on("data", (d) => (stderr += d));

    cp.on("close", async (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        // Fallback: Direkter HTML Scrape
        try {
          const direct = await scrapePlaylistDirect(playlistUrl, limit);
          return resolve(direct);
        } catch {
          return reject(new Error(stderr.trim() || `yt-dlp beendet mit Fehlercode ${code}`));
        }
      }

      try {
        const lines = stdout.trim().split("\n").filter(Boolean);
        const items: YtPlaylistItem[] = [];
        let playlistTitle = "YouTube-Playlist";

        for (const line of lines) {
          try {
            const d = JSON.parse(line);
            if (d.playlist_title) playlistTitle = d.playlist_title;
            else if (d.playlist) playlistTitle = d.playlist;

            const id = d.id;
            if (id) {
              items.push({
                id,
                title: d.title || `Video ${id}`,
                duration: d.duration_string || formatDuration(d.duration || 0),
                url: `https://www.youtube.com/watch?v=${id}`,
              });
            }
          } catch {}
        }

        if (items.length === 0) {
          const direct = await scrapePlaylistDirect(playlistUrl, limit);
          return resolve(direct);
        }

        resolve({ title: playlistTitle, items });
      } catch (e: any) {
        reject(e);
      }
    });

    cp.on("error", async () => {
      clearTimeout(timer);
      try {
        const direct = await scrapePlaylistDirect(playlistUrl, limit);
        resolve(direct);
      } catch (e: any) {
        reject(e);
      }
    });
  });
}

/**
 * Fallback: Liest Playlist direkt aus dem YouTube-HTML aus.
 */
async function scrapePlaylistDirect(playlistUrl: string, limit: number): Promise<YtPlaylistResult> {
  const res = await fetch(playlistUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`YouTube antwortete mit HTTP ${res.status}`);
  const text = await res.text();

  const titleMatch = text.match(/<title>(.*?)(?: - YouTube)?<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/i, "").trim() : "YouTube-Playlist";

  const matches = text.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
  const uniqueIds = [...new Set(matches.map((m) => m.split("=")[1]))].slice(0, limit);

  if (uniqueIds.length === 0) {
    throw new Error("Keine Videos in der Playlist gefunden.");
  }

  const items: YtPlaylistItem[] = uniqueIds.map((id) => ({
    id,
    title: `YouTube Video (${id})`,
    duration: "Live",
    url: `https://www.youtube.com/watch?v=${id}`,
  }));

  return { title, items };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "Live";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
