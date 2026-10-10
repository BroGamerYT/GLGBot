import { Events, Role, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const roleUpdateEvent: BotEvent<Events.GuildRoleUpdate> = {
  name: Events.GuildRoleUpdate,
  execute: async (client, oldRole: Role, newRole: Role) => {
    try {
      const nameChanged = oldRole.name !== newRole.name ? { old: oldRole.name, new: newRole.name } : undefined;
      const colorChanged = oldRole.color !== newRole.color
        ? {
            old: oldRole.color.toString(16).padStart(6, "0"),
            new: newRole.color.toString(16).padStart(6, "0"),
          }
        : undefined;
      const permsChanged = oldRole.permissions.bitfield !== newRole.permissions.bitfield;

      if (!nameChanged && !colorChanged && !permsChanged) return;

      const auditResult = await fetchAuditExecutor(newRole.guild, AuditLogEvent.RoleUpdate, {
        targetId: newRole.id,
      });

      await auditLogService.log(
        {
          guildId: newRole.guild.id,
          category: "role",
          action: "ROLE_UPDATE",
          executor: auditResult?.executor,
          target: {
            id: newRole.id,
            name: newRole.name,
          },
          details: {
            nameChanged,
            colorChanged,
            permsChanged,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[RoleUpdate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default roleUpdateEvent;
