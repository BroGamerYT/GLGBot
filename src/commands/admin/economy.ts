import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { economyService } from "../../services/economyService";
import { moduleService } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const economyAdminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Verwalte das Wirtschaftssystem und passe Nutzerguthaben an.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("geben")
        .setDescription("Fügt einem Mitglied Coins hinzu.")
        .addUserOption((opt) => opt.setName("mitglied").setDescription("Das Mitglied").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("betrag").setDescription("Anzahl der Coins").setMinValue(1).setRequired(true)
        )
        .addStringOption((opt) => opt.setName("grund").setDescription("Begründung").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("abziehen")
        .setDescription("Zieht einem Mitglied Coins ab.")
        .addUserOption((opt) => opt.setName("mitglied").setDescription("Das Mitglied").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("betrag").setDescription("Anzahl der Coins").setMinValue(1).setRequired(true)
        )
        .addStringOption((opt) => opt.setName("grund").setDescription("Begründung").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("setzen")
        .setDescription("Setzt das Guthaben eines Mitglieds auf einen festen Wert.")
        .addUserOption((opt) => opt.setName("mitglied").setDescription("Das Mitglied").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("betrag").setDescription("Neuer Kontostand").setMinValue(0).setRequired(true)
        )
        .addStringOption((opt) => opt.setName("grund").setDescription("Begründung").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Setzt das Guthaben eines Mitglieds komplett auf 0 zurück.")
        .addUserOption((opt) => opt.setName("mitglied").setDescription("Das Mitglied").setRequired(true))
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

    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("mitglied", true);
    const cfg = economyService.getConfig(interaction.guild.id);
    const reason = interaction.options.getString("grund") || `Admin-Aktion durch ${interaction.user.tag}`;

    if (sub === "geben") {
      const amount = interaction.options.getInteger("betrag", true);
      const wallet = economyService.addCoins(
        interaction.guild.id,
        targetUser.id,
        amount,
        reason,
        "admin",
        interaction.user.id,
        targetUser.tag,
        interaction.user.tag
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🪙 Coins gutgeschrieben")
        .setDescription(
          `<@${targetUser.id}> wurden erfolgreich **+${amount.toLocaleString("de-DE")} ${cfg.currencyName}** gutgeschrieben.\n\n` +
          `🪙 **Neuer Kontostand:** **${wallet.balance.toLocaleString("de-DE")} ${cfg.currencySymbol}**\n` +
          `📝 **Grund:** ${reason}`
        )
        .setFooter({ text: `${BRANDING.community} Admin-Economy` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "abziehen") {
      const amount = interaction.options.getInteger("betrag", true);
      const wallet = economyService.removeCoins(
        interaction.guild.id,
        targetUser.id,
        amount,
        reason,
        "admin",
        interaction.user.id,
        targetUser.tag,
        interaction.user.tag
      );

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🪙 Coins abgezogen")
        .setDescription(
          `<@${targetUser.id}> wurden **-${amount.toLocaleString("de-DE")} ${cfg.currencyName}** abgezogen.\n\n` +
          `🪙 **Neuer Kontostand:** **${wallet.balance.toLocaleString("de-DE")} ${cfg.currencySymbol}**\n` +
          `📝 **Grund:** ${reason}`
        )
        .setFooter({ text: `${BRANDING.community} Admin-Economy` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "setzen") {
      const amount = interaction.options.getInteger("betrag", true);
      const wallet = economyService.setBalance(
        interaction.guild.id,
        targetUser.id,
        amount,
        reason,
        targetUser.tag
      );

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("🪙 Kontostand angepasst")
        .setDescription(
          `Der Kontostand von <@${targetUser.id}> wurde auf **${wallet.balance.toLocaleString("de-DE")} ${cfg.currencyName}** gesetzt.\n\n` +
          `📝 **Grund:** ${reason}`
        )
        .setFooter({ text: `${BRANDING.community} Admin-Economy` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "reset") {
      const wallet = economyService.setBalance(
        interaction.guild.id,
        targetUser.id,
        0,
        `Kompletter Reset durch ${interaction.user.tag}`,
        targetUser.tag
      );

      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle("🪙 Kontostand zurückgesetzt")
        .setDescription(`Das Konto von <@${targetUser.id}> wurde auf **0 ${cfg.currencyName}** zurückgesetzt.`)
        .setFooter({ text: `${BRANDING.community} Admin-Economy` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default economyAdminCommand;
