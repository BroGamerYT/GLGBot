import { Events, Presence } from "discord.js";
import { BotEvent } from "../types";
import { liveStreamService } from "../services/liveStreamService";

const presenceUpdateEvent: BotEvent<Events.PresenceUpdate> = {
  name: Events.PresenceUpdate,
  execute: async (client, oldPresence, newPresence: Presence) => {
    try {
      await liveStreamService.handlePresenceUpdate(oldPresence, newPresence);
    } catch (error) {
      console.error("[PresenceUpdate Error] Fehler bei LiveStreamService:", error);
    }
  },
};

export default presenceUpdateEvent;
