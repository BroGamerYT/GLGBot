import { ActivityType, Events } from "discord.js";
import { BotEvent } from "../types";
import { freeGamesService } from "../services/freeGamesService";
import { streamNotificationService } from "../services/streamNotificationService";
import { liveStreamService } from "../services/liveStreamService";
import { backupService } from "../services/backupService";
import { startInternalApi } from "../api/internalApi";
import { gameNewsService } from "../services/gameNewsService";
import { ticketService } from "../services/ticketService";
import { statsService } from "../services/statsService";
import { giveawayService } from "../services/giveawayService";

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

    // Automatischer Snapshot-Scheduler für Server-Backups
    backupService.startAutoBackupSchedule(client);

    // Schnittstelle für das Web-Dashboard (nur lokal erreichbar)
    startInternalApi(client);

    // Live-Rollen & Temp-Kanäle nach dem Neustart abgleichen
    liveStreamService.reconcile(client).catch((e) => console.error("[LiveStream] Fehler beim Abgleich:", e));

    // Game-News (Spiel-Updates & Treiber)
    gameNewsService.startAutoChecker(client);

    // Automatischer Poller für Twitch-Stream Benachrichtigungen
    streamNotificationService.startPoller(client);

    // Dedizierten Support-Kanal prüfen / erstellen
    const guildId = process.env.GUILD_ID;
    const guild = guildId ? client.guilds.cache.get(guildId) : null;
    if (guild) {
      ticketService.ensureSupportChannel(guild).catch((e) => console.error("[TicketService] Fehler beim Support-Kanal Setup:", e));
    }

    // Voice- & Talk-Partner Tracker starten
    statsService.startVoiceTracker(client);

    // Giveaway Scheduler starten
    giveawayService.startScheduler(client);
  },
};

export default readyEvent;

