import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { statsService } from "../../services/statsService";

const topVoiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("top-voice")
    .setDescription("Zeigt die Top 10 Rangliste der Mitglieder mit der längsten Voice- & Talkzeit auf dem Server."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const top = statsService.getTopVoice(interaction.guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle("🎙️ Top 10 Voice-Rangliste")
      .setDescription("Die Mitglieder mit der längsten Sprachkanal-Aktivität auf dem Server:")
      .setTimestamp();

    if (top.length === 0) {
      embed.setDescription("Es wurde bisher noch keine Sprachzeit erfasst. Joint einfach einem Sprachkanal!");
    } else {
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((u, i) => {
        const medal = medals[i] || `#${i + 1}`;
        return `${medal} **${u.tag}** — **${statsService.formatMinutes(u.voiceMinutes)}** (${u.voiceMinutes} Min.) • Level ${u.level}`;
      });
      embed.setDescription(lines.join("\n\n"));
    }

    embed.setFooter({ text: "Tipp: Mit /voice-stats siehst du, mit wem du am längsten gequatscht hast!" });
    await interaction.reply({ embeds: [embed] });
  },
};

export default topVoiceCommand;
