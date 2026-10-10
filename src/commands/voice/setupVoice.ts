import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder 
} from "discord.js";
import { Command } from "../../types";
import { tempVoiceService } from "../../services/tempVoiceService";

const setupVoiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-voice")
    .setDescription("Konfiguriert das 'Join to Create' temporäre Sprachkanal-System.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Legt den Master-Sprachkanal für temporäre Kanäle fest.")
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Der Sprachkanal, den Nutzer betreten müssen, um eine eigene Lobby zu erstellen.")
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kategorie")
            .setDescription("Optionale Kategorie, in der die neuen Lobbys erstellt werden sollen.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt die aktuelle 'Join to Create'-Konfiguration an.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert das temporäre Sprachkanal-System.")
    ),

  execute: async (interaction) => {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set") {
      const channel = interaction.options.getChannel("kanal", true);
      const category = interaction.options.getChannel("kategorie", false);

      tempVoiceService.setMasterChannel(
        interaction.guildId,
        channel.id,
        category ? category.id : undefined
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Join-to-Create erfolgreich eingerichtet!")
        .setDescription(
          `Sobald ein Mitglied **<#${channel.id}>** betritt, erstellt der Bot sofort einen eigenen temporären Sprachkanal.`
        )
        .addFields(
          { name: "🔊 Master-Kanal", value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
          { 
            name: "📁 Ziel-Kategorie", 
            value: category ? `<#${category.id}> (\`${category.name}\`)` : "*Gleiche Kategorie wie Master*", 
            inline: true 
          }
        )
        .setFooter({ text: "BroBot Voice-System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "status") {
      const config = tempVoiceService.getConfig(interaction.guildId);

      if (!config) {
        await interaction.reply({
          content: "ℹ️ Auf diesem Server ist aktuell **kein** Join-to-Create-Kanal eingerichtet. Nutze `/setup-voice set`.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎙️ Join-to-Create Status")
        .addFields(
          { name: "🔊 Master-Kanal", value: `<#${config.masterChannelId}>`, inline: true },
          { name: "📁 Ziel-Kategorie", value: config.categoryId ? `<#${config.categoryId}>` : "*Automatisch*", inline: true }
        )
        .setFooter({ text: "BroBot Voice-System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "disable") {
      tempVoiceService.disableMasterChannel(interaction.guildId);
      await interaction.reply({
        content: "🛑 Das Join-to-Create-System wurde für diesen Server deaktiviert.",
        ephemeral: true,
      });
      return;
    }
  },
};

export default setupVoiceCommand;
