import { 
  SlashCommandBuilder, 
  VoiceChannel, 
  PermissionFlagsBits, 
  EmbedBuilder,
  GuildMember
} from "discord.js";
import { Command } from "../../types";
import { tempVoiceService } from "../../services/tempVoiceService";

const voiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Verwalte deine eigene temporäre Sprachkanal-Lobby (VoiceMaster Style).")
    .addSubcommand((sub) =>
      sub
        .setName("lock")
        .setDescription("Sperrt deinen Kanal, sodass andere Mitglieder nicht mehr beitreten können.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("unlock")
        .setDescription("Entsperrt deinen Kanal wieder für alle.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("hide")
        .setDescription("Macht deinen Kanal für andere Server-Mitglieder unsichtbar.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("unhide")
        .setDescription("Macht deinen Kanal wieder für alle sichtbar.")
    )
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
        .setName("permit")
        .setDescription("Erlaubt einem bestimmten Nutzer den Zutritt (auch wenn gesperrt).")
        .addUserOption((opt) =>
          opt
            .setName("nutzer")
            .setDescription("Der Nutzer, der Zutritt erhalten soll.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reject")
        .setDescription("Entfernt einen Nutzer aus deiner Lobby und verweigert ihm den Zutritt.")
        .addUserOption((opt) =>
          opt
            .setName("nutzer")
            .setDescription("Der Nutzer, der gekickt und gesperrt werden soll.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("transfer")
        .setDescription("Überträgt die Leitung der Lobby an ein anderes Mitglied.")
        .addUserOption((opt) =>
          opt
            .setName("neuer_leiter")
            .setDescription("Das Mitglied, das die Lobby übernehmen soll.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("claim")
        .setDescription("Übernimm die Leitung der Lobby, falls der Ersteller gegangen ist.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("bitrate")
        .setDescription("Passe die Audioqualität deines Sprachkanals an.")
        .addIntegerOption((opt) =>
          opt
            .setName("kbps")
            .setDescription("Bitrate in kbps (z. B. 64, 96, 128, 256, 384).")
            .setRequired(true)
            .setMinValue(8)
            .setMaxValue(384)
        )
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

    const ownerId = tempVoiceService.getChannelOwner(voiceChannel.id);
    const isOwner = ownerId === interaction.user.id;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    const subcommand = interaction.options.getSubcommand();

    // 1. Claim darf jeder, wenn Owner nicht anwesend ist
    if (subcommand === "claim") {
      const isOwnerPresent = voiceChannel.members.has(ownerId || "");
      if (isOwnerPresent && !isOwner && !isAdmin) {
        await interaction.reply({
          content: `❌ Der aktuelle Leiter (<@${ownerId}>) ist noch in der Lobby!`,
          ephemeral: true,
        });
        return;
      }

      tempVoiceService.setChannelOwner(voiceChannel.id, interaction.user.id);
      await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
        ManageChannels: true,
        MoveMembers: true,
        Connect: true,
        Speak: true,
      });

      await interaction.reply({
        content: `👑 Du hast die Leitung von **${voiceChannel.name}** erfolgreich übernommen!`,
        ephemeral: true,
      });
      return;
    }

    // Für alle anderen Befehle muss der Nutzer der Ersteller oder Admin sein
    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: "❌ Nur der Ersteller dieser Lobby kann diesen Befehl ausführen.",
        ephemeral: true,
      });
      return;
    }

    const everyoneRole = interaction.guild?.roles.everyone;

    // --- LOCK & UNLOCK ---
    if (subcommand === "lock") {
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });
      }
      await interaction.reply({
        content: "🔒 Deine Lobby ist jetzt **gesperrt** (niemand Neues kann beitreten).",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "unlock") {
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: null });
      }
      await interaction.reply({
        content: "🔓 Deine Lobby ist jetzt wieder **für alle geöffnet**.",
        ephemeral: true,
      });
      return;
    }

    // --- HIDE & UNHIDE ---
    if (subcommand === "hide") {
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
      }
      await interaction.reply({
        content: "🙈 Deine Lobby ist jetzt **unsichtbar**.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "unhide") {
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
      }
      await interaction.reply({
        content: "👁️ Deine Lobby ist jetzt wieder **für alle sichtbar**.",
        ephemeral: true,
      });
      return;
    }

    // --- NAME & LIMIT ---
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

    // --- PERMIT & REJECT ---
    if (subcommand === "permit") {
      const targetUser = interaction.options.getUser("nutzer", true);
      await voiceChannel.permissionOverwrites.edit(targetUser.id, {
        Connect: true,
        ViewChannel: true,
      });
      await interaction.reply({
        content: `✅ <@${targetUser.id}> hat jetzt **Zutritt** zu deiner Lobby!`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "reject") {
      const targetUser = interaction.options.getUser("nutzer", true);

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({ content: "❌ Du kannst dich nicht selbst kicken.", ephemeral: true });
        return;
      }

      // Verweigere Zutritt
      await voiceChannel.permissionOverwrites.edit(targetUser.id, {
        Connect: false,
      });

      // Falls der Nutzer aktuell in der Lobby ist, trenne ihn / kicke ihn
      const targetMember = voiceChannel.members.get(targetUser.id);
      if (targetMember) {
        await targetMember.voice.disconnect("Aus temporärer Lobby verwiesen");
      }

      await interaction.reply({
        content: `🚫 <@${targetUser.id}> wurde aus der Lobby **entfernt und gesperrt**!`,
        ephemeral: true,
      });
      return;
    }

    // --- TRANSFER ---
    if (subcommand === "transfer") {
      const targetUser = interaction.options.getUser("neuer_leiter", true);
      const targetMember = voiceChannel.members.get(targetUser.id);

      if (!targetMember) {
        await interaction.reply({
          content: "❌ Das Mitglied muss sich in deiner Sprach-Lobby befinden, um die Leitung zu erhalten.",
          ephemeral: true,
        });
        return;
      }

      tempVoiceService.setChannelOwner(voiceChannel.id, targetUser.id);
      await voiceChannel.permissionOverwrites.edit(targetUser.id, {
        ManageChannels: true,
        MoveMembers: true,
        Connect: true,
        Speak: true,
      });

      await interaction.reply({
        content: `👑 Die Leitung der Lobby wurde erfolgreich an <@${targetUser.id}> übertragen!`,
      });
      return;
    }

    // --- BITRATE ---
    if (subcommand === "bitrate") {
      const kbps = interaction.options.getInteger("kbps", true);
      const bps = kbps * 1000;
      await voiceChannel.setBitrate(bps);
      await interaction.reply({
        content: `📶 Bitrate der Lobby auf **${kbps} kbps** gesetzt.`,
        ephemeral: true,
      });
      return;
    }
  },
};

export default voiceCommand;
