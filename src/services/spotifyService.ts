export interface SpotifyTrack {
  title: string;
  artist: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function credentials(): { id: string; secret: string } | null {
  const id = (process.env.SPOTIFY_CLIENT_ID || "").trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || "").trim();
  if (!id || !secret) return null;
  return { id, secret };
}

export function isSpotifyConfigured(): boolean {
  return !!credentials();
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const creds = credentials();
  if (!creds) throw new Error("Spotify ist nicht eingerichtet (SPOTIFY_CLIENT_ID/SECRET in .env).");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Spotify-Login fehlgeschlagen (Credentials prüfen).");
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Spotify-Login fehlgeschlagen.");
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

/** Extrahiert die Playlist-ID aus URL oder roher ID. */
export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

/** Liest Titel + Interpret aus einer öffentlichen Spotify-Playlist (max. `limit`). */
export async function getPlaylistTracks(playlistId: string, limit = 30): Promise<{ name: string; tracks: SpotifyTrack[] }> {
  const token = await accessToken();
  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists(name))),next`;
  let playlistName = "Spotify-Playlist";
  while (url && tracks.length < limit) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) throw new Error("Playlist nicht gefunden (öffentlich freigegeben?).");
    if (!res.ok) throw new Error(`Spotify-Fehler (HTTP ${res.status}).`);
    const data = (await res.json()) as {
      items?: Array<{ track?: { name?: string; artists?: Array<{ name?: string }> } | null }>;
      next?: string | null;
    };
    for (const item of data.items || []) {
      if (tracks.length >= limit) break;
      const t = item.track;
      if (!t?.name) continue;
      tracks.push({ title: t.name, artist: (t.artists || []).map((a) => a.name).filter(Boolean).join(", ") });
    }
    url = data.next || null;
  }
  try {
    const meta = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meta.ok) {
      const j = (await meta.json()) as { name?: string };
      if (j.name) playlistName = j.name;
    }
  } catch {}
  if (tracks.length === 0) throw new Error("Keine Titel in der Playlist gefunden.");
  return { name: playlistName, tracks };
}
