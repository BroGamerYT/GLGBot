import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { rulesService } from "../../services/rulesService";
import { BRANDING, dashboardLink } from "../../config/branding";

const rulesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Zeigt das offizielle, aktuelle Regelwerk unseres Discord-Servers an.")
    .addIntegerOption((opt) =>
      opt
        .setName("paragraph")
        .setDescription("Optional: Nur einen bestimmten Paragraphen anzeigen (z. B. 1 für §1)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild;
    const guildId = guild?.id;
    const rulesConfig = rulesService.getRules(guildId);
    const paragraphOpt = interaction.options.getInteger("paragraph");

    const icon = guild?.iconURL({ size: 256 }) || undefined;
    const helpUrl = dashboardLink("/hilfe#regeln");

    // Falls ein einzelner Paragraph angefragt wurde
    if (paragraphOpt !== null) {
      const rule = rulesConfig.rules[paragraphOpt - 1];
      if (!rule) {
        await interaction.reply({
          content: `❌ Paragraph §${paragraphOpt} existiert nicht. Das Regelwerk umfasst aktuell §1 bis §${rulesConfig.rules.length}.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${rule.emoji || "📌"} §${paragraphOpt} · ${rule.title}`)
        .setDescription(rule.text)
        .setFooter({ text: `${guild?.name || BRANDING.community} • Serverregeln` })
        .setTimestamp();

      const components = helpUrl
        ? [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("Alle Regeln im Web ansehen")
                .setStyle(ButtonStyle.Link)
                .setURL(helpUrl)
                .setEmoji("🌐")
            ),
          ]
        : [];

      await interaction.reply({ embeds: [embed], components, ephemeral: true });
      return;
    }

    // Vollständige Übersicht
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📜 ${rulesConfig.title || "Serverregeln"} · ${guild?.name || BRANDING.community}`)
      .setThumbnail(icon || null);

    if (rulesConfig.intro) {
      embed.setDescription(rulesConfig.intro.slice(0, 4000));
    }

    // Regeln als Fields (oder formatierter Text) hinzufügen
    for (const [i, r] of rulesConfig.rules.entries()) {
      embed.addFields({
        name: `${r.emoji || "📌"} §${i + 1} · ${r.title}`,
        value: r.text ? (r.text.length > 1024 ? r.text.slice(0, 1020) + "…" : r.text) : "*Keine Beschreibung*",
        inline: false,
      });
    }

    if (rulesConfig.consequences) {
      embed.addFields({
        name: "⚠️ Konsequenzen bei Verstößen",
        value: rulesConfig.consequences.slice(0, 1024),
        inline: false,
      });
    }

    embed.setFooter({
      text: `${guild?.name || BRANDING.community} • Live synchronisiert • Zuletzt geändert`,
      iconURL: icon,
    });
    embed.setTimestamp();

    const components = helpUrl
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Regeln im Web-Dashboard öffnen")
              .setStyle(ButtonStyle.Link)
              .setURL(helpUrl)
              .setEmoji("🌐")
          ),
        ]
      : [];

    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  },
};

export default rulesCommand;
