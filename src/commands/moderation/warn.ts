import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { checkModeration } from "../../utils/modChecks";
import { moderationService } from "../../services/moderationService";

const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Verwarnt ein Mitglied und erstellt einen Fall.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("mitglied")
        .setDescription("Das Mitglied, das verwarnt werden soll.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("grund")
        .setDescription("Begründung für die Verwarnung.")
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied", true);
    const reason = interaction.options.getString("grund", true);

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: "❌ Du kannst dich nicht selbst verwarnen.", ephemeral: true });
      return;
    }

    if (targetUser.bot) {
      await interaction.reply({ content: "❌ Bots können nicht verwarnt werden.", ephemeral: true });
      return;
    }

    const modProblem = await checkModeration(interaction, await interaction.guild.members.fetch(targetUser.id).catch(() => null));
    if (modProblem) {
      await interaction.reply({ content: `❌ ${modProblem}`, ephemeral: true });
      return;
    }

    const modCase = await moderationService.createCase(
      interaction.guild,
      interaction.user,
      targetUser,
      "WARN",
      reason,
      { client: interaction.client }
    );

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("⚠️ Mitglied verwarnt")
      .setDescription(`**${targetUser.tag || targetUser.username}** wurde erfolgreich verwarnt.`)
      .addFields(
        { name: "Fall-ID", value: `#${modCase.id}`, inline: true },
        { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📉 XP-Abzug", value: `-${modCase.xpLost || 250} XP (Neues Level: **${modCase.newLevel ?? 1}**)`, inline: true },
        { name: "Begründung", value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default warnCommand;
