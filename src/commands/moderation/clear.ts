import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";

const clearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Löscht mehrere Nachrichten auf einmal im aktuellen Kanal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName("anzahl")
        .setDescription("Anzahl der zu löschenden Nachrichten (1 - 100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt
        .setName("autor")
        .setDescription("Nur Nachrichten von diesem bestimmten Nutzer löschen.")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const channel = interaction.channel;
    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({
        content: "❌ In diesem Kanal können keine Nachrichten gelöscht werden.",
        ephemeral: true,
      });
      return;
    }

    const amount = interaction.options.getInteger("anzahl", true);
    const filterUser = interaction.options.getUser("autor");

    await interaction.deferReply({ ephemeral: true });

    try {
      const textChannel = channel as TextChannel;
      const fetched = await textChannel.messages.fetch({ limit: amount });

      let toDelete = fetched;
      if (filterUser) {
        toDelete = fetched.filter((m) => m.author.id === filterUser.id);
      }

      if (toDelete.size === 0) {
        await interaction.editReply("ℹ️ Keine passenden Nachrichten zum Löschen gefunden.");
        return;
      }

      const deleted = await textChannel.bulkDelete(toDelete, true);
      await interaction.editReply(
        `🧹 Erfolgreich **${deleted.size}** Nachricht(en)${
          filterUser ? ` von <@${filterUser.id}>` : ""
        } gelöscht.`
      );
    } catch (error: any) {
      await interaction.editReply(`❌ Fehler beim Löschen: ${error.message}`);
    }
  },
};

export default clearCommand;
