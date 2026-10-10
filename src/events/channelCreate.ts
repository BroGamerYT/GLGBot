import { Events, ChannelType, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const channelCreateEvent: BotEvent<Events.ChannelCreate> = {
  name: Events.ChannelCreate,
  execute: async (client, channel) => {
    if (!("guild" in channel) || !channel.guild) return;

    try {
      const parent = channel.parentId ? channel.guild.channels.cache.get(channel.parentId)?.name : undefined;
      const auditResult = await fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, {
        targetId: channel.id,
      });

      await auditLogService.log(
        {
          guildId: channel.guild.id,
          category: "channel",
          action: "CHANNEL_CREATE",
          executor: auditResult?.executor,
          target: {
            id: channel.id,
            name: channel.name,
          },
          details: {
            type: ChannelType[channel.type] || `${channel.type}`,
            parent,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[ChannelCreate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default channelCreateEvent;
