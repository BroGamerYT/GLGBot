import { Events, GuildMember, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { liveStreamService } from "../services/liveStreamService";
import { rulesService } from "../services/rulesService";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const guildMemberUpdateEvent: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  execute: async (client, oldMember, newMember) => {
    // 1. Audit Logging für Nickname & Rollen-Änderungen
    try {
      const oldM = oldMember as GuildMember;
      const newM = newMember as GuildMember;

      // Nickname Änderung
      if (oldM.nickname !== newM.nickname) {
        const auditResult = await fetchAuditExecutor(newM.guild, AuditLogEvent.MemberUpdate, {
          targetId: newM.id,
          maxAgeMs: 5000,
        });

        await auditLogService.log(
          {
            guildId: newM.guild.id,
            category: "member",
            action: "MEMBER_NICK_UPDATE",
            executor: auditResult?.executor || {
              id: newM.user.id,
              tag: newM.user.tag,
              avatar: newM.user.displayAvatarURL(),
            },
            target: {
              id: newM.user.id,
              tag: newM.user.tag,
              name: newM.displayName,
            },
            details: {
              oldNick: oldM.nickname,
              newNick: newM.nickname,
              reason: auditResult?.reason,
            },
          },
          client
        );
      }

      // Rollen-Änderungen
      const addedRoles = newM.roles.cache.filter((r) => !oldM.roles.cache.has(r.id)).map((r) => r.name);
      const removedRoles = oldM.roles.cache.filter((r) => !newM.roles.cache.has(r.id)).map((r) => r.name);

      if (addedRoles.length > 0 || removedRoles.length > 0) {
        const auditResult = await fetchAuditExecutor(newM.guild, AuditLogEvent.MemberRoleUpdate, {
          targetId: newM.id,
          maxAgeMs: 5000,
        });

        await auditLogService.log(
          {
            guildId: newM.guild.id,
            category: "member",
            action: "MEMBER_ROLES_UPDATE",
            executor: auditResult?.executor,
            target: {
              id: newM.user.id,
              tag: newM.user.tag,
              name: newM.displayName,
            },
            details: {
              added: addedRoles,
              removed: removedRoles,
              reason: auditResult?.reason,
            },
          },
          client
        );
      }
    } catch (error) {
      console.error("[GuildMemberUpdate] Fehler beim Audit-Logging:", error);
    }

    try {
      await liveStreamService.handleMemberUpdate(oldMember as GuildMember, newMember as GuildMember);
    } catch (error) {
      console.error("[GuildMemberUpdate Error] Fehler bei LiveStreamService:", error);
    }

    try {
      await rulesService.handleScreeningPassed(oldMember as GuildMember, newMember as GuildMember);
    } catch (error) {
      console.error("[GuildMemberUpdate Error] Fehler beim Regel-Screening:", error);
    }
  },
};

export default guildMemberUpdateEvent;
