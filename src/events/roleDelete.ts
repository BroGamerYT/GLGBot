import { Events, Role, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";
import { securityService } from "../services/securityService";

const roleDeleteEvent: BotEvent<Events.GuildRoleDelete> = {
  name: Events.GuildRoleDelete,
  execute: async (client, role: Role) => {
    try {
      const auditResult = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleDelete, {
        targetId: role.id,
      });

      if (auditResult?.executor) {
        await securityService.trackAndCheckNuke(role.guild, auditResult.executor.id, "ROLE_DELETE", client);
      }

      await auditLogService.log(
        {
          guildId: role.guild.id,
          category: "role",
          action: "ROLE_DELETE",
          executor: auditResult?.executor,
          target: {
            id: role.id,
            name: role.name,
          },
          details: {
            color: role.color.toString(16).padStart(6, "0"),
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[RoleDelete Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default roleDeleteEvent;
