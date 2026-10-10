import { Events, Sticker, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

const stickerCreateEvent: BotEvent<Events.GuildStickerCreate> = {
  name: Events.GuildStickerCreate,
  execute: async (client, sticker: Sticker) => {
    if (!sticker.guild) return;

    try {
      const auditResult = await fetchAuditExecutor(sticker.guild, AuditLogEvent.StickerCreate, {
        targetId: sticker.id,
        maxAgeMs: 5000,
      });

      await auditLogService.log(
        {
          guildId: sticker.guild.id,
          category: "server",
          action: "STICKER_CREATE",
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
      console.error("[StickerCreate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default stickerCreateEvent;
