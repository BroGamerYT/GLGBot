import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { statsService } from "../../services/statsService";

const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Zeigt die Top 10 Rangliste der aktivsten Server-Mitglieder nach Level und XP."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const top = statsService.getTopLevels(interaction.guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🏆 Level & Aktivitäts-Rangliste")
      .setDescription("Die 10 aktivsten Mitglieder auf GermanyLanGame basierend auf Chat & Voice:")
      .setTimestamp();

    if (top.length === 0) {
      embed.setDescription("Es wurden bisher noch keine XP auf diesem Server gesammelt. Schreibt im Chat oder joint einem Talk!");
    } else {
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((u, i) => {
        const medal = medals[i] || `#${i + 1}`;
        return `${medal} **${u.tag}** — **Level ${u.level}** (${u.xp.toLocaleString("de-DE")} XP) • 💬 ${u.messagesCount} Msgs • 🎙️ ${statsService.formatMinutes(u.voiceMinutes)}`;
      });
      embed.setDescription(lines.join("\n\n"));
    }

    embed.setFooter({ text: "Tipp: Nutze /rank um dein persönliches Level einzusehen!" });
    await interaction.reply({ embeds: [embed] });
  },
};

export default leaderboardCommand;
