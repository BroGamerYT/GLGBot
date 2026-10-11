import { Events } from "discord.js";
import { BotEvent } from "../types";
import { guildAccessService } from "../services/guildAccessService";

/** Bot wurde auf einen Server eingeladen: nur freigegebene Server (max. 5) behalten. */
const guildCreateEvent: BotEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,
  execute: async (client, guild) => {
    await guildAccessService.handleJoin(client, guild).catch((e) => console.error("[GuildAccess] Fehler beim Beitritt:", e));
  },
};

export default guildCreateEvent;
