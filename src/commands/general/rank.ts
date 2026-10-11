import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { buildLevelCard, buildRankCardImage } from "../../utils/levelCard";

const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Zeigt dein aktuelles Level, gesammelte XP und Ranglisten-Position an.")
    .addUserOption((opt) =>
      opt.setName("mitglied").setDescription("Das Mitglied, dessen Rang du sehen möchtest.").setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied") || interaction.user;
    await interaction.deferReply();
    const embed = buildLevelCard(interaction.guild, targetUser);
    // Grafische Rangkarte (fällt bei Fehlern auf die reine Text-Karte zurück)
    const image = await buildRankCardImage(interaction.guild, targetUser);
    if (image) embed.setImage("attachment://rangkarte.png").setThumbnail(null);

    await interaction.editReply({ embeds: [embed], files: image ? [image] : [] });
  },
};

export default rankCommand;
