/**
 * Prüft, ob ein Discord-Nutzer das Dashboard benutzen darf.
 * Nur serverseitig verwenden (braucht den Bot-Token).
 *
 * Zugriff haben:
 *  - der Server-Owner
 *  - Mitglieder mit "Administrator" oder "Server verwalten"
 *  - Mitglieder mit einer Rolle aus DASHBOARD_ROLE_IDS (kommagetrennt, optional)
 *  - Nutzer aus DASHBOARD_USER_IDS (kommagetrennt, optional)
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

export async function checkDashboardAccess(userId: string): Promise<AccessResult> {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
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
