import { Events, Message } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";

const messageDeleteEvent: BotEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,
  execute: async (client, message) => {
    if (!message.guild) return;

    try {
      const attachments = message.attachments?.map((a) => ({
        name: a.name,
        url: a.url,
        contentType: a.contentType,
      })) || [];

      await auditLogService.log(
        {
          guildId: message.guild.id,
          category: "message",
          action: "MESSAGE_DELETE",
          executor: message.author
            ? {
                id: message.author.id,
                tag: message.author.tag,
                avatar: message.author.displayAvatarURL(),
              }
            : undefined,
          details: {
            messageId: message.id,
            channelId: message.channelId,
            channelName: "name" in message.channel ? (message.channel as any).name : undefined,
            content: message.content || null,
            attachments,
            createdTimestamp: message.createdTimestamp,
          },
        },
        client
      );
    } catch (error) {
      console.error("[MessageDelete Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default messageDeleteEvent;
