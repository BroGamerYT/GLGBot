import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { stickyService } from "../../services/stickyService";

const stickyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Verwaltet angeheftete (Sticky) Nachrichten, die immer ganz unten im Chat bleiben.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Setzt eine Sticky Message für den aktuellen Kanal.")
        .addStringOption((opt) =>
          opt
            .setName("nachricht")
            .setDescription("Der Text, der dauerhaft fixiert bleiben soll.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Entfernt die Sticky Message aus dem aktuellen Kanal.")
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const text = interaction.options.getString("nachricht", true);
      stickyService.setSticky(interaction.channelId, interaction.guild.id, text);

      await interaction.reply({
        content: `📌 Sticky Message erfolgreich für <#${interaction.channelId}> aktiviert!\nSobald jemand schreibt, wird der Hinweis automatisch ganz unten neu angeheftet.`,
        ephemeral: true,
      });
    } else if (sub === "remove") {
      const removed = stickyService.removeSticky(interaction.channelId);

      if (removed) {
        await interaction.reply({
          content: `🗑️ Sticky Message für <#${interaction.channelId}> entfernt.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `ℹ️ In <#${interaction.channelId}> war keine Sticky Message aktiv.`,
          ephemeral: true,
        });
      }
    }
  },
};

export default stickyCommand;
