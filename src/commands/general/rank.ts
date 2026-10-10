import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { buildLevelCard } from "../../utils/levelCard";

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
    const embed = buildLevelCard(interaction.guild, targetUser);

    await interaction.reply({ embeds: [embed] });
  },
};

export default rankCommand;
