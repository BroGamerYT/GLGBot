import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { statsService } from "../../services/statsService";

const voiceStatsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("voice-stats")
    .setDescription("Zeigt deine Sprachkanal-Statistik und deine Top Talk-Partner (mit wem am längsten gelabert).")
    .addUserOption((opt) =>
      opt.setName("mitglied").setDescription("Das Mitglied, dessen Voice-Statistik du sehen möchtest.").setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("mitglied") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const profile = statsService.getUserProfile(interaction.guild.id, targetUser.id);
    if (!profile) {
      statsService.getOrCreateUser(interaction.guild, targetUser);
    }

    const updatedProfile = statsService.getUserProfile(interaction.guild.id, targetUser.id)!;
    const { stats } = updatedProfile;

    // Finde Talk-Partner
    const partners = statsService.getTopTalkPartners(interaction.guild.id, targetUser.id, 5);

    // Mitglied seit
    const joinedDate = member?.joinedAt
      ? member.joinedAt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "Unbekannt";

    const daysOnServer = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setAuthor({
        name: `Voice- & Talk-Statistik von ${targetUser.tag || targetUser.username}`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: "🎙️ Gesamte Voice-Zeit",
          value: `**${statsService.formatMinutes(stats.voiceMinutes)}** (${stats.voiceMinutes} Minuten im Talk)`,
          inline: true,
        },
        {
          name: "📅 Auf dem Server seit",
          value: `${joinedDate} (vor **${daysOnServer}** Tagen)`,
          inline: true,
        }
      );

    if (partners.length === 0) {
      embed.addFields({
        name: "👥 Top Talk-Partner (Gemeinsam im Call)",
        value: "Noch keine gemeinsamen Talk-Sitzungen mit anderen Mitgliedern aufgezeichnet.\nJoint zusammen einem Sprachkanal, um die Zeit zu erfassen!",
        inline: false,
      });
    } else {
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const partnerLines = partners.map((p, i) => {
        const medal = medals[i] || `#${i + 1}`;
        return `${medal} **${p.tag}** — **${statsService.formatMinutes(p.minutes)}** gemeinsam im Talk`;
      });

      embed.addFields({
        name: "👥 Top Talk-Partner (Mit wem am längsten gelabert)",
        value: partnerLines.join("\n"),
        inline: false,
      });
    }

    embed.setFooter({ text: "Tracking aktualisiert sich minütlich bei Anwesenheit im Voice" }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export default voiceStatsCommand;
