import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { economyService } from "../../services/economyService";
import { moduleService } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Zeigt deinen aktuellen Kontostand, deinen Rang und deine Transaktionen an.")
    .addUserOption((opt) =>
      opt.setName("mitglied").setDescription("Das Mitglied, dessen Kontostand du prüfen möchtest.").setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    if (!moduleService.isEnabled(interaction.guild.id, "economy")) {
      await interaction.reply({
        content: "⚠️ Das Wirtschafts- und Shop-Modul ist auf diesem Server aktuell deaktiviert.",
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("mitglied") || interaction.user;
    const cfg = economyService.getConfig(interaction.guild.id);
    const wallet = economyService.getOrCreateWallet(interaction.guild.id, target.id, target.tag);
    const rank = economyService.getUserRank(interaction.guild.id, target.id);
    const recentTx = economyService.getUserTransactions(interaction.guild.id, target.id, 5);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({
        name: `Konto von ${target.tag || target.username}`,
        iconURL: target.displayAvatarURL(),
      })
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        {
          name: `${cfg.currencySymbol} Kontostand`,
          value: `**${wallet.balance.toLocaleString("de-DE")} ${cfg.currencyName}**`,
          inline: true,
        },
        {
          name: "🏆 Vermögens-Rang",
          value: `#${rank}`,
          inline: true,
        },
        {
          name: "📈 Gesamt verdient",
          value: `${wallet.totalEarned.toLocaleString("de-DE")} ${cfg.currencySymbol}`,
          inline: true,
        },
        {
          name: "📉 Ausgegeben",
          value: `${wallet.totalSpent.toLocaleString("de-DE")} ${cfg.currencySymbol}`,
          inline: true,
        }
      )
      .setFooter({ text: `${BRANDING.community} Community-Wirtschaft • /pay & /shop` })
      .setTimestamp();

    if (recentTx.length > 0) {
      const txLines = recentTx.map((t) => {
        const sign = t.amount >= 0 ? "+" : "";
        const time = `<t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>`;
        return `• ${time} **${sign}${t.amount.toLocaleString("de-DE")} ${cfg.currencySymbol}** — *${t.reason}*`;
      });
      embed.addFields({
        name: "📜 Letzte Transaktionen",
        value: txLines.join("\n"),
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📜 Letzte Transaktionen",
        value: "*Noch keine Transaktionen vorhanden. Schreibe im Chat, joine Sprachkanälen oder nutze /daily!*",
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default balanceCommand;
