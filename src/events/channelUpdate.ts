import { Events, ChannelType, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const channelUpdateEvent: BotEvent<Events.ChannelUpdate> = {
  name: Events.ChannelUpdate,
  execute: async (client, oldChannel, newChannel) => {
    if (!("guild" in newChannel) || !newChannel.guild) return;

    try {
      const oldName = "name" in oldChannel ? (oldChannel as any).name : undefined;
      const newName = "name" in newChannel ? (newChannel as any).name : undefined;
      const oldTopic = "topic" in oldChannel ? (oldChannel as any).topic : undefined;
      const newTopic = "topic" in newChannel ? (newChannel as any).topic : undefined;

      const nameChanged = oldName !== newName ? { old: oldName, new: newName } : undefined;
      const topicChanged = oldTopic !== newTopic ? { old: oldTopic, new: newTopic } : undefined;

      if (!nameChanged && !topicChanged) return;

      const auditResult = await fetchAuditExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, {
        targetId: newChannel.id,
      });

      await auditLogService.log(
        {
          guildId: newChannel.guild.id,
          category: "channel",
          action: "CHANNEL_UPDATE",
          executor: auditResult?.executor,
          target: {
            id: newChannel.id,
            name: newName || "Unbekannt",
          },
          details: {
            type: ChannelType[newChannel.type] || `${newChannel.type}`,
            nameChanged,
            topicChanged,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[ChannelUpdate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default channelUpdateEvent;
