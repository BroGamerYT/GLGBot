import { Events, Sticker, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const stickerDeleteEvent: BotEvent<Events.GuildStickerDelete> = {
  name: Events.GuildStickerDelete,
  execute: async (client, sticker: Sticker) => {
    if (!sticker.guild) return;

    try {
      const auditResult = await fetchAuditExecutor(sticker.guild, AuditLogEvent.StickerDelete, {
        targetId: sticker.id,
        maxAgeMs: 5000,
      });

      await auditLogService.log(
        {
          guildId: sticker.guild.id,
          category: "server",
          action: "STICKER_DELETE",
          executor: auditResult?.executor,
          target: {
            id: sticker.id,
            name: sticker.name,
          },
          details: {
            name: sticker.name,
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[StickerDelete Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default stickerDeleteEvent;
