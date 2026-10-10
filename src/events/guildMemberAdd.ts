import { Events } from "discord.js";
import { BotEvent } from "../types";
import { rulesService } from "../services/rulesService";
import { auditLogService } from "../services/auditLogService";
import { securityService } from "../services/securityService";

const guildMemberAddEvent: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  execute: async (client, member) => {
    // Anti-Raid Überwachung
    await securityService.trackMemberJoin(member.guild, member, client);

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
