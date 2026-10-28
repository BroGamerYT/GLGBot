import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { giveawayService, parseDuration } from "../../services/giveawayService";

const giveawayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Verwalte Gewinnspiele und Verlosungen auf dem Server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Startet ein neues Giveaway mit Countdown und Teilnahme-Button.")
        .addStringOption((opt) =>
          opt
            .setName("dauer")
            .setDescription("Dauer des Giveaways (z. B. 10m, 1h, 2d, 1w).")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("gewinner")
            .setDescription("Anzahl der Gewinner (1 bis 20).")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addStringOption((opt) =>
          opt.setName("preis").setDescription("Der zu gewinnende Preis / Gegenstand.").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("rolle").setDescription("Optionale Rollen-Voraussetzung für die Teilnahme.").setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Zielkanal für das Giveaway (Standard: aktueller Kanal).")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Beendet ein aktives Giveaway vorzeitig und zieht die Gewinner.")
        .addStringOption((opt) =>
          opt.setName("nachricht_id").setDescription("Die Nachrichten-ID des Giveaways.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Lost neue Gewinner für ein bereits beendetes Giveaway aus.")
        .addStringOption((opt) =>
          opt.setName("nachricht_id").setDescription("Die Nachrichten-ID des Giveaways.").setRequired(true)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const dauerStr = interaction.options.getString("dauer", true);
      const winnerCount = interaction.options.getInteger("gewinner", true);
      const prize = interaction.options.getString("preis", true);
      const role = interaction.options.getRole("rolle");
      const targetChannel =
        (interaction.options.getChannel("kanal") as TextChannel | null) || (interaction.channel as TextChannel | null);

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({ content: "❌ Kein gültiger Textkanal gefunden.", ephemeral: true });
        return;
      }

      const durationMs = parseDuration(dauerStr);
      if (!durationMs) {
        await interaction.reply({
          content: "❌ Ungültiges Zeitformat! Nutze z. B. `30s`, `10m`, `2h`, `1d` oder `1w`.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const giveaway = await giveawayService.startGiveaway(
          targetChannel,
          interaction.user.id,
          prize,
          durationMs,
          winnerCount,
          role?.id
        );

        await interaction.editReply({
          content: `✅ Giveaway für **${giveaway.prize}** erfolgreich in <#${targetChannel.id}> gestartet!\nNachrichten-ID: \`${giveaway.id}\``,
        });
      } catch (e: any) {
        console.error("[GiveawayCommand] Fehler beim Starten:", e);
        await interaction.editReply({
          content: `❌ Fehler beim Erstellen des Giveaways: ${e?.message || "Unbekannter Fehler"}`,
        });
      }
      return;
    }

    if (sub === "end") {
      const msgId = interaction.options.getString("nachricht_id", true).trim();
      const existing = giveawayService.getGiveaway(msgId);
      if (!existing) {
        await interaction.reply({
          content: `❌ Kein Giveaway mit der Nachrichten-ID \`${msgId}\` gefunden.`,
          ephemeral: true,
        });
        return;
      }

      if (existing.ended) {
        await interaction.reply({
          content: `ℹ️ Dieses Giveaway ist bereits beendet. Nutze \`/giveaway reroll\`, um neue Gewinner zu ermitteln.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const ended = await giveawayService.endGiveaway(interaction.client, msgId);
      if (!ended) {
        await interaction.editReply({ content: "❌ Konnte Giveaway nicht beenden." });
        return;
      }

      await interaction.editReply({
        content: `✅ Giveaway \`${msgId}\` wurde vorzeitig beendet und Gewinner wurden gezogen!`,
      });
      return;
    }

    if (sub === "reroll") {
      const msgId = interaction.options.getString("nachricht_id", true).trim();
      const existing = giveawayService.getGiveaway(msgId);
      if (!existing) {
        await interaction.reply({
          content: `❌ Kein Giveaway mit der Nachrichten-ID \`${msgId}\` gefunden.`,
          ephemeral: true,
        });
        return;
      }

      if (!existing.ended) {
        await interaction.reply({
          content: `⚠️ Dieses Giveaway läuft noch! Nutze \`/giveaway end\`, um es zuerst zu beenden.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const winners = await giveawayService.rerollGiveaway(interaction.client, msgId);

      if (!winners || winners.length === 0) {
        await interaction.editReply({
          content: `ℹ️ Es konnten keine neuen Gewinner ermittelt werden (keine Teilnehmer vorhanden).`,
        });
      } else {
        await interaction.editReply({
          content: `✅ Reroll erfolgreich! Neue Gewinner: ${winners.map((w) => `<@${w}>`).join(", ")}`,
        });
      }
      return;
    }
  },
};

export default giveawayCommand;
