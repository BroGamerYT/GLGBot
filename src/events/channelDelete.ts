import { Events, ChannelType, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";
import { securityService } from "../services/securityService";

const channelDeleteEvent: BotEvent<Events.ChannelDelete> = {
  name: Events.ChannelDelete,
  execute: async (client, channel) => {
    if (!("guild" in channel) || !channel.guild) return;

    try {
      const channelName = "name" in channel ? (channel as any).name : "Unbekannt";
      const auditResult = await fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, {
        targetId: channel.id,
      });

      if (auditResult?.executor) {
        await securityService.trackAndCheckNuke(channel.guild, auditResult.executor.id, "CHANNEL_DELETE", client);
      }

      await auditLogService.log(
        {
          guildId: channel.guild.id,
          category: "channel",
          action: "CHANNEL_DELETE",
          executor: auditResult?.executor,
          target: {
            id: channel.id,
            name: channelName,
          },
          details: {
            type: ChannelType[channel.type] || `${channel.type}`,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[ChannelDelete Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default channelDeleteEvent;
