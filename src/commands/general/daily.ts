import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { dailyService } from "../../services/dailyService";
import { BRANDING } from "../../config/branding";

const dailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Hole deine tägliche XP-Belohnung ab und baue deine Serie (Streak) aus!"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server genutzt werden.", ephemeral: true });
      return;
    }

    const res = await dailyService.claim(interaction.guild, interaction.user);

    if (res.onCooldown) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("⏳ Tägliche Belohnung noch nicht bereit")
        .setDescription(
          `Du hast deine tägliche Belohnung heute bereits abgeholt!\n\n` +
          `🕒 **Wartezeit:** Noch ca. **${dailyService.formatRemainingTime(res.cooldownRemainingMs || 0)}**\n` +
          `⏰ **Wieder verfügbar:** <t:${Math.floor((res.nextClaimTimestamp || 0) / 1000)}:R>\n` +
          `🔥 **Aktuelle Streak:** **${res.currentStreak} Tag(e)**`
        )
        .setFooter({ text: `${BRANDING.community} Daily Rewards` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    let desc =
      `Klasse, <@${interaction.user.id}>! Du hast deine tägliche Belohnung abgeholt.\n\n` +
      `✨ **XP-Belohnung:** **+${res.totalXp} XP** *(Basis: +${res.baseXp} XP${res.bonusXp > 0 ? ` + Streak-Bonus: +${res.bonusXp} XP` : ""})*` +
      (res.coins !== undefined ? `\n🪙 **Währungs-Bonus:** **+${res.coins} ${res.currencyName || "Coins"}**` : "") +
      `\n🔥 **Aktuelle Serie:** **${res.currentStreak} Tag(e)** in Folge!`;

    if (res.streakBroken) {
      desc += `\n⚠️ *Hinweis: Deine Serie wurde auf Tag 1 zurückgesetzt, da mehr als 36 Stunden vergangen sind.*`;
    }

    desc += `\n\n🕒 **Nächster Claim:** <t:${Math.floor(res.nextClaimTimestamp / 1000)}:R> (<t:${Math.floor(res.nextClaimTimestamp / 1000)}:f>)`;

    if (res.leveledUp) {
      desc += `\n\n🎉 **LEVEL-UP!** Du bist soeben auf **Level ${res.newLevel}** aufgestiegen! 🚀`;
      if (res.addedRoles && res.addedRoles.length > 0) {
        desc += `\n🎁 **Neue Belohnungs-Rolle(n):** ${res.addedRoles.map((r) => `<@&${r}>`).join(", ")}`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🎁 Tägliche Belohnung erhalten!")
      .setDescription(desc)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: `Tipp: Hole jeden Tag deine Belohnung ab, um den maximalen Streak-Bonus zu erhalten!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default dailyCommand;
