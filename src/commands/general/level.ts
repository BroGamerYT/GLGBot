import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { buildLevelCard } from "../../utils/levelCard";

const levelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Dein Level im Level-System.")
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt dein Level, deine XP und wie viel bis zum nächsten Level fehlt.")
        .addBooleanOption((opt) =>
          opt.setName("oeffentlich").setDescription("Für alle im Kanal sichtbar posten (Standard: nur für dich).").setRequired(false)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }
    const isPublic = interaction.options.getBoolean("oeffentlich") ?? false;
    const embed = buildLevelCard(interaction.guild, interaction.user, {
      title: `Level-Status von ${interaction.user.tag || interaction.user.username}`,
      showNextSteps: true,
    });
    await interaction.reply({ embeds: [embed], ephemeral: !isPublic });
  },
};

export default levelCommand;
