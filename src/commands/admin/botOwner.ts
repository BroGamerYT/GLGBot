import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { guildAccessService } from "../../services/guildAccessService";
import { BRANDING } from "../../config/branding";

const botOwnerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("bot-owner")
    .setDescription("Verwaltet die Bot-Besitzer für das Web-Dashboard und Server-Freigaben.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt an, wer aktuell als Bot-Besitzer anerkannt wird.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("claim")
        .setDescription("Trägt dich selbst als Bot-Besitzer ein (für Administratoren & Bot-Hoster).")
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Fügt einen weiteren Nutzer als Bot-Besitzer hinzu.")
        .addUserOption((opt) =>
          opt
            .setName("nutzer")
            .setDescription("Das Discord-Mitglied, das Bot-Besitzer werden soll")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Entfernt einen Nutzer aus der Bot-Besitzer Liste.")
        .addUserOption((opt) =>
          opt
            .setName("nutzer")
            .setDescription("Das Discord-Mitglied, dem der Besitzer-Status entzogen wird")
            .setRequired(true)
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction, client) => {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === "status") {
      const ownerIds = guildAccessService.getBotOwnerIds(client);
      const isCallerOwner = guildAccessService.isBotOwner(userId, client);
      const stored = guildAccessService.getStoredOwners();
      const appOwner = client.application?.owner;
      const appOwnerName = (appOwner as any)?.tag || (appOwner as any)?.name || (appOwner?.id ? `<@${appOwner.id}>` : "Nicht ermittelt");

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👑 Bot-Besitzer Status · ${BRANDING.bot}`)
        .setDescription(
          `Der Bot-Besitzer hat vollen Zugriff auf die **Server-Freigabe** (/servers) im Dashboard und darf bestimmen, auf welchen Servern der Bot aktiv sein darf.`
        )
        .addFields(
          {
            name: "🤖 Discord Application Owner",
            value: `${appOwnerName} (\`${appOwner?.id || "N/A"}\`)`,
            inline: false,
          },
          {
            name: "📁 Gespeicherte Besitzer (data/bot_owner.json)",
            value:
              stored.length > 0
                ? stored.map((o) => `• <@${o.id}> (\`${o.id}\`)`).join("\n")
                : "*Keine manuell gespeichert*",
            inline: false,
          },
          {
            name: "🔑 Dein aktueller Status",
            value: isCallerOwner
              ? "✅ **Du bist als Bot-Besitzer anerkannt!**"
              : "❌ Du bist aktuell nicht als Bot-Besitzer hinterlegt.",
            inline: false,
          }
        )
        .setFooter({ text: `${interaction.guild?.name || BRANDING.community}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "claim") {
      const added = guildAccessService.addBotOwner(userId, interaction.user.tag, "Self-Claim (/bot-owner claim)");
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("👑 Bot-Besitz erfolgreich beansprucht!")
        .setDescription(
          `Du (**${interaction.user.tag}**, \`${userId}\`) wurdest als Bot-Besitzer in \`data/bot_owner.json\` eingetragen.\n\n` +
            `Du hast ab sofort vollen Zugriff auf das Menü **Server-Freigabe** auf der Website!`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "add") {
      const target = interaction.options.getUser("nutzer", true);
      guildAccessService.addBotOwner(target.id, target.tag, `${interaction.user.tag} (/bot-owner add)`);

      await interaction.reply({
        content: `✅ <@${target.id}> (${target.tag}) wurde erfolgreich als Bot-Besitzer hinzugefügt!`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "remove") {
      const target = interaction.options.getUser("nutzer", true);
      guildAccessService.removeBotOwner(target.id);

      await interaction.reply({
        content: `🗑️ <@${target.id}> (${target.tag}) wurde aus der Liste der Bot-Besitzer entfernt.`,
        ephemeral: true,
      });
      return;
    }
  },
};

export default botOwnerCommand;
