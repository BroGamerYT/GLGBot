import { ActivityType, Events } from "discord.js";
import { BotEvent } from "../types";

const readyEvent: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: (client) => {
    if (!client.user) return;
    
    console.log(`\n========================================`);
    console.log(`✅ Bot erfolgreich eingeloggt als ${client.user.tag}!`);
    console.log(`🌐 Aktiv auf ${client.guilds.cache.size} Server(n).`);
    console.log(`========================================\n`);

    client.user.setPresence({
      activities: [{ name: "Community & Security | /help", type: ActivityType.Custom }],
      status: "online",
    });
  },
};

export default readyEvent;
