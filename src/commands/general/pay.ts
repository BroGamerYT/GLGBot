import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { economyService } from "../../services/economyService";
import { moduleService } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const payCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Überweise einem anderen Server-Mitglied Coins.")
    .addUserOption((opt) =>
      opt.setName("mitglied").setDescription("Der Empfänger der Überweisung.").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("betrag").setDescription("Die Anzahl der zu überweisenden Coins (mindestens 1).").setMinValue(1).setRequired(true)
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

    const targetUser = interaction.options.getUser("mitglied", true);
    const amount = interaction.options.getInteger("betrag", true);

    if (targetUser.bot) {
      await interaction.reply({
        content: "❌ Du kannst keinen Bots Geld überweisen.",
        ephemeral: true,
      });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ Du kannst dir selbst kein Geld überweisen.",
        ephemeral: true,
      });
      return;
    }

    const cfg = economyService.getConfig(interaction.guild.id);
    const result = economyService.transferCoins(
      interaction.guild.id,
      interaction.user.id,
      targetUser.id,
      amount,
      interaction.user.tag,
      targetUser.tag
    );

    if (!result.success) {
      await interaction.reply({
        content: `❌ **Überweisung fehlgeschlagen:** ${result.error}`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("💸 Überweisung erfolgreich ausgeführt!")
      .setDescription(
        `Du hast soeben erfolgreich **${result.netAmount?.toLocaleString("de-DE")} ${cfg.currencyName}** an <@${targetUser.id}> überwiesen.`
      )
      .addFields(
        {
          name: "📤 Sender",
          value: `<@${interaction.user.id}>\nNeuer Kontostand: **${result.fromBalance?.toLocaleString("de-DE")} ${cfg.currencySymbol}**`,
          inline: true,
        },
        {
          name: "📥 Empfänger",
          value: `<@${targetUser.id}>\nNeuer Kontostand: **${result.toBalance?.toLocaleString("de-DE")} ${cfg.currencySymbol}**`,
          inline: true,
        }
      )
      .setFooter({ text: `${BRANDING.community} Economy • Überweisung` })
      .setTimestamp();

    if (result.fee && result.fee > 0) {
      embed.addFields({
        name: "🏷️ Server-Überweisungsgebühr",
        value: `-${result.fee} ${cfg.currencySymbol} (${cfg.payFeePercent}%)`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default payCommand;
