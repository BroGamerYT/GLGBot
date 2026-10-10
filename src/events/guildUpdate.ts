import { Events, Guild, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";

interface SettingDiff {
  label: string;
  setting: string;
  oldValue: string;
  newValue: string;
}

const guildUpdateEvent: BotEvent<Events.GuildUpdate> = {
  name: Events.GuildUpdate,
  execute: async (client, oldGuild: Guild, newGuild: Guild) => {
    try {
      const changes: SettingDiff[] = [];

      // 1. Server-Name
      if (oldGuild.name !== newGuild.name) {
        changes.push({
          label: "Server-Name",
          setting: "name",
          oldValue: oldGuild.name,
          newValue: newGuild.name,
        });
      }

      // 2. Server-Icon
      if (oldGuild.icon !== newGuild.icon) {
        changes.push({
          label: "Server-Icon",
          setting: "icon",
          oldValue: oldGuild.icon ? "Bisheriges Icon" : "Kein Icon",
          newValue: newGuild.icon ? "Neues Icon hochgeladen" : "Icon entfernt",
        });
      }

      // 3. Server-Banner
      if (oldGuild.banner !== newGuild.banner) {
        changes.push({
          label: "Server-Banner",
          setting: "banner",
          oldValue: oldGuild.banner ? "Bisheriges Banner" : "Kein Banner",
          newValue: newGuild.banner ? "Neues Banner hochgeladen" : "Banner entfernt",
        });
      }

      // 4. Server-Splash
      if (oldGuild.splash !== newGuild.splash) {
        changes.push({
          label: "Einladungs-Hintergrund",
          setting: "splash",
          oldValue: oldGuild.splash ? "Bisheriger Hintergrund" : "Keiner",
          newValue: newGuild.splash ? "Neuer Hintergrund" : "Entfernt",
        });
      }

      // 5. Server-Beschreibung
      if (oldGuild.description !== newGuild.description) {
        changes.push({
          label: "Server-Beschreibung",
          setting: "description",
          oldValue: oldGuild.description || "*Keine*",
          newValue: newGuild.description || "*Keine*",
        });
      }

      // 6. AFK-Kanal
      if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
        const oldName = oldGuild.afkChannelId ? oldGuild.channels.cache.get(oldGuild.afkChannelId)?.name || oldGuild.afkChannelId : "Keiner";
        const newName = newGuild.afkChannelId ? newGuild.channels.cache.get(newGuild.afkChannelId)?.name || newGuild.afkChannelId : "Keiner";
        changes.push({
          label: "AFK-Sprachkanal",
          setting: "afkChannel",
          oldValue: `#${oldName}`,
          newValue: `#${newName}`,
        });
      }

      // 7. AFK-Timeout
      if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
        changes.push({
          label: "AFK-Timeout",
          setting: "afkTimeout",
          oldValue: `${Math.round(oldGuild.afkTimeout / 60)} Min.`,
          newValue: `${Math.round(newGuild.afkTimeout / 60)} Min.`,
        });
      }

      // 8. System-Nachrichten-Kanal
      if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
        const oldName = oldGuild.systemChannelId ? oldGuild.channels.cache.get(oldGuild.systemChannelId)?.name || oldGuild.systemChannelId : "Keiner";
        const newName = newGuild.systemChannelId ? newGuild.channels.cache.get(newGuild.systemChannelId)?.name || newGuild.systemChannelId : "Keiner";
        changes.push({
          label: "System-Kanal",
          setting: "systemChannel",
          oldValue: `#${oldName}`,
          newValue: `#${newName}`,
        });
      }

      // 9. Regelwerk-Kanal
      if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
        const oldName = oldGuild.rulesChannelId ? oldGuild.channels.cache.get(oldGuild.rulesChannelId)?.name || oldGuild.rulesChannelId : "Keiner";
        const newName = newGuild.rulesChannelId ? newGuild.channels.cache.get(newGuild.rulesChannelId)?.name || newGuild.rulesChannelId : "Keiner";
        changes.push({
          label: "Regelwerk-Kanal",
          setting: "rulesChannel",
          oldValue: `#${oldName}`,
          newValue: `#${newName}`,
        });
      }

      // 10. Community-Updates-Kanal
      if (oldGuild.publicUpdatesChannelId !== newGuild.publicUpdatesChannelId) {
        const oldName = oldGuild.publicUpdatesChannelId ? oldGuild.channels.cache.get(oldGuild.publicUpdatesChannelId)?.name || oldGuild.publicUpdatesChannelId : "Keiner";
        const newName = newGuild.publicUpdatesChannelId ? newGuild.channels.cache.get(newGuild.publicUpdatesChannelId)?.name || newGuild.publicUpdatesChannelId : "Keiner";
        changes.push({
          label: "Community-Updates Kanal",
          setting: "publicUpdatesChannel",
          oldValue: `#${oldName}`,
          newValue: `#${newName}`,
        });
      }

      // 11. Sicherheits-Alarm-Kanal
      if (oldGuild.safetyAlertsChannelId !== newGuild.safetyAlertsChannelId) {
        const oldName = oldGuild.safetyAlertsChannelId ? oldGuild.channels.cache.get(oldGuild.safetyAlertsChannelId)?.name || oldGuild.safetyAlertsChannelId : "Keiner";
        const newName = newGuild.safetyAlertsChannelId ? newGuild.channels.cache.get(newGuild.safetyAlertsChannelId)?.name || newGuild.safetyAlertsChannelId : "Keiner";
        changes.push({
          label: "Sicherheits-Alarm Kanal",
          setting: "safetyAlertsChannel",
          oldValue: `#${oldName}`,
          newValue: `#${newName}`,
        });
      }

      // 12. Verifizierungsstufe
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        const levels = ["Keine", "Niedrig (Verifizierte E-Mail)", "Mittel (> 5 Min. registriert)", "Hoch (> 10 Min. auf Server)", "Höchste (Telefonnummer verifiziert)"];
        changes.push({
          label: "Verifizierungsstufe",
          setting: "verificationLevel",
          oldValue: levels[oldGuild.verificationLevel] || `${oldGuild.verificationLevel}`,
          newValue: levels[newGuild.verificationLevel] || `${newGuild.verificationLevel}`,
        });
      }

      // 13. Expliziter Inhaltsfilter
      if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
        const filters = ["Deaktiviert", "Mitglieder ohne Rolle scannen", "Alle Medien scannen"];
        changes.push({
          label: "Medien-Inhaltsfilter",
          setting: "explicitContentFilter",
          oldValue: filters[oldGuild.explicitContentFilter] || `${oldGuild.explicitContentFilter}`,
          newValue: filters[newGuild.explicitContentFilter] || `${newGuild.explicitContentFilter}`,
        });
      }

      // 14. Standard-Benachrichtigungseinstellungen
      if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
        changes.push({
          label: "Standard-Benachrichtigungen",
          setting: "defaultMessageNotifications",
          oldValue: oldGuild.defaultMessageNotifications === 0 ? "Alle Nachrichten" : "Nur @Erwähnungen",
          newValue: newGuild.defaultMessageNotifications === 0 ? "Alle Nachrichten" : "Nur @Erwähnungen",
        });
      }

      // 15. Standard-Sprache / Region
      if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
        changes.push({
          label: "Server-Sprache",
          setting: "preferredLocale",
          oldValue: oldGuild.preferredLocale,
          newValue: newGuild.preferredLocale,
        });
      }

      // 16. Nitro-Boost Fortschrittsleiste
      if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
        changes.push({
          label: "Server-Boost Fortschrittsleiste",
          setting: "premiumProgressBarEnabled",
          oldValue: oldGuild.premiumProgressBarEnabled ? "Aktiviert" : "Deaktiviert",
          newValue: newGuild.premiumProgressBarEnabled ? "Aktiviert" : "Deaktiviert",
        });
      }

      // 17. Vanity URL
      if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        changes.push({
          label: "Vanity-URL (Benutzerdefinierter Link)",
          setting: "vanityURLCode",
          oldValue: oldGuild.vanityURLCode || "*Keine*",
          newValue: newGuild.vanityURLCode || "*Keine*",
        });
      }

      // Wer hat die Einstellung geändert? (Audit Log Abfrage)
      const auditResult = await fetchAuditExecutor(newGuild, AuditLogEvent.GuildUpdate, {
        maxAgeMs: 7000,
        delayMs: 350,
      });

      if (changes.length === 0) {
        if (!auditResult) return;
        changes.push({
          label: "Server-Einstellung",
          setting: "general",
          oldValue: "Bisheriger Wert",
          newValue: "Aktualisiert",
        });
      }

      await auditLogService.log(
        {
          guildId: newGuild.id,
          category: "server",
          action: "GUILD_UPDATE",
          executor: auditResult?.executor,
          target: {
            id: newGuild.id,
            name: newGuild.name,
          },
          details: {
            changes,
            newIconUrl: newGuild.iconURL(),
            reason: auditResult?.reason,
          },
        },
        client
      );
    } catch (error) {
      console.error("[GuildUpdate Event] Fehler beim Audit-Logging:", error);
    }
  },
};

export default guildUpdateEvent;
