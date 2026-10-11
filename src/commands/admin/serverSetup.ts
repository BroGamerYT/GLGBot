import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType,
} from "discord.js";
import { Command } from "../../types";
import { templateService, TemplateId, StyleId } from "../../services/templateService";
import { moduleService } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const serverSetupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("server-setup")
    .setDescription("Richtet eine komplette, sichere Server-Struktur anhand eines Templates ein.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("template")
        .setDescription("Die gewünschte Server-Vorlage")
        .setRequired(true)
        .addChoices(
          { name: "🌱 Minimal Starter (Kompakt)", value: "starter" },
          { name: "🎮 Gaming Clan & E-Sport (Standard)", value: "gaming" },
          { name: "🌐 Multi-Gaming Community (Groß)", value: "multigaming" },
          { name: "🏰 Mega-Community & Netzwerk (Mega)", value: "community_mega" },
          { name: "🏆 E-Sport & Turniere (Pro)", value: "esports_pro" },
          { name: "💻 Coding / Dev / Tech (Standard)", value: "coding" },
          { name: "🌸 Anime, Manga & Hangout (Standard)", value: "anime" },
          { name: "🔴 Content Creator & Streamer (Standard)", value: "creator" }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("style")
        .setDescription("Der visuelle Design-Stil für Kanalnamen")
        .setRequired(true)
        .addChoices(
          { name: "Modern mit Emojis (z. B. 💬・hauptchat)", value: "modern" },
          { name: "Small Caps (z. B. 💬・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "smallcaps" },
          { name: "Bold Sans (z. B. 💬・𝗵𝗮𝘂𝗽𝘁𝗰𝗵𝗮𝘁)", value: "boldsans" },
          { name: "Aesthetic Small Caps (z. B. 〢・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "aesthetic_caps" },
          { name: "Aesthetic Pipe (z. B. 〢・hauptchat)", value: "aesthetic" },
          { name: "Box Small Caps (z. B. 「💬」ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "box_caps" },
          { name: "Box & Bold (z. B. 「💬」hauptchat)", value: "box" },
          { name: "Cyber & Neon (z. B. ◈・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "cyber" },
          { name: "Gothic / Fraktur (z. B. ⚔・𝖍𝖆𝖚𝖕𝖙𝖈𝖍𝖆𝖙)", value: "gothic" },
          { name: "Clean & Minimalistisch (z. B. hauptchat)", value: "clean" }
        )
    )
    .addBooleanOption((opt) =>
      opt
        .setName("wipe")
        .setDescription("⚠️ Bestehende Kanäle vorher komplett leeren (NUR FÜR SERVER-OWNER!)")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    if (!moduleService.isEnabled(interaction.guild.id, "templates")) {
      await interaction.reply({
        content: "⚠️ Das Modul „Server-Templates“ ist auf diesem Server aktuell deaktiviert. Aktiviere es im Dashboard oder mit `/modules`.",
        ephemeral: true,
      });
      return;
    }

    const templateId = interaction.options.getString("template", true) as TemplateId;
    const styleId = interaction.options.getString("style", true) as StyleId;
    const wipe = interaction.options.getBoolean("wipe") || false;

    if (wipe && interaction.user.id !== interaction.guild.ownerId) {
      await interaction.reply({
        content: "⛔ **Zugriff verweigert:** Die Option `wipe` (Server-Kanäle vorher leeren) darf aus Sicherheitsgründen ausschließlich vom **Server-Inhaber (Owner)** ausgeführt werden.",
        ephemeral: true,
      });
      return;
    }

    const template = templateService.getTemplate(templateId);
    if (!template) {
      await interaction.reply({ content: "❌ Ungültiges Template.", ephemeral: true });
      return;
    }

    const style = templateService.getStyles().find((s) => s.id === styleId);

    const confirmEmbed = new EmbedBuilder()
      .setColor(wipe ? 0xed4245 : 0x5865f2)
      .setTitle("🏗️ Server-Template Bestätigung")
      .setDescription(
        `Möchtest du das Server-Template **${template.name}** jetzt anwenden?\n\n` +
        `📋 **Template:** ${template.icon} ${template.name} *(${template.badge})*\n` +
        `🎨 **Kanal-Stil:** ${style?.name} *(Beispiel: \`${style?.sampleText}\`)*\n` +
        `🛡️ **Sicherheit:** Ein vollständiges Snapshot-Backup wird vor Beginn automatisch erstellt!\n\n` +
        (wipe
          ? `⚠️ **ACHTUNG: WIPE IST AKTIVIERT!** Alle bestehenden Kanäle des Servers werden vor dem Setup gelöscht!`
          : `ℹ️ Bestehende Kanäle bleiben erhalten; neue Kategorien und Kanäle werden hinzugefügt.`)
      )
      .setFooter({ text: `${BRANDING.community} Setup-Assistent • 60 Sekunden zum Bestätigen` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_template_setup")
        .setLabel(wipe ? "⚠️ Ja, WIPE & Template ausführen" : "✅ Ja, Template jetzt einrichten")
        .setStyle(wipe ? ButtonStyle.Danger : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("cancel_template_setup")
        .setLabel("Abbrechen")
        .setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 60000,
      });

      if (confirmation.customId === "cancel_template_setup") {
        await confirmation.update({
          content: "❌ Einrichtung abgebrochen.",
          embeds: [],
          components: [],
        });
        return;
      }

      await confirmation.update({
        content: "⏳ **Template-Einrichtung läuft...** Backup wird erstellt und Server-Struktur ausgerollt. Bitte kurz warten...",
        embeds: [],
        components: [],
      });

      const result = await templateService.applyTemplate(interaction.guild, templateId, styleId, {
        wipe,
        executorTag: interaction.user.tag,
      });

      if (!result.ok) {
        await confirmation.editReply({
          content: `❌ **Fehler bei der Einrichtung:** ${result.error}`,
        });
        return;
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🎉 Server-Template erfolgreich eingerichtet!")
        .setDescription(
          `Die Struktur von **${template.name}** wurde erfolgreich auf **${interaction.guild.name}** ausgerollt!`
        )
        .addFields(
          { name: "🛡️ Sicherheits-Backup", value: `\`${result.backupId}\` *(jederzeit wiederherstellbar über /backup restore)*`, inline: false },
          { name: "🎭 Erstellte Rollen", value: `${result.createdRolesCount}`, inline: true },
          { name: "📁 Erstellte Kategorien", value: `${result.createdCategoriesCount}`, inline: true },
          { name: "💬 Erstellte Kanäle", value: `${result.createdChannelsCount}`, inline: true }
        )
        .setFooter({ text: `${BRANDING.community} Setup Wizard` })
        .setTimestamp();

      await confirmation.editReply({
        content: null,
        embeds: [successEmbed],
      });
    } catch {
      await interaction.editReply({
        content: "⏱️ Zeit abgelaufen. Einrichtung wurde nicht ausgeführt.",
        embeds: [],
        components: [],
      });
    }
  },
};

export default serverSetupCommand;
