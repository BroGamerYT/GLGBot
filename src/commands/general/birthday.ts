import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { birthdayService } from "../../services/birthdayService";

const birthdayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setNameLocalizations({ de: "geburtstag" })
    .setDescription("Geburtstag eintragen und anstehende Geburtstage anzeigen.")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setNameLocalizations({ de: "eintragen" })
        .setDescription("Trägt deinen Geburtstag ein (nur Tag & Monat).")
        .addIntegerOption((o) => o.setName("tag").setDescription("Tag (1-31)").setMinValue(1).setMaxValue(31).setRequired(true))
        .addIntegerOption((o) => o.setName("monat").setDescription("Monat (1-12)").setMinValue(1).setMaxValue(12).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("remove").setNameLocalizations({ de: "entfernen" }).setDescription("Entfernt deinen Geburtstag."))
    .addSubcommand((sub) => sub.setName("list").setNameLocalizations({ de: "liste" }).setDescription("Zeigt die nächsten Geburtstage."))
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setNameLocalizations({ de: "einrichten" })
        .setDescription("Kanal für Glückwünsche festlegen und Geburtstags-Rolle anlegen (Server verwalten).")
        .addChannelOption((o) => o.setName("kanal").setDescription("Kanal für die Glückwünsche").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addBooleanOption((o) => o.setName("rolle").setDescription("Geburtstags-Rolle für 24 Std. vergeben? (Standard: ja)"))
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const day = interaction.options.getInteger("tag", true);
      const month = interaction.options.getInteger("monat", true);
      const err = birthdayService.setBirthday(guild.id, interaction.user.id, day, month);
      await interaction.reply({
        content: err ? `❌ ${err}` : `🎂 Gespeichert: **${birthdayService.formatDate(day, month)}**. Der Bot gratuliert dir an deinem Tag!`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "remove") {
      const ok = birthdayService.removeBirthday(guild.id, interaction.user.id);
      await interaction.reply({ content: ok ? "🗑️ Dein Geburtstag wurde entfernt." : "ℹ️ Du hattest keinen Geburtstag eingetragen.", ephemeral: true });
      return;
    }

    if (sub === "list") {
      const list = birthdayService.upcoming(guild.id, 10);
      const embed = new EmbedBuilder()
        .setColor(0xeb459e)
        .setTitle("🎂 Nächste Geburtstage")
        .setDescription(
          list.length === 0
            ? "Noch niemand hat seinen Geburtstag eingetragen. Mach den Anfang mit `/birthday set`!"
            : list
                .map((b) => `**${birthdayService.formatDate(b.day, b.month)}** · <@${b.userId}> ${b.daysUntil === 0 ? "🎉 **heute!**" : `· in ${b.daysUntil} Tag(en)`}`)
                .join("\n")
        );
      await interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
      return;
    }

    if (sub === "setup") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "❌ Dafür brauchst du „Server verwalten“.", ephemeral: true });
        return;
      }
      const channel = interaction.options.getChannel("kanal", true);
      const withRole = interaction.options.getBoolean("rolle") ?? true;
      birthdayService.setConfig(guild.id, { channelId: channel.id, roleId: withRole ? undefined : null });
      let roleText = "ohne Geburtstags-Rolle";
      if (withRole) {
        try {
          const role = await birthdayService.ensureRole(guild);
          roleText = `mit Rolle <@&${role.id}> (24 Std.)`;
        } catch (e: any) {
          roleText = `⚠️ Rolle konnte nicht angelegt werden: ${e?.message || e}`;
        }
      }
      await interaction.reply({ content: `✅ Glückwünsche kommen in <#${channel.id}>, ${roleText}.`, ephemeral: true, allowedMentions: { parse: [] } });
    }
  },
};

export default birthdayCommand;
