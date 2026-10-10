import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { statsService } from "../../services/statsService";

const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Zeigt dein aktuelles Level, gesammelte XP und Ranglisten-Position an.")
    .addUserOption((opt) =>
      opt.setName("mitglied").setDescription("Das Mitglied, dessen Rang du sehen möchtest.").setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied") || interaction.user;
    const profile = statsService.getUserProfile(interaction.guild.id, targetUser.id);

    if (!profile) {
      // Wenn der Nutzer noch keine Aktivität hat, lege Profil an
      statsService.getOrCreateUser(interaction.guild, targetUser);
    }

    const updatedProfile = statsService.getUserProfile(interaction.guild.id, targetUser.id)!;
    const { stats, rank, progress } = updatedProfile;

    // Erstelle Fortschrittsbalken
    const totalBars = 12;
    const filledBars = Math.round((progress.progressPercent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = "█".repeat(filledBars) + "░".repeat(Math.max(0, emptyBars));

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `Rangkarte von ${targetUser.tag || targetUser.username}`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏆 Rang", value: `#${rank}`, inline: true },
        { name: "⭐ Level", value: `${progress.level}`, inline: true },
        { name: "✨ Gesamt-XP", value: `${stats.xp.toLocaleString("de-DE")} XP`, inline: true },
        {
          name: `Fortschritt zu Level ${progress.level + 1}`,
          value: `\`[${progressBar}]\` **${progress.progressPercent}%** (${progress.currentXp} / ${progress.requiredXp} XP)`,
          inline: false,
        },
        { name: "💬 Chat-Nachrichten", value: `${stats.messagesCount.toLocaleString("de-DE")}`, inline: true },
        { name: "🎙️ Voice-Zeit", value: statsService.formatMinutes(stats.voiceMinutes), inline: true }
      )
      .setFooter({ text: "GermanyLanGame Level-System" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default rankCommand;
