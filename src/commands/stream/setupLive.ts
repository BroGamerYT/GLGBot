import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder 
} from "discord.js";
import { Command } from "../../types";
import { liveStreamService } from "../../services/liveStreamService";

const setupLiveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-live")
    .setDescription("Konfiguriert das dynamische Live-Streamer-Kanal System.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Richtet die Live-Rolle und Ziel-Kategorie für Live-Kanäle ein.")
        .addRoleOption((opt) =>
          opt
            .setName("rolle")
            .setDescription("Die Rolle, die Live-Streamer erhalten (z. B. @Live).")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kategorie")
            .setDescription("Die Kategorie, in der die Live-Kanäle erstellt werden sollen.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("kanal_art")
            .setDescription("Art des Live-Kanals: Sprachkanal oder Textkanal.")
            .setRequired(false)
            .addChoices(
              { name: "🔊 Sprachkanal mit Link-Status (Empfohlen)", value: "voice" },
              { name: "💬 Textkanal mit Ankündigung", value: "text" }
            )
        )
        .addBooleanOption((opt) =>
          opt
            .setName("auto_rolle")
            .setDescription("Vergibt die Live-Rolle automatisch, wenn jemand in Discord streamt (Twitch/YouTube).")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt die aktuelle Live-Stream Konfiguration an.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert das dynamische Live-Kanal-System.")
    ),

  execute: async (interaction) => {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set") {
      const role = interaction.options.getRole("rolle", true);
      const category = interaction.options.getChannel("kategorie", false);
      const channelType = (interaction.options.getString("kanal_art", false) || "voice") as "voice" | "text";
      const autoRole = interaction.options.getBoolean("auto_rolle", false) ?? true;

      liveStreamService.setConfig(
        interaction.guildId,
        role.id,
        category ? category.id : undefined,
        channelType,
        autoRole
      );

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("🔴 Live-Stream System erfolgreich eingerichtet!")
        .setDescription(
          `Sobald ein Mitglied die Rolle <@&${role.id}> erhält (oder per Auto-Erkennung streamt), erstellt der Bot automatisch einen Live-Kanal **\`🔴・[Name] ist live\`** mit Stream-Link!`
        )
        .addFields(
          { name: "🎭 Live-Rolle", value: `<@&${role.id}>`, inline: true },
          { name: "📁 Ziel-Kategorie", value: category ? `<#${category.id}>` : "*Ganz oben*", inline: true },
          { name: "📡 Kanal-Art", value: channelType === "voice" ? "🔊 Sprachkanal (mit Link-Status)" : "💬 Textkanal", inline: true },
          { name: "🤖 Auto-Erkennung", value: autoRole ? "✅ Aktiv (bei Twitch/YouTube-Stream)" : "❌ Deaktiviert (nur manuelle Rolle)", inline: true }
        )
        .setFooter({ text: "BroBot Creator & Streamer Suite" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "status") {
      const config = liveStreamService.getConfig(interaction.guildId);

      if (!config) {
        await interaction.reply({
          content: "ℹ️ Auf diesem Server ist aktuell **kein** Live-Stream-System eingerichtet. Nutze `/setup-live set`.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("🔴 Live-Stream System Status")
        .addFields(
          { name: "🎭 Live-Rolle", value: `<@&${config.liveRoleId}>`, inline: true },
          { name: "📁 Ziel-Kategorie", value: config.categoryId ? `<#${config.categoryId}>` : "*Automatisch*", inline: true },
          { name: "📡 Kanal-Art", value: config.channelType === "voice" ? "🔊 Sprachkanal" : "💬 Textkanal", inline: true },
          { name: "🤖 Auto-Erkennung", value: config.autoRole ? "✅ Aktiv" : "❌ Aus", inline: true }
        )
        .setFooter({ text: "BroBot Creator & Streamer Suite" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "disable") {
      liveStreamService.disableConfig(interaction.guildId);
      await interaction.reply({
        content: "🛑 Das Live-Stream-System wurde für diesen Server deaktiviert.",
        ephemeral: true,
      });
      return;
    }
  },
};

export default setupLiveCommand;
