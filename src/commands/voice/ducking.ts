import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { musicPrefsService } from "../../services/musicPrefsService";
import { voiceDuckingService } from "../../services/voiceDuckingService";

/** Baut die Übersichts-Anzeige der aktuellen Einstellung. */
function statusEmbed(guildId: string, guildName: string) {
  const s = musicPrefsService.getDucking(guildId);
  const aktiv = voiceDuckingService.isActive(guildId);
  return new EmbedBuilder()
    .setColor(s.enabled ? 0x57f287 : 0x99aab5)
    .setTitle("🎚️ Leiser beim Sprechen (Ducking)")
    .setDescription(
      s.enabled
        ? `Sobald jemand im Sprachkanal redet, sinkt die Musik auf **${s.level} %** und wird nach **${
            s.releaseMs < 1000 ? `${s.releaseMs} ms` : `${(s.releaseMs / 1000).toLocaleString("de-DE")} s`
          }** wieder lauter.`
        : "Ducking ist **ausgeschaltet** - die Lautstärke bleibt beim Sprechen unverändert."
    )
    .addFields(
      { name: "Status", value: s.enabled ? "✅ An" : "⛔ Aus", inline: true },
      { name: "Absenken auf", value: `${s.level} %`, inline: true },
      { name: "Verzögerung", value: `${s.releaseMs} ms`, inline: true }
    )
    .setFooter({
      text: aktiv
        ? `Läuft gerade auf ${guildName} - Änderungen wirken sofort.`
        : "Gilt ab der nächsten Wiedergabe.",
    });
}

const duckingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ducking")
    .setDescription("Musik automatisch leiser stellen, wenn jemand spricht.")
    .addSubcommand((s) => s.setName("status").setDescription("Zeigt die aktuelle Einstellung."))
    .addSubcommand((s) => s.setName("an").setDescription("Schaltet das Leiserstellen ein."))
    .addSubcommand((s) => s.setName("aus").setDescription("Schaltet das Leiserstellen aus."))
    .addSubcommand((s) =>
      s
        .setName("staerke")
        .setDescription("Auf wie viel Prozent abgesenkt wird (kleiner = leiser).")
        .addIntegerOption((o) =>
          o.setName("prozent").setDescription("5 bis 100 - Standard ist 35").setMinValue(5).setMaxValue(100).setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("verzoegerung")
        .setDescription("Wie lange nach dem Sprechen gewartet wird, bis es wieder lauter wird.")
        .addIntegerOption((o) =>
          o
            .setName("millisekunden")
            .setDescription("100 bis 5000 - Standard ist 800")
            .setMinValue(100)
            .setMaxValue(5000)
            .setRequired(true)
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "status") {
      await interaction.reply({ embeds: [statusEmbed(guildId, interaction.guild.name)], ephemeral: true });
      return;
    }

    // Ändern darf nur, wer den Server verwalten darf
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild) && member?.id !== interaction.guild.ownerId) {
      await interaction.reply({ content: "❌ Dafür brauchst du „Server verwalten“.", ephemeral: true });
      return;
    }

    const patch =
      sub === "an"
        ? { enabled: true }
        : sub === "aus"
          ? { enabled: false }
          : sub === "staerke"
            ? { level: interaction.options.getInteger("prozent", true) }
            : { releaseMs: interaction.options.getInteger("millisekunden", true) };

    const settings = musicPrefsService.setDucking(guildId, patch);
    // Sofort auf eine laufende Wiedergabe anwenden
    voiceDuckingService.applySettings(guildId, settings);
    console.log(`[Ducking] ${interaction.user.tag}: ${settings.enabled ? `an, ${settings.level} %` : "aus"} auf ${interaction.guild.name}`);

    await interaction.reply({ embeds: [statusEmbed(guildId, interaction.guild.name)] });
  },
};

export default duckingCommand;
