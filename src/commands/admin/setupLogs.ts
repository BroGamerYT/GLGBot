import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { auditLogService, AuditLogConfig } from "../../services/auditLogService";

const setupLogsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Konfiguriert das lückenlose Audit-Logging System.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("auto")
        .setDescription("Erstellt automatisch einen geschützten 📁・audit-logs Kanal und richtet alles ein.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Weist einen bestehenden Textkanal als Audit-Log-Kanal zu.")
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Der Kanal für Audit-Logs.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt die aktuelle Logging-Konfiguration und Event-Statistiken.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Aktiviert oder deaktiviert eine bestimmte Audit-Kategorie.")
        .addStringOption((opt) =>
          opt
            .setName("kategorie")
            .setDescription("Die zu ändernde Kategorie.")
            .setRequired(true)
            .addChoices(
              { name: "Nachrichten (Löschen & Bearbeiten)", value: "messages" },
              { name: "Mitglieder (Beitritt, Verlassen, Rollen, Nicks)", value: "members" },
              { name: "Kanäle (Erstellen, Löschen, Ändern)", value: "channels" },
              { name: "Rollen (Erstellen, Löschen, Berechtigungen)", value: "roles" },
              { name: "Voice (Beitreten, Verlassen, Mute/Deafen)", value: "voice" }
            )
        )
        .addBooleanOption((opt) =>
          opt
            .setName("aktiviert")
            .setDescription("Soll diese Kategorie protokolliert werden?")
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

    if (sub === "auto") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const channel = await auditLogService.ensureLogChannel(guild);
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Audit-Logging erfolgreich eingerichtet")
          .setDescription(
            `Der geschützte Audit-Log-Kanal <#${channel.id}> wurde konfiguriert!\n\n` +
            `🔒 **Sicherheit:** Für \`@everyone\` unsichtbar. Nur Administratoren und der Bot haben Zugriff.\n` +
            `📊 **Aktiv:** Nachrichten, Mitglieder, Kanäle, Rollen und Voice-Events werden ab jetzt lückenlos erfasst.`
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply({ content: `❌ Fehler beim Einrichten: ${err.message}` });
      }
      return;
    }

    if (sub === "set") {
      const channel = interaction.options.getChannel("kanal", true);
      auditLogService.setConfig(guild.id, { logChannelId: channel.id });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Log-Kanal zugewiesen")
        .setDescription(`Audit-Logs werden nun in <#${channel.id}> gesendet.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "toggle") {
      const category = interaction.options.getString("kategorie", true) as keyof AuditLogConfig["enabled"];
      const enabled = interaction.options.getBoolean("aktiviert", true);

      const cfg = auditLogService.getConfig(guild.id);
      cfg.enabled[category] = enabled;
      auditLogService.setConfig(guild.id, { enabled: cfg.enabled });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("⚙️ Logging-Kategorie aktualisiert")
        .setDescription(`Kategorie **${String(category)}** ist jetzt **${enabled ? "Aktiviert ✅" : "Deaktiviert ❌"}**.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "status") {
      const cfg = auditLogService.getConfig(guild.id);
      const stats = auditLogService.getStats(guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📋 Audit-Log Status & Konfiguration")
        .addFields(
          {
            name: "Log-Kanal",
            value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : "*Nicht konfiguriert (nutze `/setup-logs auto`)*",
            inline: false,
          },
          {
            name: "Aktivierte Module",
            value: [
              `Nachrichten: ${cfg.enabled.messages ? "✅" : "❌"}`,
              `Mitglieder: ${cfg.enabled.members ? "✅" : "❌"}`,
              `Kanäle: ${cfg.enabled.channels ? "✅" : "❌"}`,
              `Rollen: ${cfg.enabled.roles ? "✅" : "❌"}`,
              `Voice: ${cfg.enabled.voice ? "✅" : "❌"}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "Gespeicherte Logs",
            value: [
              `Gesamt: **${stats.total}**`,
              `Nachrichten: **${stats.categories.message}**`,
              `Mitglieder: **${stats.categories.member}**`,
              `Kanäle: **${stats.categories.channel}**`,
              `Rollen: **${stats.categories.role}**`,
              `Voice: **${stats.categories.voice}**`,
            ].join("\n"),
            inline: true,
          }
        )
        .setFooter({ text: "GLG Audit-Log System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default setupLogsCommand;
