import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";

const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Zeigt die Hilfe-Übersicht aller Bot-Befehle und den Link zum Web-Dashboard an."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📚 GLGBot — Hilfe & Befehlsübersicht")
      .setDescription(
        "Willkommen beim zentralen Community-Bot von **GermanyLanGame**!\nHier findest du eine strukturierte Übersicht über alle verfügbaren Systeme und Befehle:"
      )
      .addFields(
        {
          name: "🎙️ VoiceMaster & Temporäre Sprachkanäle",
          value:
            "`/setup-voice` • Richtet den „Join to Create“-Kanal ein\n" +
            "`/voice` • Lobbys sperren, verstecken, Bitrate ändern oder kicken\n" +
            "`/interface` • Öffnet das interaktive Voice-Steuerungspanel\n" +
            "`/voice-stats` • Zeigt deine Voice-Dauer & Top Talk-Partner an\n" +
            "`/top-voice` • Rangliste der Mitglieder mit der meisten Sprachzeit",
          inline: false,
        },
        {
          name: "🏆 Level & Ranglisten",
          value:
            "`/rank [user]` • Zeigt dein Level, gesammelte XP und Rangkarte\n" +
            "`/leaderboard` • Die Top 10 aktivsten Server-Mitglieder",
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
            "`/case view|user|delete` • Durchsucht Moderations-Fälle\n" +
            "`/clear` • Löscht bis zu 100 Nachrichten (optional nach Nutzer)",
          inline: false,
        },
        {
          name: "📩 Support, Tickets & Community",
          value:
            "`/setup-tickets` • Postet das Ticket-Panel für private Support-Anfragen\n" +
            "`/suggest neu|status` • Reiche Vorschläge mit Upvote/Downvote-Buttons ein\n" +
            "`/sticky set|remove` • Fixiert wichtige Hinweise als letzte Nachricht im Kanal",
          inline: false,
        },
        {
          name: "🎮 Gaming & Benachrichtigungen",
          value:
            "`/free-games list|post` • Kostenlose Spiele von Epic, Steam & GOG\n" +
            "`/twitch-live start|stop` • Verwaltet persönliche Live-Stream Kanäle\n" +
            "`/streamer add|remove|list` • Richtet automatische Stream-Alerts ein",
          inline: false,
        },
        {
          name: "⚙️ Administration & Backups",
          value:
            "`/backup create|list|restore` • Vollständige Rollen- & Kanal-Snapshots\n" +
            "`/setup-logs` • Richtet den geschützten Audit-Log Kanal ein\n" +
            "`/setup-roles` • Erstellt das Rollenauswahl-Panel im Chat",
          inline: false,
        }
      )
      .setFooter({ text: "GermanyLanGame • Web-Dashboard: https://glgbot.brogameryt.de" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Web-Dashboard & Dokumentation")
        .setStyle(ButtonStyle.Link)
        .setURL("https://glgbot.brogameryt.de/hilfe")
        .setEmoji("🌐")
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default helpCommand;
