import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { moderationService } from "../../services/moderationService";

const timeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Versetzt ein Mitglied temporär in den Timeout (Stummschaltung) oder hebt ihn auf.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("mitglied")
        .setDescription("Das Mitglied, das getimeoutet werden soll.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("dauer")
        .setDescription("Dauer des Timeouts.")
        .setRequired(true)
        .addChoices(
          { name: "60 Sekunden (1 Min.)", value: 60 },
          { name: "5 Minuten", value: 300 },
          { name: "10 Minuten", value: 600 },
          { name: "1 Stunde", value: 3600 },
          { name: "1 Tag (24 Std.)", value: 86400 },
          { name: "1 Woche (7 Tage)", value: 604800 },
          { name: "Timeout aufheben (0 Sek.)", value: 0 }
        )
    )
    .addStringOption((option) =>
      option
        .setName("grund")
        .setDescription("Begründung für die Maßnahme.")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied", true);
    const durationSeconds = interaction.options.getInteger("dauer", true);
    const reason = interaction.options.getString("grund") || "Keine Begründung angegeben";

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Mitglied wurde auf diesem Server nicht gefunden.", ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({
        content: "❌ Dieses Mitglied kann nicht moderiert werden (höhere Rolle oder Administrator).",
        ephemeral: true,
      });
      return;
    }

    const durationMs = durationSeconds * 1000;
    const durationLabel =
      durationSeconds === 0
        ? "Aufgehoben"
        : durationSeconds === 60
        ? "1 Minute"
        : durationSeconds === 300
        ? "5 Minuten"
        : durationSeconds === 600
        ? "10 Minuten"
        : durationSeconds === 3600
        ? "1 Stunde"
        : durationSeconds === 86400
        ? "1 Tag"
        : "1 Woche";

    try {
      await member.timeout(durationSeconds === 0 ? null : durationMs, reason);

      const modCase = await moderationService.createCase(
        interaction.guild,
        interaction.user,
        targetUser,
        "TIMEOUT",
        reason,
        { duration: durationLabel, client: interaction.client }
      );

      const embed = new EmbedBuilder()
        .setColor(durationSeconds === 0 ? 0x57f287 : 0xe67e22)
        .setTitle(durationSeconds === 0 ? "🔊 Timeout aufgehoben" : "🔇 Timeout verhängt")
        .setDescription(`Aktion für **${targetUser.tag || targetUser.username}** erfolgreich ausgeführt.`)
        .addFields(
          { name: "Fall-ID", value: `#${modCase.id}`, inline: true },
          { name: "Dauer", value: durationLabel, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true }
        );

      if (durationSeconds > 0 && modCase.xpLost) {
        embed.addFields({
          name: "📉 XP-Abzug",
          value: `-${modCase.xpLost} XP (Neues Level: **${modCase.newLevel ?? 1}**)`,
          inline: true,
        });
      }

      embed.addFields({ name: "Begründung", value: reason, inline: false });
      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Fehler beim Ausführen des Timeouts: ${error.message}`, ephemeral: true });
    }
  },
};

export default timeoutCommand;
