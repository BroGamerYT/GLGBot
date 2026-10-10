import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types";
import { sendDirectMessage } from "../../utils/sendDM";

const dmCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Sendet eine private Nachricht an einen Nutzer (oder an dich selbst).")
    .addStringOption((option) =>
      option
        .setName("nachricht")
        .setDescription("Die Nachricht, die privat gesendet werden soll.")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("empfaenger")
        .setDescription("Der Nutzer, der die DM erhalten soll (Standard: Du selbst).")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  execute: async (interaction) => {
    const text = interaction.options.getString("nachricht", true);
    const targetUser = interaction.options.getUser("empfaenger") || interaction.user;

    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `Nachricht von ${interaction.guild?.name || "Server"}`,
        iconURL: interaction.guild?.iconURL() || undefined,
      })
      .setDescription(text)
      .setFooter({ text: `Gesendet von ${interaction.user.tag}` })
      .setTimestamp();

    const result = await sendDirectMessage(targetUser, { embeds: [dmEmbed] });

    if (result.success) {
      await interaction.reply({
        content: `✅ Die private Nachricht wurde erfolgreich an <@${targetUser.id}> gesendet!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `❌ Konnte <@${targetUser.id}> keine private Nachricht senden:\n> *${result.error}*`,
        ephemeral: true,
      });
    }
  },
};

export default dmCommand;
