import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { moderationService } from "../../services/moderationService";

const unbanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Hebt den Bann für eine Discord-Nutzer-ID auf.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option
        .setName("nutzer_id")
        .setDescription("Die Discord-ID des gebannten Nutzers (z.B. 123456789...).")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("grund")
        .setDescription("Begründung für die Entbannung.")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const userId = interaction.options.getString("nutzer_id", true).trim();
    const reason = interaction.options.getString("grund") || "Keine Begründung angegeben";

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        await interaction.reply({
          content: `❌ Kein aktiver Bann für die ID \`${userId}\` gefunden.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${reason}`);

      const modCase = await moderationService.createCase(
        interaction.guild,
        interaction.user,
        banInfo.user,
        "UNBAN",
        reason,
        { client: interaction.client }
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔓 Nutzer entbannt")
        .setDescription(`Der Bann für **${banInfo.user.tag || banInfo.user.username}** (\`${userId}\`) wurde aufgehoben.`)
        .addFields(
          { name: "Fall-ID", value: `#${modCase.id}`, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Begründung", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Fehler beim Entbannen: ${error.message}`, ephemeral: true });
    }
  },
};

export default unbanCommand;
