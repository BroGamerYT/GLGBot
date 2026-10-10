import { Events, GuildMember, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const guildMemberRemoveEvent: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  execute: async (client, member) => {
    try {
      const roles = member.roles?.cache
        ? member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.name)
        : [];

      // Prüfe auf Kick im Audit Log (in den letzten 5 Sekunden)
      const kickLog = await fetchAuditExecutor(member.guild, AuditLogEvent.MemberKick, {
        targetId: member.id,
        maxAgeMs: 5000,
      });

      // Falls kein Kick, prüfe auf Ban
      const banLog = !kickLog
        ? await fetchAuditExecutor(member.guild, AuditLogEvent.MemberBanAdd, {
            targetId: member.id,
            maxAgeMs: 5000,
          })
        : null;

      if (kickLog) {
        await auditLogService.log(
          {
            guildId: member.guild.id,
            category: "member",
            action: "MEMBER_KICK",
            executor: kickLog.executor,
            target: {
              id: member.user.id,
              tag: member.user.tag,
              name: member.displayName,
            },
            details: {
              reason: kickLog.reason || "Keine Begründung angegeben",
              roles,
            },
          },
          client
        );
      } else if (banLog) {
        await auditLogService.log(
          {
            guildId: member.guild.id,
            category: "member",
            action: "MEMBER_BAN",
            executor: banLog.executor,
            target: {
              id: member.user.id,
              tag: member.user.tag,
              name: member.displayName,
            },
            details: {
              reason: banLog.reason || "Keine Begründung angegeben",
              roles,
            },
          },
          client
        );
      } else {
        // Regulärer Austritt
        await auditLogService.log(
          {
            guildId: member.guild.id,
            category: "member",
            action: "MEMBER_LEAVE",
            executor: {
              id: member.user.id,
              tag: member.user.tag,
              avatar: member.user.displayAvatarURL(),
            },
            target: {
              id: member.user.id,
              tag: member.user.tag,
              name: member.displayName,
            },
            details: {
              roles,
              joinedTimestamp: member.joinedTimestamp,
            },
          },
          client
        );
      }
    } catch (error) {
      console.error("[GuildMemberRemove Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default guildMemberRemoveEvent;
