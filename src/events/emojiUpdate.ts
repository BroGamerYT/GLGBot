import { Events, GuildEmoji, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const emojiUpdateEvent: BotEvent<Events.GuildEmojiUpdate> = {
  name: Events.GuildEmojiUpdate,
  execute: async (client, oldEmoji: GuildEmoji, newEmoji: GuildEmoji) => {
    if (oldEmoji.name === newEmoji.name) return;

    try {
      const auditResult = await fetchAuditExecutor(newEmoji.guild, AuditLogEvent.EmojiUpdate, {
        targetId: newEmoji.id,
        maxAgeMs: 5000,
      });

      await auditLogService.log(
        {
          guildId: newEmoji.guild.id,
          category: "server",
          action: "EMOJI_UPDATE",
          executor: auditResult?.executor,
          target: {
            id: newEmoji.id,
            name: newEmoji.name || "Emoji",
          },
          details: {
            oldName: oldEmoji.name,
            newName: newEmoji.name,
            url: newEmoji.imageURL(),
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[EmojiUpdate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default emojiUpdateEvent;
