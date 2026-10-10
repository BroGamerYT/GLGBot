import { ActivityType, Events } from "discord.js";
import { BotEvent } from "../types";
import { freeGamesService } from "../services/freeGamesService";
import { streamNotificationService } from "../services/streamNotificationService";

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

    // Automatischer Benachrichtigungsdienst für Gratis-Spiele
    freeGamesService.startAutoChecker(client);

    // Automatischer Poller für Twitch-Stream Benachrichtigungen
    streamNotificationService.startPoller(client);
  },
};

export default readyEvent;

