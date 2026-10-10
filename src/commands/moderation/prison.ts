import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { checkModeration } from "../../utils/modChecks";
import { prisonService } from "../../services/prisonService";

const prisonCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("prison")
    // In deutschem Discord heißt der Befehl /knast (englische Clients sehen /prison)
    .setNameLocalizations({ de: "knast" })
    .setDescription("Verwaltet das Gefängnis-System (Mitglieder inhaftieren & freilassen).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("lock")
        .setNameLocalizations({ de: "einsperren" })
        .setDescription("Steckt ein Mitglied ins Gefängnis (-1.000 XP & Rollen-Entzug).")
        .addUserOption((opt) =>
          opt.setName("mitglied").setDescription("Das Mitglied, das inhaftiert werden soll.").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("grund").setDescription("Begründung für die Inhaftierung.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("release")
        .setNameLocalizations({ de: "freilassen" })
        .setDescription("Lässt ein Mitglied aus dem Gefängnis frei und stellt Rollen wieder her.")
        .addUserOption((opt) =>
          opt.setName("mitglied").setDescription("Das Mitglied, das entlassen werden soll.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setNameLocalizations({ de: "liste" }).setDescription("Listet alle aktuell inhaftierten Mitglieder auf.")
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "lock") {
      const targetUser = interaction.options.getUser("mitglied", true);
      const reason = interaction.options.getString("grund", true);

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({ content: "❌ Du kannst dich nicht selbst ins Gefängnis stecken.", ephemeral: true });
        return;
      }

      if (targetUser.bot) {
        await interaction.reply({ content: "❌ Bots können nicht inhaftiert werden.", ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "❌ Mitglied auf dem Server nicht gefunden.", ephemeral: true });
        return;
      }

      const modProblem = await checkModeration(interaction, member);
      if (modProblem) {
        await interaction.reply({ content: `❌ ${modProblem}`, ephemeral: true });
        return;
      }

      // Rollen ändern + Kanäle sperren dauert länger als Discords 3-Sekunden-Limit -> erst "denkt nach…" anzeigen
      await interaction.deferReply();
      const result = await prisonService.imprison(
        interaction.guild,
        member,
        reason,
        {
          id: interaction.user.id,
          tag: interaction.user.tag || interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
        interaction.client
      );

      if (!result.ok) {
        await interaction.editReply({ content: `❌ Fehler: ${result.error}` });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Mitglied inhaftiert")
        .setDescription(`**${targetUser.tag || targetUser.username}** wurde erfolgreich ins Gefängnis gesteckt.`)
        .addFields(
          { name: "Mitglied", value: `<@${targetUser.id}>`, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📉 Strafe", value: "-1.000 XP & Isolierung", inline: true },
          { name: "Begründung", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (sub === "release") {
      const targetUser = interaction.options.getUser("mitglied", true);
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        await interaction.reply({ content: "❌ Mitglied auf dem Server nicht gefunden.", ephemeral: true });
        return;
      }

      await interaction.deferReply();
      const result = await prisonService.unprison(
        interaction.guild,
        member,
        {
          id: interaction.user.id,
          tag: interaction.user.tag || interaction.user.username,
        },
        interaction.client
      );

      if (!result.ok) {
        await interaction.editReply({ content: `❌ Fehler: ${result.error}` });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔓 Mitglied aus Gefängnis entlassen")
        .setDescription(`**${targetUser.tag || targetUser.username}** wurde entlassen und vorherige Rollen wiederhergestellt.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (sub === "list") {
      const prisoners = prisonService.getPrisonList(interaction.guild.id);

      if (prisoners.length === 0) {
        await interaction.reply({ content: "🕊️ Aktuell befindet sich niemand im Gefängnis.", ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🔒 Aktuell inhaftierte Mitglieder (${prisoners.length})`)
        .setDescription(
          prisoners
            .map(
              (p, idx) =>
                `**${idx + 1}.** <@${p.userId}> (${p.tag})\n` +
                `└ Grund: *${p.reason}* • Inhaftiert von: **${p.imprisonedBy}** (<t:${Math.floor(
                  new Date(p.imprisonedAt).getTime() / 1000
                )}:R>)`
            )
            .join("\n\n")
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default prisonCommand;
