import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { auditLogService } from "../../services/auditLogService";

const logsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Zeigt die neuesten Audit-Logs des Servers an.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Listet die neuesten Audit-Ereignisse auf.")
        .addStringOption((opt) =>
          opt
            .setName("kategorie")
            .setDescription("Filtere nach einer bestimmten Kategorie.")
            .setRequired(false)
            .addChoices(
              { name: "Alle Kategorien", value: "all" },
              { name: "Nachrichten (Löschungen & Edits)", value: "message" },
              { name: "Mitglieder (Joins, Leaves, Rollen)", value: "member" },
              { name: "Kanäle (Erstellen, Löschen, Updates)", value: "channel" },
              { name: "Rollen (Erstellen, Löschen, Updates)", value: "role" },
              { name: "Voice (Beitritt, Leave, Move, Mute)", value: "voice" }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName("anzahl")
            .setDescription("Anzahl der Einträge (Standard: 10, Max: 25).")
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Durchsucht Logs nach Text, Nutzer-Tag oder ID.")
        .addStringOption((opt) =>
          opt
            .setName("begriff")
            .setDescription("Suchbegriff (z. B. Nutzername, Kanalname oder Text).")
            .setRequired(true)
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "Dieser Befehl kann nur auf einem Server genutzt werden.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "list") {
      const category = interaction.options.getString("kategorie") || "all";
      const limit = interaction.options.getInteger("anzahl") || 10;

      const { logs, total } = auditLogService.getLogs(guild.id, {
        category,
        limit,
        page: 1,
      });

      if (logs.length === 0) {
        await interaction.reply({
          content: `ℹ️ Noch keine Audit-Logs für Kategorie \`${category}\` erfasst.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📜 Die neuesten Audit-Logs (${logs.length} von ${total})`)
        .setDescription(
          logs
            .map((l) => {
              const time = new Date(l.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const user = l.executor ? `**${l.executor.tag}**` : (l.target ? `**${l.target.tag || l.target.name}**` : "System");
              return `• \`[${time}]\` **${l.action}** – ${user}`;
            })
            .join("\n\n")
        )
        .setFooter({ text: "Tipp: Vollständige Details findest du im Web-Dashboard unter /logs" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "search") {
      const query = interaction.options.getString("begriff", true);
      const { logs, total } = auditLogService.getLogs(guild.id, {
        query,
        limit: 10,
        page: 1,
      });

      if (logs.length === 0) {
        await interaction.reply({
          content: `🔍 Keine Audit-Logs gefunden für den Suchbegriff: \`${query}\``,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🔍 Suchergebnisse für "${query}" (${logs.length} von ${total})`)
        .setDescription(
          logs
            .map((l) => {
              const time = new Date(l.timestamp).toLocaleString("de-DE");
              const user = l.executor ? `**${l.executor.tag}**` : (l.target ? `**${l.target.tag || l.target.name}**` : "System");
              return `• \`[${time}]\` **${l.action}** – ${user}\n  *${JSON.stringify(l.details).slice(0, 100)}*`;
            })
            .join("\n\n")
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default logsCommand;
