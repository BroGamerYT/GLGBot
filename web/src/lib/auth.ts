/**
 * Session-Handling für das Dashboard (Discord OAuth2).
 *
 * Läuft sowohl in der Middleware (Edge Runtime) als auch in API-Routen (Node),
 * deshalb nur Web-Crypto (crypto.subtle) und keine Node-Module.
 *
 * Die Session ist ein signiertes Cookie: base64url(JSON) + "." + HMAC-SHA256.
 * Ohne SESSION_SECRET kann niemand eine gültige Session fälschen.
 */

export const SESSION_COOKIE = "glg_session";
export const STATE_COOKIE = "glg_oauth_state";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 Stunden

export interface Session {
  uid: string; // Discord User-ID
  name: string; // Anzeigename
  avatar: string | null; // Avatar-Hash
  exp: number; // Ablauf (Unix-Sekunden)
}

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  // Mindestlänge erzwingen – ein kurzes Secret wäre per Brute-Force knackbar
  return s && s.length >= 32 ? s : null;
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionToken(data: Omit<Session, "exp">): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  const session: Session = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const payload = b64url(encoder.encode(JSON.stringify(session)));
  const sig = b64url(await hmac(payload, secret));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null; // Fail closed: ohne Secret ist niemand eingeloggt

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  try {
    const expected = await hmac(payload, secret);
    if (!timingSafeEqual(expected, fromB64url(sig))) return null;

    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    if (!session.uid || typeof session.exp !== "number") return null;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

/** Basis-URL des Dashboards (z. B. https://glgbot.brogameryt.de) – wichtig hinter Caddy. */
export function getBaseUrl(fallbackOrigin: string): string {
  return (process.env.DASHBOARD_URL || fallbackOrigin).replace(/\/+$/, "");
}

export function isSecureUrl(url: string): boolean {
  return url.startsWith("https://");
}
