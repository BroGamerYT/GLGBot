import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types";
import { createVoicePanelEmbed, createVoicePanelComponents } from "./voicePanel";

const interfaceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("interface")
    .setDescription("Sendet das interaktive 'VoiceMaster'-Steuerungs-Panel in diesen Kanal (Alias).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  execute: async (interaction) => {
    const embed = createVoicePanelEmbed();
    const components = createVoicePanelComponents();

    await interaction.reply({
      content: "✅ Das interaktive Steuerungs-Panel wurde gesendet!",
      ephemeral: true,
    });

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({
        embeds: [embed],
        components,
      });
    }
  },
};

export default interfaceCommand;
