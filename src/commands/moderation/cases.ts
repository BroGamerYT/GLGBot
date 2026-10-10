import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { moderationService } from "../../services/moderationService";

const casesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("Verwaltet und zeigt Moderations-Fälle (Warns, Timeouts, Kicks, Bans).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Zeigt Details zu einem bestimmten Fall an.")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("Die Fall-ID (z.B. 1, 2, 3)").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Listet alle Fälle eines Nutzers auf.")
        .addUserOption((opt) =>
          opt.setName("mitglied").setDescription("Das Mitglied").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Löscht einen Fall aus der Datenbank.")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("Die Fall-ID").setRequired(true)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      const caseId = interaction.options.getInteger("id", true);
      const c = moderationService.getCaseById(interaction.guild.id, caseId);

      if (!c) {
        await interaction.reply({
          content: `❌ Fall #${caseId} wurde nicht gefunden.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(
          c.action === "WARN"
            ? 0xfee75c
            : c.action === "TIMEOUT"
            ? 0xe67e22
            : c.action === "KICK"
            ? 0xed4245
            : c.action === "BAN"
            ? 0x992d22
            : 0x57f287
        )
        .setTitle(`🛡️ Moderations-Fall #${c.id}`)
        .addFields(
          { name: "Aktion", value: `\`${c.action}\``, inline: true },
          { name: "Ziel", value: `<@${c.targetId}> (\`${c.targetTag}\`)`, inline: true },
          { name: "Moderator", value: `<@${c.moderatorId}> (\`${c.moderatorTag}\`)`, inline: true },
          { name: "Datum", value: new Date(c.createdAt).toLocaleString("de-DE"), inline: true }
        );

      if (c.duration) {
        embed.addFields({ name: "Dauer", value: c.duration, inline: true });
      }

      embed.addFields({ name: "Begründung", value: c.reason, inline: false });
      if (c.targetAvatar) {
        embed.setThumbnail(c.targetAvatar);
      }

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "user") {
      const targetUser = interaction.options.getUser("mitglied", true);
      const list = moderationService.getCases(interaction.guild.id, targetUser.id);

      if (list.length === 0) {
        await interaction.reply({
          content: `ℹ️ Keine Einträge für **${targetUser.tag || targetUser.username}** gefunden.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Akten für ${targetUser.tag || targetUser.username} (${list.length} Fall/Fälle)`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(
          list
            .slice(0, 10)
            .map(
              (c) =>
                `• **#${c.id}** [${c.action}] von <@${c.moderatorId}>: *${c.reason.slice(0, 60)}* (${new Date(
                  c.createdAt
                ).toLocaleDateString("de-DE")})`
            )
            .join("\n")
        );

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "delete") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "❌ Nur Administratoren können Moderationsfälle löschen.",
          ephemeral: true,
        });
        return;
      }

      const caseId = interaction.options.getInteger("id", true);
      const success = moderationService.deleteCase(interaction.guild.id, caseId);

      if (success) {
        await interaction.reply({ content: `✅ Fall #${caseId} wurde gelöscht.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Fall #${caseId} nicht gefunden.`, ephemeral: true });
      }
    }
  },
};

export default casesCommand;
