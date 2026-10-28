import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { Command } from "../../types";
import { backupService } from "../../services/backupService";

const backupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Verwaltet Server-Snapshots und die Wiederherstellung (Rollen, Kanäle, Berechtigungen).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Erstellt sofort einen vollständigen Snapshot aller Rollen, Kanäle und Berechtigungen.")
        .addChannelOption((opt) => opt
          .setName("chat_channel")
          .setDescription("Optional: Letzte Nachrichten dieses Kanals zusätzlich archivieren.")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addIntegerOption((opt) => opt
          .setName("messages")
          .setDescription("Nachrichten pro Kanal (100–1.000, Standard 100).")
          .setMinValue(100)
          .setMaxValue(1000)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Listet alle vorhandenen Snapshots dieses Servers auf.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("restore")
        .setDescription("Stellt fehlende Rollen und Kanäle aus einem gespeicherten Snapshot wieder her.")
        .addStringOption((opt) =>
          opt
            .setName("backup_id")
            .setDescription("Die ID des wiederherzustellenden Backups (siehe /backup list).")
            .setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("cross_server")
            .setDescription("Erlaubt das Einspielen eines Backups von einem anderen Server (entfernt fremde Mitglieder).")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("wipe")
            .setDescription("Vor dem Einspielen alle bestehenden Kanäle löschen (nur Server-Inhaber).")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("chat_archive")
            .setDescription("Archivierte Nachrichten als HTML-Dateien in die Zielkanäle posten.")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("export")
        .setDescription("Exportiert die JSON-Datei eines Snapshots als Dateianhang.")
        .addStringOption((opt) =>
          opt
            .setName("backup_id")
            .setDescription("Die Backup-ID.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Löscht einen Snapshot dauerhaft.")
        .addStringOption((opt) =>
          opt
            .setName("backup_id")
            .setDescription("Die Backup-ID.")
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

    if (sub === "create") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const archiveChannel = interaction.options.getChannel("chat_channel");
        const backup = await backupService.createBackup(guild, interaction.user.tag, {
          chatChannelIds: archiveChannel ? [archiveChannel.id] : undefined,
          messagesPerChannel: interaction.options.getInteger("messages") || 100,
        });

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("💾 Server-Snapshot erfolgreich erstellt")
          .setDescription(
            `Der Server-Zustand wurde sicher als JSON-Snapshot archiviert!\n\n` +
            `🆔 **Backup-ID:** \`${backup.id}\`\n` +
            `🎭 **Rollen:** ${backup.summary.roleCount}\n` +
            `📂 **Kategorien:** ${backup.summary.categoryCount}\n` +
            `💬 **Kanäle:** ${backup.summary.channelCount}\n` +
            (backup.summary.chatMessageCount ? `🗃️ **Archivierte Nachrichten:** ${backup.summary.chatMessageCount}\n` : "") +
            `📅 **Zeitpunkt:** <t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>`
          )
          .setFooter({ text: "Wiederherstellbar mit /backup restore" })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply({ content: `❌ Fehler beim Erstellen des Backups: ${err.message}` });
      }
      return;
    }

    if (sub === "list") {
      const backups = backupService.listBackups(guild.id);

      if (backups.length === 0) {
        await interaction.reply({
          content: "ℹ️ Noch keine Server-Backups vorhanden. Erstelle eins mit `/backup create`!",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📦 Gespeicherte Server-Backups (${backups.length})`)
        .setDescription(
          backups
            .slice(0, 10)
            .map((b) => {
              const time = new Date(b.createdAt).toLocaleString("de-DE");
              const sizeKb = (b.fileSize / 1024).toFixed(1);
              return `• **\`${b.id}\`**\n  📅 ${time} | 🎭 ${b.summary.roleCount} Rollen | 💬 ${b.summary.channelCount} Kanäle | 💾 ${sizeKb} KB\n  👤 Ersteller: \`${b.creatorTag || "System"}\``;
            })
            .join("\n\n")
        )
        .setFooter({ text: "Zum Wiederherstellen: /backup restore <id>" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "restore") {
      const backupId = interaction.options.getString("backup_id", true);
      const crossServer = interaction.options.getBoolean("cross_server") ?? false;
      const wipe = interaction.options.getBoolean("wipe") ?? false;
      const restoreChatArchive = interaction.options.getBoolean("chat_archive") ?? false;

      if (wipe && interaction.user.id !== guild.ownerId) {
        await interaction.reply({
          content: "❌ Die Wipe-Option (Kanäle leeren) darf nur vom Server-Inhaber ausgeführt werden.",
          ephemeral: true,
        });
        return;
      }

      const backup = backupService.getBackup(backupId, guild.id);
      if (!backup) {
        await interaction.reply({
          content: `❌ Backup mit ID \`${backupId}\` wurde nicht gefunden.`,
          ephemeral: true,
        });
        return;
      }

      if (wipe) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("backup-wipe-confirm").setLabel("Kanäle löschen und fortfahren").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("backup-wipe-cancel").setLabel("Abbrechen").setStyle(ButtonStyle.Secondary)
        );
        const reply = await interaction.reply({
          content: `⚠️ **Letzte Bestätigung:** Alle Kanäle auf **${guild.name}** werden gelöscht. Ein Vorher-Snapshot wird erstellt. Backup: \`${backupId}\`.`,
          components: [row],
          ephemeral: true,
          fetchReply: true,
        });
        const confirmation = await reply.awaitMessageComponent({
          filter: (component) => component.user.id === interaction.user.id,
          time: 30_000,
        }).catch(() => null);
        if (!confirmation || confirmation.customId !== "backup-wipe-confirm") {
          if (confirmation) await confirmation.update({ content: "Wiederherstellung abgebrochen.", components: [] });
          else await interaction.editReply({ content: "Bestätigungszeit abgelaufen. Es wurden keine Kanäle gelöscht.", components: [] });
          return;
        }
        await confirmation.update({ content: "Wipe bestätigt. Der Vorher-Snapshot wird erstellt …", components: [] });
      } else {
        await interaction.deferReply({ ephemeral: true });
      }

      try {
        const res = await backupService.restoreBackup(guild, backupId, {
          allowCrossServer: crossServer,
          wipeFirst: wipe,
          restoreChatArchive,
          stripMemberOverwrites: true,
          preserveOwnerRank: true,
        });

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🔄 Server-Wiederherstellung abgeschlossen")
          .setDescription(
            `Snapshot \`${backupId}\` wurde erfolgreich auf den Server angewendet:\n\n` +
            `➕ **Rollen neu erstellt:** ${res.rolesCreated}\n` +
            `⚙️ **Rollen aktualisiert:** ${res.rolesUpdated}\n` +
            `📂 **Kategorien neu erstellt:** ${res.categoriesCreated}\n` +
            `💬 **Kanäle neu erstellt:** ${res.channelsCreated}\n` +
            `🗃️ **Chat-Archive veröffentlicht:** ${res.chatArchivesRestored}\n` +
            (res.preRestoreBackupId ? `🛟 **Vorher-Snapshot:** \`${res.preRestoreBackupId}\`\n` : "") +
            (res.errors.length > 0 ? `\n⚠️ **Hinweise:**\n${res.errors.slice(0, 3).join("\n")}` : "")
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply({ content: `❌ Fehler bei der Wiederherstellung: ${err.message}` });
      }
      return;
    }

    if (sub === "export") {
      const backupId = interaction.options.getString("backup_id", true);
      const backup = backupService.getBackup(backupId, guild.id);
      if (!backup) {
        await interaction.reply({ content: `❌ Backup \`${backupId}\` existiert nicht.`, ephemeral: true });
        return;
      }

      const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(backup, null, 2)), { name: `${backupId}.json` });
      await interaction.reply({
        content: `📁 Hier ist die Snapshot-Datei für \`${backupId}\`:`,
        files: [attachment],
        ephemeral: true,
      });
      return;
    }

    if (sub === "delete") {
      const backupId = interaction.options.getString("backup_id", true);
      const deleted = backupService.deleteBackup(backupId, guild.id);

      if (deleted) {
        await interaction.reply({ content: `🗑️ Backup \`${backupId}\` wurde gelöscht.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Backup \`${backupId}\` konnte nicht gefunden werden.`, ephemeral: true });
      }
    }
  },
};

export default backupCommand;
