import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { ACTIVE_GUILD_COOKIE, pickActiveGuild } from "./activeGuild";

/** Aktiver Server für Route-Handler & Server-Komponenten (liest Session + Auswahl-Cookie). */
export async function getActiveGuildId(): Promise<string> {
  const jar = cookies();
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  return pickActiveGuild(session, jar.get(ACTIVE_GUILD_COOKIE)?.value);
}
