import { 
  SlashCommandBuilder, 
  VoiceChannel, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from "discord.js";
import { Command } from "../../types";
import { tempVoiceService } from "../../services/tempVoiceService";

const voiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Verwalte deine eigene temporäre Sprachkanal-Lobby.")
    .addSubcommand((sub) =>
      sub
        .setName("name")
        .setDescription("Benenne deine temporäre Lobby um.")
        .addStringOption((opt) =>
          opt
            .setName("titel")
            .setDescription("Der neue Name für deinen Sprachkanal.")
            .setRequired(true)
            .setMaxLength(32)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("limit")
        .setDescription("Begrenze die maximale Anzahl an Personen in deiner Lobby.")
        .addIntegerOption((opt) =>
          opt
            .setName("anzahl")
            .setDescription("Maximale Personenanzahl (0 für unbegrenzt, max. 99).")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("lock")
        .setDescription("Sperrt deinen Kanal, sodass andere Mitglieder nicht mehr beitreten können.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("unlock")
        .setDescription("Entsperrt deinen Kanal wieder für alle.")
    ),

  execute: async (interaction) => {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
      await interaction.reply({
        content: "❌ Du musst dich in deinem Sprachkanal befinden, um diesen Befehl zu nutzen.",
        ephemeral: true,
      });
      return;
    }

    // Prüfe ob der Kanal ein temporärer Kanal ist
    if (!tempVoiceService.isTempChannel(voiceChannel.id)) {
      await interaction.reply({
        content: "❌ Dieser Kanal ist kein temporärer 'Join to Create'-Kanal.",
        ephemeral: true,
      });
      return;
    }

    // Prüfe ob der Nutzer der Besitzer des Kanals ist (oder Administrator)
    const ownerId = tempVoiceService.getChannelOwner(voiceChannel.id);
    const isOwner = ownerId === interaction.user.id;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: "❌ Nur der Ersteller dieser Lobby kann den Kanal anpassen.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "name") {
      const newName = interaction.options.getString("titel", true);
      const formatted = `🔊・${newName}`;
      await voiceChannel.setName(formatted);
      await interaction.reply({
        content: `✅ Kanalname erfolgreich geändert zu: **${formatted}**`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "limit") {
      const limit = interaction.options.getInteger("anzahl", true);
      await voiceChannel.setUserLimit(limit);
      await interaction.reply({
        content: limit === 0 
          ? "✅ Das Teilnehmerlimit wurde **aufgehoben** (unbegrenzt)." 
          : `✅ Teilnehmerlimit erfolgreich auf **${limit} Personen** gesetzt.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "lock") {
      const everyoneRole = interaction.guild?.roles.everyone;
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, {
          Connect: false,
        });
      }
      await interaction.reply({
        content: "🔒 Deine Lobby ist jetzt **gesperrt** (niemand Neues kann beitreten).",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "unlock") {
      const everyoneRole = interaction.guild?.roles.everyone;
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, {
          Connect: null, // Auf Standard zurücksetzen
        });
      }
      await interaction.reply({
        content: "🔓 Deine Lobby ist jetzt wieder **für alle geöffnet**.",
        ephemeral: true,
      });
      return;
    }
  },
};

export default voiceCommand;
