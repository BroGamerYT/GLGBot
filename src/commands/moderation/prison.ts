import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { checkModeration } from "../../utils/modChecks";
import {
  prisonService,
  parseDurationToMinutes,
  formatDurationMinutes,
} from "../../services/prisonService";

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
        .setDescription("Steckt ein Mitglied ins Gefängnis (-1.000 XP, Voice-Knast & Rollen-Entzug).")
        .addUserOption((opt) =>
          opt.setName("mitglied").setDescription("Das Mitglied, das inhaftiert werden soll.").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("grund").setDescription("Begründung für die Inhaftierung.").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("dauer")
            .setDescription("Dauer der Inhaftierung (z. B. 60m, 2h, 1d oder leer für unbegrenzt).")
            .setRequired(false)
            .addChoices(
              { name: "15 Minuten", value: "15m" },
              { name: "30 Minuten", value: "30m" },
              { name: "60 Minuten (1 Stunde)", value: "60m" },
              { name: "2 Stunden", value: "2h" },
              { name: "6 Stunden", value: "6h" },
              { name: "12 Stunden", value: "12h" },
              { name: "24 Stunden (1 Tag)", value: "24h" },
              { name: "3 Tage", value: "3d" },
              { name: "7 Tage (1 Woche)", value: "7d" },
              { name: "Dauerhaft (unbegrenzt)", value: "0" }
            )
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
      const durationInput = interaction.options.getString("dauer");
      const durationMinutes = parseDurationToMinutes(durationInput);

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
        interaction.client,
        durationMinutes
      );

      if (!result.ok) {
        await interaction.editReply({ content: `❌ Fehler: ${result.error}` });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const durationDisplay = durationMinutes
        ? `${formatDurationMinutes(durationMinutes)} (bis <t:${now + durationMinutes * 60}:R>)`
        : "Dauerhaft (bis Freilassung)";

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Mitglied inhaftiert")
        .setDescription(`**${targetUser.tag || targetUser.username}** wurde erfolgreich ins Gefängnis gesteckt.`)
        .addFields(
          { name: "Mitglied", value: `<@${targetUser.id}>`, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📉 Strafe", value: "-1.000 XP & Isolierung", inline: true },
          { name: "⏳ Dauer", value: durationDisplay, inline: true },
          { name: "🔊 Voice-Knast", value: "In Gefängnis-Voice verschoben", inline: true },
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
            .map((p, idx) => {
              const dateTimestamp = Math.floor(new Date(p.imprisonedAt).getTime() / 1000);
              let expiryInfo = "";
              if (p.expiresAt) {
                const expTimestamp = Math.floor(new Date(p.expiresAt).getTime() / 1000);
                expiryInfo = ` • ⏳ Ablauf: <t:${expTimestamp}:R>`;
              } else {
                expiryInfo = ` • ⏳ Dauerhaft`;
              }

              return (
                `**${idx + 1}.** <@${p.userId}> (${p.tag})\n` +
                `└ Grund: *${p.reason}* • Von: **${p.imprisonedBy}** (<t:${dateTimestamp}:R>)${expiryInfo}`
              );
            })
            .join("\n\n")
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default prisonCommand;
