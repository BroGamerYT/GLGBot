import { Events } from "discord.js";
import { BotEvent } from "../types";
import { rulesService } from "../services/rulesService";
import { auditLogService } from "../services/auditLogService";
import { securityService } from "../services/securityService";
import { prisonService } from "../services/prisonService";
import { blacklistService } from "../services/blacklistService";

const guildMemberAddEvent: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  execute: async (client, member) => {
    // Anti-Raid Überwachung
    await securityService.trackMemberJoin(member.guild, member, client);

    // Anti-Prison-Evade: Falls Mitglied geflohen ist und neu beitritt, Gefängnis wieder zuweisen
    if (prisonService.isImprisoned(member.guild.id, member.id)) {
      const prisonRole = await prisonService.ensurePrisonRole(member.guild);
      await member.roles.add(prisonRole, "Gefängnisstrafe fortgesetzt (Anti-Prison-Evade)").catch(() => null);
    }

    // Schlechte Namen Prüfung bei Beitritt
    const badName = blacklistService.isBadName(member.guild.id, member.displayName);
    if (badName.isBad && !member.user.bot) {
      await blacklistService.moderateBadName(member.guild, member, client.user || member.user, client);
    }

    try {
      await auditLogService.log(
        {
          guildId: member.guild.id,
          category: "member",
          action: "MEMBER_JOIN",
          executor: {
            id: member.user.id,
            tag: member.user.tag,
            avatar: member.user.displayAvatarURL(),
          },
          details: {
            createdAt: member.user.createdAt.toLocaleDateString("de-DE"),
            memberCount: member.guild.memberCount,
          },
        },
        client
      );
    } catch (e) {
      console.error("[GuildMemberAdd] Fehler beim Audit-Logging:", e);
    }

    if (member.user.bot) return;

    try {
      await rulesService.sendWelcomeDM(member);
    } catch (error) {
      console.error("[GuildMemberAdd] Fehler beim Senden der Willkommens-DM:", error);
    }
  },
};

export default guildMemberAddEvent;
