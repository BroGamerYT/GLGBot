import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { Command } from "../../types";
import { lfgService } from "../../services/lfgService";

const lfgCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("lfg")
    .setDescription("Mitspieler suchen: Gruppe mit freien Plätzen erstellen.")
    .addStringOption((o) => o.setName("spiel").setDescription("Welches Spiel?").setRequired(true).setMaxLength(80))
    .addIntegerOption((o) => o.setName("spieler").setDescription("Gruppengröße inkl. dir (2-25)").setMinValue(2).setMaxValue(25).setRequired(true))
    .addStringOption((o) => o.setName("rang").setDescription("Rang / Level (optional)").setMaxLength(60))
    .addStringOption((o) => o.setName("beschreibung").setDescription("Was habt ihr vor? (optional)").setMaxLength(300)),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({ content: "❌ Nur in einem Textkanal auf einem Server möglich.", ephemeral: true });
      return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    try {
      await lfgService.create(
        interaction.channel as TextChannel,
        member,
        interaction.options.getString("spiel", true),
        interaction.options.getInteger("spieler", true),
        interaction.options.getString("rang") || undefined,
        interaction.options.getString("beschreibung") || undefined
      );
      await interaction.editReply("✅ Deine Gruppe ist erstellt! Sobald sie voll ist, bekommt ihr eine eigene Lobby.");
    } catch (e: any) {
      await interaction.editReply(`❌ ${e?.message || "Gruppe konnte nicht erstellt werden."}`);
    }
  },
};

export default lfgCommand;
