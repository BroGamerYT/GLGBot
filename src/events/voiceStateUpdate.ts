import { Events, VoiceState } from "discord.js";
import { BotEvent } from "../types";
import { tempVoiceService } from "../services/tempVoiceService";

const voiceStateUpdateEvent: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  execute: async (client, oldState: VoiceState, newState: VoiceState) => {
    try {
      await tempVoiceService.handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
      console.error("[VoiceStateUpdate Error] Fehler in handleVoiceStateUpdate:", error);
    }
  },
};

export default voiceStateUpdateEvent;
