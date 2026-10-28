import type { Session } from "./auth";

/** Cookie mit dem im Dashboard gewählten Server (Multi-Guild). */
export const ACTIVE_GUILD_COOKIE = "glg_guild";

/**
 * Aktiver Server: gewählter Server, wenn der Nutzer ihn nutzen/verwalten darf,
 * sonst der erste erlaubte Server, sonst der Haupt-Server (GUILD_ID).
 */
export function pickActiveGuild(session: Session | null, cookieValue?: string | null): string {
  const main = (process.env.GUILD_ID || "").trim();
  const envAllowed = (process.env.ALLOWED_GUILD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allAllowed = Array.from(new Set([main, ...envAllowed])).filter(Boolean);

  const userAllowed = session?.g?.length ? session.g : [];

  if (cookieValue) {
    // Wenn eingeloggt: muss in den erlaubten Servern des Nutzers sein
    if (userAllowed.length > 0 && userAllowed.includes(cookieValue)) return cookieValue;
    // Wenn Gast: muss in den Bot-Servern sein
    if (userAllowed.length === 0 && (allAllowed.length === 0 || allAllowed.includes(cookieValue))) return cookieValue;
  }

  if (userAllowed.length > 0) return userAllowed[0];
  if (main) return main;
  return allAllowed[0] || "";
}
