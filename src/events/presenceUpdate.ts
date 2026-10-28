import { Events, Presence } from "discord.js";
import { BotEvent } from "../types";
import { liveStreamService } from "../services/liveStreamService";
import { moduleService } from "../services/moduleService";

const presenceUpdateEvent: BotEvent<Events.PresenceUpdate> = {
  name: Events.PresenceUpdate,
  execute: async (client, oldPresence, newPresence: Presence) => {
    if (newPresence.guild && !moduleService.isEnabled(newPresence.guild.id, "live")) {
      return;
    }
    try {
      await liveStreamService.handlePresenceUpdate(oldPresence, newPresence);
    } catch (error) {
      console.error("[PresenceUpdate Error] Fehler bei LiveStreamService:", error);
    }
  },
};

export default presenceUpdateEvent;
