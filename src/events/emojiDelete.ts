import { Events, GuildEmoji, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const emojiDeleteEvent: BotEvent<Events.GuildEmojiDelete> = {
  name: Events.GuildEmojiDelete,
  execute: async (client, emoji: GuildEmoji) => {
    try {
      const auditResult = await fetchAuditExecutor(emoji.guild, AuditLogEvent.EmojiDelete, {
        targetId: emoji.id,
        maxAgeMs: 5000,
      });

      await auditLogService.log(
        {
          guildId: emoji.guild.id,
          category: "server",
          action: "EMOJI_DELETE",
          executor: auditResult?.executor,
          target: {
            id: emoji.id,
            name: emoji.name || "Emoji",
          },
          details: {
            name: emoji.name,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[EmojiDelete Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default emojiDeleteEvent;
