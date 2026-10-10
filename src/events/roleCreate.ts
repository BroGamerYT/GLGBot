import { Events, Role, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const roleCreateEvent: BotEvent<Events.GuildRoleCreate> = {
  name: Events.GuildRoleCreate,
  execute: async (client, role: Role) => {
    try {
      const auditResult = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleCreate, {
        targetId: role.id,
      });

      await auditLogService.log(
        {
          guildId: role.guild.id,
          category: "role",
          action: "ROLE_CREATE",
          executor: auditResult?.executor,
          target: {
            id: role.id,
            name: role.name,
          },
          details: {
            color: role.color.toString(16).padStart(6, "0"),
            hoist: role.hoist,
            mentionable: role.mentionable,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[RoleCreate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default roleCreateEvent;
