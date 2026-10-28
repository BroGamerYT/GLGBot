import { fetchBotGuilds } from "./guilds";

/**
 * Prüft, ob ein Discord-Nutzer das Dashboard benutzen darf (pro Server).
 * Nur serverseitig verwenden (braucht den Bot-Token).
 *
 * Zugriff haben:
 *  - der Server-Owner
 *  - Mitglieder mit "Administrator" oder "Server verwalten"
 *  - Mitglieder mit einer Rolle aus DASHBOARD_ROLE_IDS (kommagetrennt, optional)
 *  - Nutzer aus DASHBOARD_USER_IDS (kommagetrennt, optional, gilt für alle freigegebenen Server)
 */

const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);

function idList(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type AccessResult =
  | { allowed: true; reason: string }
  | { allowed: false; reason: "not_member" | "no_permission" | "config_error" };

/** Prüft den Zugriff für EINEN Server. */
export async function checkGuildAccess(userId: string, guildId: string): Promise<AccessResult> {
  const token = process.env.DISCORD_TOKEN;
  if (!token || !guildId) return { allowed: false, reason: "config_error" };

  if (idList(process.env.DASHBOARD_USER_IDS).includes(userId)) {
    return { allowed: true, reason: "user_whitelist" };
  }

  const headers = { Authorization: `Bot ${token}` };

  const [guildRes, memberRes, rolesRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { headers, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, cache: "no-store" }),
  ]);

  if (memberRes.status === 404) return { allowed: false, reason: "not_member" };
  if (!guildRes.ok || !memberRes.ok || !rolesRes.ok) return { allowed: false, reason: "config_error" };

  const guild = await guildRes.json();
  const member = await memberRes.json();
  const roles: { id: string; permissions: string }[] = await rolesRes.json();

  if (guild.owner_id === userId) return { allowed: true, reason: "owner" };

  const memberRoleIds: string[] = member.roles || [];
  const allowedRoles = idList(process.env.DASHBOARD_ROLE_IDS);
  if (memberRoleIds.some((id) => allowedRoles.includes(id))) {
    return { allowed: true, reason: "role_whitelist" };
  }

  // Rechte aus @everyone (Rollen-ID = Guild-ID) + allen Rollen des Mitglieds zusammenrechnen
  let perms = BigInt(0);
  for (const role of roles) {
    if (role.id === guildId || memberRoleIds.includes(role.id)) {
      perms |= BigInt(role.permissions);
    }
  }

  if ((perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
    return { allowed: true, reason: "permissions" };
  }

  return { allowed: false, reason: "no_permission" };
}

export type DashboardAccess =
  | { allowed: true; reason: string; guilds: string[] }
  | { allowed: false; reason: "not_member" | "no_permission" | "config_error"; guilds: string[] };

/**
 * Multi-Guild: prüft alle freigegebenen Server (max. 5), auf denen der Bot ist.
 * Ergebnis: Liste der Server, die der Nutzer verwalten darf. Zugriff, wenn mindestens einer.
 * Ist der Bot nicht erreichbar, wird nur der Haupt-Server (GUILD_ID) geprüft.
 */
export async function checkDashboardAccess(userId: string): Promise<DashboardAccess> {
  const main = (process.env.GUILD_ID || "").trim();
  const botGuilds = await fetchBotGuilds();
  const ids = botGuilds && botGuilds.length > 0 ? botGuilds.map((g) => g.id) : main ? [main] : [];
  if (ids.length === 0) return { allowed: false, reason: "config_error", guilds: [] };

  const results = await Promise.all(ids.map((id) => checkGuildAccess(userId, id).catch(() => ({ allowed: false as const, reason: "config_error" as const }))));
  const guilds = ids.filter((_, i) => results[i].allowed);
  if (guilds.length > 0) {
    const first = results.find((r) => r.allowed)!;
    return { allowed: true, reason: first.reason, guilds };
  }
  // Grund für die Ablehnung: Störung hat Vorrang (dann nicht aussperren), sonst keine Rechte / kein Mitglied
  const reasons = results.map((r) => r.reason);
  const reason = reasons.includes("config_error")
    ? "config_error"
    : reasons.includes("no_permission")
      ? "no_permission"
      : "not_member";
  return { allowed: false, reason: reason as any, guilds: [] };
}
