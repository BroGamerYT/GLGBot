import { Events, GuildEmoji, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const emojiCreateEvent: BotEvent<Events.GuildEmojiCreate> = {
  name: Events.GuildEmojiCreate,
  execute: async (client, emoji: GuildEmoji) => {
    try {
      const auditResult = await fetchAuditExecutor(emoji.guild, AuditLogEvent.EmojiCreate, {
        targetId: emoji.id,
        maxAgeMs: 5000,
      });

      await auditLogService.log(
        {
          guildId: emoji.guild.id,
          category: "server",
          action: "EMOJI_CREATE",
          executor: auditResult?.executor,
          target: {
            id: emoji.id,
            name: emoji.name || "Emoji",
          },
          details: {
            name: emoji.name,
            animated: emoji.animated,
            url: emoji.imageURL(),
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[EmojiCreate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default emojiCreateEvent;
