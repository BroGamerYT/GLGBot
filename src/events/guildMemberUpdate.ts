import { Events, GuildMember } from "discord.js";
import { BotEvent } from "../types";
import { liveStreamService } from "../services/liveStreamService";

const guildMemberUpdateEvent: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  execute: async (client, oldMember, newMember) => {
    try {
      await liveStreamService.handleMemberUpdate(oldMember as GuildMember, newMember as GuildMember);
    } catch (error) {
      console.error("[GuildMemberUpdate Error] Fehler bei LiveStreamService:", error);
    }
  },
};

export default guildMemberUpdateEvent;
