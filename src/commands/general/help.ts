import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { BRANDING, dashboardLink } from "../../config/branding";

const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Zeigt die Hilfe-Übersicht aller Bot-Befehle und den Link zum Web-Dashboard an."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📚 ${BRANDING.bot} — Hilfe & Befehlsübersicht`)
      .setDescription(
        `Willkommen beim zentralen Community-Bot von **${interaction.guild?.name || BRANDING.community}**!\nHier findest du eine strukturierte Übersicht über alle verfügbaren Systeme und Befehle:`
      )
      .addFields(
        {
          name: "🎙️ VoiceMaster & Temporäre Sprachkanäle",
          value:
            "`/setup-voice` • Richtet den „Join to Create“-Kanal ein\n" +
            "`/voice` • Lobbys sperren, verstecken, Bitrate ändern oder kicken\n" +
            "`/interface` / `/voice-panel` • Postet das interaktive Voice-Steuerungspanel\n" +
            "`/voice-stats` • Zeigt deine Voice-Dauer & Top Talk-Partner an\n" +
            "`/top-voice` • Rangliste der Mitglieder mit der meisten Sprachzeit",
          inline: false,
        },
        {
          name: "🏆 Level & Ranglisten",
          value:
            "`/rank [user]` • Zeigt dein Level, gesammelte XP, Coins & Rangkarte\n" +
            "`/level status` • Dein Level-Status: wie viele XP bis zum nächsten Level fehlen\n" +
            "`/level sync-roles` • Holt verdiente Level-Belohnungsrollen nach\n" +
            "`/daily` • Tägliche XP- & Coins-Belohnung mit Streak-Bonus\n" +
            "`/leaderboard` • Die Top 10 aktivsten oder wohlhabendsten Mitglieder",
          inline: false,
        },
        {
          name: "🪙 Wirtschaft & Belohnungs-Shop",
          value:
            "`/balance [user]` • Prüfe dein Kontoguthaben, Vermögens-Rang und Transaktionen\n" +
            "`/pay <user> <betrag>` • Überweise Coins an ein anderes Mitglied\n" +
            "`/shop uebersicht|kaufen|code` • Belohnungs-Shop für Rollen, Badges, Namensfarben & Web-Login\n" +
            "`/web-login` • 30-Minuten Einmal-Code & 1-Klick-Link für den Web-Shop\n" +
            "📈 **XP-Börse** • Level-XP im Web-Dashboard zu dynamischen Marktkursen in Coins tauschen\n" +
            "🎨 **Namensfarben** • Bunte Chat-Farben im Shop erwerben und direkt aktivieren",
          inline: false,
        },
        {
          name: "🛡️ Moderation & Sicherheit",
          value:
            "`/warn` • Verwarnt ein Mitglied mit Protokollierung\n" +
            "`/timeout` • Schaltet ein Mitglied temporär stumm (1m - 1w)\n" +
            "`/kick` • Kickt ein Mitglied vom Server\n" +
            "`/ban` • Bannt einen Nutzer inklusive Nachrichtenbereinigung\n" +
            "`/unban` • Hebt einen Bann per Nutzer-ID auf\n" +
            "`/knast einsperren|freilassen|liste` • Gefängnis: Text & Voice-Isolierung, Timer (z.B. 60m), -1.000 XP & Auto-AFK\n" +
            "`/case view|user|delete` • Durchsucht Moderations-Fälle\n" +
            "`/clear` • Löscht bis zu 100 Nachrichten (optional nach Nutzer)",
          inline: false,
        },
        {
          name: "📩 Support, Tickets, Regeln & Community",
          value:
            "`/rules [paragraph]` • Zeigt das offizielle, aktuelle Regelwerk (oder z.B. §1) an\n" +
            "`/setup-tickets` • Postet das Ticket-Panel für private Support-Anfragen\n" +
            "`/suggest neu|status` • Reiche Vorschläge mit Upvote/Downvote-Buttons ein\n" +
            "`/giveaway start|end|reroll` • Verlosungen mit Teilnahme-Button\n" +
            "`/birthday set|remove|list` • Geburtstag eintragen, der Bot gratuliert\n" +
            "`/lfg` • Mitspieler suchen - volle Gruppe bekommt eine eigene Lobby\n" +
            "`/sticky set|remove` • Fixiert wichtige Hinweise als letzte Nachricht im Kanal\n" +
            "🎬 **Clip der Woche** • Clip im Clip-Kanal posten, mit 🔥 abstimmen",
          inline: false,
        },
        {
          name: "🎮 Gaming, Software & Benachrichtigungen",
          value:
            "`/free-games list|post` • Kostenlose Spiele von Epic, Steam & GOG\n" +
            "`/releases uebersicht|post-woche` • Release-Kalender für Games, Triple-A Blockbuster & große Updates\n" +
            "`/serverstatus` • Live-Status unserer Game-Server\n" +
            "🖥️ **Treiber & Software** • NVIDIA, AMD, Intel, NAS (Synology, TrueNAS, Unraid, QNAP) & Tools (AMP, OBS)\n" +
            "`/twitch-live start|stop` • Verwaltet persönliche Live-Stream Kanäle\n" +
            "`/setup-live` • Richtet Live-Rolle & Live-Kanäle ein\n" +
            "`/stream-panel` • Steuer-Panel für deinen Live-Kanal (Passwort, Limit, Name)\n" +
            "`/streamer add|remove|list` • Richtet automatische Stream-Alerts ein",
          inline: false,
        },
        {
          name: "🔧 Sonstiges",
          value:
            "`/help` • Diese Übersicht\n" +
            "`/ping` • Zeigt, wie schnell der Bot antwortet",
          inline: false,
        },
        {
          name: "⚙️ Administration & Backups",
          value:
            "`/setup-all` • Richtet alle fehlenden Rollen & Kanäle auf einmal ein\n" +
            "`/server-setup` • 1-Klick Server-Templates (Gaming, Dev, Anime, Streamer) einrichten\n" +
            "`/modules status|enable|disable|toggle` • Funktionen an- oder ausschalten\n" +
            "`/economy geben|abziehen|setzen|reset` • Nutzerguthaben als Admin verwalten\n" +
            "`/server-stats einrichten|entfernen` • Live-Zähler-Kanäle ganz oben\n" +
            "`/backup create|list|restore` • Vollständige Rollen- & Kanal-Snapshots\n" +
            "`/setup-rules post|lock|unlock` • Regeln posten & Server bis zur Bestätigung sperren\n" +
            "`/setup-roles` • Erstellt das Rollenauswahl-Panel im Chat\n" +
            "`/setup-logs` • Richtet den geschützten Audit-Log Kanal ein\n" +
            "`/logs` • Durchsucht das Audit-Log\n" +
            "`/dm` • Private Nachricht im Namen des Servers senden",
          inline: false,
        }
      )
      .setFooter({ text: dashboardLink() ? `${BRANDING.community} • Web-Dashboard: ${dashboardLink()}` : BRANDING.community })
      .setTimestamp();

    const helpUrl = dashboardLink("/hilfe");
    const rulesUrl = dashboardLink("/hilfe#regeln");
    const components = helpUrl
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel("Web-Dashboard & Hilfe").setStyle(ButtonStyle.Link).setURL(helpUrl).setEmoji("🌐"),
            new ButtonBuilder().setLabel("Live-Serverregeln").setStyle(ButtonStyle.Link).setURL(rulesUrl || helpUrl).setEmoji("📜")
          ),
        ]
      : [];

    await interaction.reply({ embeds: [embed], components });
  },
};

export default helpCommand;
