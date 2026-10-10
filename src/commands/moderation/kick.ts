import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { checkModeration } from "../../utils/modChecks";
import { moderationService } from "../../services/moderationService";

const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kickt ein Mitglied vom Server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("mitglied")
        .setDescription("Das Mitglied, das gekickt werden soll.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("grund")
        .setDescription("Begründung für den Kick.")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied", true);
    const reason = interaction.options.getString("grund") || "Keine Begründung angegeben";

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Mitglied wurde auf diesem Server nicht gefunden.", ephemeral: true });
      return;
    }

    const modProblem = await checkModeration(interaction, member);
    if (modProblem) {
      await interaction.reply({ content: `❌ ${modProblem}`, ephemeral: true });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "❌ Dieses Mitglied kann nicht gekickt werden (höhere Rolle oder Administrator).",
        ephemeral: true,
      });
      return;
    }

    try {
      const modCase = await moderationService.createCase(
        interaction.guild,
        interaction.user,
        targetUser,
        "KICK",
        reason,
        { client: interaction.client }
      );

      await member.kick(`${interaction.user.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("👢 Mitglied gekickt")
        .setDescription(`**${targetUser.tag || targetUser.username}** wurde erfolgreich gekickt.`)
        .addFields(
          { name: "Fall-ID", value: `#${modCase.id}`, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Begründung", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Fehler beim Kicken: ${error.message}`, ephemeral: true });
    }
  },
};

export default kickCommand;
