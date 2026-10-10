import { Events, Message } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { securityService } from "../services/securityService";

const messageUpdateEvent: BotEvent<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  execute: async (client, oldMessage, newMessage) => {
    // Wenn es ein Bot ist oder nicht im Server
    if (newMessage.author?.bot) return;
    if (!newMessage.guild) return;

    // Phishing-Schutz auch bei bearbeiteten Nachrichten
    const isPhishing = await securityService.handlePhishingMessage(newMessage as Message, client);
    if (isPhishing) return;

    // Nur loggen, wenn sich der Text tatsächlich geändert hat (z. B. nicht nur Embeds nachgeladen)
    if (oldMessage.content === newMessage.content) return;

    try {
      await auditLogService.log(
        {
          guildId: newMessage.guild.id,
          category: "message",
          action: "MESSAGE_UPDATE",
          executor: newMessage.author
            ? {
                id: newMessage.author.id,
                tag: newMessage.author.tag,
                avatar: newMessage.author.displayAvatarURL(),
              }
            : undefined,
          details: {
            messageId: newMessage.id,
            channelId: newMessage.channelId,
            channelName: "name" in newMessage.channel ? (newMessage.channel as any).name : undefined,
            oldContent: oldMessage.content || null,
            newContent: newMessage.content || null,
            url: newMessage.url,
          },
        },
        client
      );
    } catch (error) {
      console.error("[MessageUpdate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default messageUpdateEvent;
