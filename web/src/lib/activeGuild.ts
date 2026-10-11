import type { Session } from "./auth";

/** Cookie mit dem im Dashboard gewählten Server (Multi-Guild). */
export const ACTIVE_GUILD_COOKIE = "glg_guild";

/**
 * Aktiver Server: gewählter Server, wenn der Nutzer ihn verwalten darf,
 * sonst der erste erlaubte Server, sonst der Haupt-Server (GUILD_ID).
 */
export function pickActiveGuild(session: Session | null, cookieValue?: string | null): string {
  const main = (process.env.GUILD_ID || "").trim();
  const allowed = session?.g?.length ? session.g : main ? [main] : [];
  if (cookieValue && allowed.includes(cookieValue)) return cookieValue;
  if (main && allowed.includes(main)) return main;
  return allowed[0] || main;
}
