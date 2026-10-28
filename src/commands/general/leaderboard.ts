import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { statsService } from "../../services/statsService";
import { economyService } from "../../services/economyService";
import { moduleService } from "../../services/moduleService";

const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Zeigt die Top 10 Rangliste der aktivsten oder wohlhabendsten Mitglieder.")
    .addStringOption((opt) =>
      opt
        .setName("kategorie")
        .setDescription("Ranglisten-Kategorie")
        .addChoices(
          { name: "Level & Gesamt-XP (Standard)", value: "xp" },
          { name: "Wirtschaft & Coins", value: "coins" }
        )
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const category = interaction.options.getString("kategorie") || "xp";

    if (category === "coins") {
      if (!moduleService.isEnabled(interaction.guild.id, "economy")) {
        await interaction.reply({
          content: "⚠️ Das Wirtschafts- und Shop-Modul ist auf diesem Server aktuell deaktiviert.",
          ephemeral: true,
        });
        return;
      }

      const cfg = economyService.getConfig(interaction.guild.id);
      const topCoins = economyService.getLeaderboard(interaction.guild.id, 10);

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🪙 ${cfg.currencyName} Bestenliste`)
        .setDescription(`Die 10 wohlhabendsten Mitglieder auf **${interaction.guild.name}**:`)
        .setTimestamp();

      if (topCoins.length === 0) {
        embed.setDescription("Es wurden bisher noch keine Coins gesammelt. Verdiene Coins über Chat, Voice oder /daily!");
      } else {
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        const lines = topCoins.map((w, i) => {
          const medal = medals[i] || `#${i + 1}`;
          return `${medal} **${w.tag || `<@${w.userId}>`}** — **${w.balance.toLocaleString("de-DE")} ${cfg.currencyName}** *(Gesamt: ${w.totalEarned.toLocaleString("de-DE")} ${cfg.currencySymbol})*`;
        });
        embed.setDescription(lines.join("\n\n"));
      }

      embed.setFooter({ text: "Tipp: Nutze /balance für dein eigenes Konto oder /shop für Belohnungen!" });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Standard: Level & XP
    const top = statsService.getTopLevels(interaction.guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🏆 Level & Aktivitäts-Rangliste")
      .setDescription(`Die 10 aktivsten Mitglieder auf ${interaction.guild.name} basierend auf Chat & Voice:`)
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
