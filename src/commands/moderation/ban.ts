import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { moderationService } from "../../services/moderationService";

const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannt ein Mitglied dauerhaft vom Server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("mitglied")
        .setDescription("Das Mitglied, das gebannt werden soll.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("grund")
        .setDescription("Begründung für den Bann.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("nachrichten_loeschen")
        .setDescription("Löscht Nachrichten der letzten X Tage (0 bis 7 Tage).")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied", true);
    const reason = interaction.options.getString("grund") || "Keine Begründung angegeben";
    const deleteDays = interaction.options.getInteger("nachrichten_loeschen") || 0;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({
        content: "❌ Dieses Mitglied kann nicht gebannt werden (höhere Rolle oder Administrator).",
        ephemeral: true,
      });
      return;
    }

    try {
      const modCase = await moderationService.createCase(
        interaction.guild,
        interaction.user,
        targetUser,
        "BAN",
        reason,
        { client: interaction.client }
      );

      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `${interaction.user.tag}: ${reason}`,
      });

      const embed = new EmbedBuilder()
        .setColor(0x992d22)
        .setTitle("🔨 Mitglied gebannt")
        .setDescription(`**${targetUser.tag || targetUser.username}** wurde dauerhaft gebannt.`)
        .addFields(
          { name: "Fall-ID", value: `#${modCase.id}`, inline: true },
          { name: "Nachrichten gelöscht", value: deleteDays > 0 ? `${deleteDays} Tag(e)` : "Keine", inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Begründung", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Fehler beim Bannen: ${error.message}`, ephemeral: true });
    }
  },
};

export default banCommand;
