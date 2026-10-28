import { 
  StringSelectMenuInteraction, 
  ModalSubmitInteraction, 
  ButtonInteraction, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  VoiceChannel, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ActivityType
} from "discord.js";
import { tempVoiceService } from "../services/tempVoiceService";
import { liveStreamService } from "../services/liveStreamService";
import { channelPasswordService } from "../services/channelPasswordService";
import { renameSafely, RENAME_LIMIT_HINT } from "../utils/rename";

export async function handleVoiceSelectMenu(interaction: StringSelectMenuInteraction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const voiceChannel = (member?.voice.channel || (interaction.channel?.type === ChannelType.GuildVoice ? interaction.channel : null)) as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: "❌ Du musst dich in deinem temporären Sprachkanal befinden, um dieses Menü zu nutzen.",
      ephemeral: true,
    });
    return;
  }

  const isTemp = tempVoiceService.isTempChannel(voiceChannel.id);
  const liveEntry = liveStreamService.getLiveEntryByChannel(voiceChannel.id);

  if (!isTemp && !liveEntry) {
    await interaction.reply({
      content: "❌ Dieser Sprachkanal ist kein temporärer 'Join to Create'- oder aktiver Streamer-Kanal.",
      ephemeral: true,
    });
    return;
  }

  const ownerId = liveEntry ? liveEntry.userId : tempVoiceService.getChannelOwner(voiceChannel.id);
  const isOwner = ownerId === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  const selected = interaction.values[0];

  // 1. Kanalbesitz übernehmen ("claim") darf auch ein Nicht-Owner, wenn der Owner weg ist
  if (selected === "claim") {
    const isOwnerPresent = voiceChannel.members.has(ownerId || "");
    if (isOwnerPresent && !isOwner && !isAdmin) {
      await interaction.reply({
        content: `❌ Der aktuelle Besitzer (<@${ownerId}>) befindet sich noch im Kanal!`,
        ephemeral: true,
      });
      return;
    }

    tempVoiceService.setChannelOwner(voiceChannel.id, interaction.user.id);
    await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      ManageChannels: true,
      MoveMembers: true,
      Connect: true,
      Speak: true,
    });

    await interaction.reply({
      content: `👑 Du hast den Besitz von **${voiceChannel.name}** erfolgreich übernommen!`,
      ephemeral: true,
    });
    return;
  }

  // Für alle anderen Aktionen muss der Nutzer Owner oder Admin sein
  if (!isOwner && !isAdmin) {
    await interaction.reply({
      content: "❌ Nur der Ersteller dieser Lobby kann die Einstellungen anpassen.",
      ephemeral: true,
    });
    return;
  }

  // --- KANAL-EINSTELLUNGEN ---
  if (selected === "name") {
    const modal = new ModalBuilder()
      .setCustomId("modal_voice_name")
      .setTitle("Lobby-Namen anpassen");

    const input = new TextInputBuilder()
      .setCustomId("voice_name_input")
      .setLabel("Neuer Name für deinen Kanal")
      .setStyle(TextInputStyle.Short)
      .setValue(voiceChannel.name.replace(/^🔊・/, ""))
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (selected === "limit") {
    const modal = new ModalBuilder()
      .setCustomId("modal_voice_limit")
      .setTitle("Nutzerlimit anpassen");

    const input = new TextInputBuilder()
      .setCustomId("voice_limit_input")
      .setLabel("Maximale Personen (0 für unbegrenzt, max 99)")
      .setStyle(TextInputStyle.Short)
      .setValue(voiceChannel.userLimit.toString())
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (selected === "game") {
    const game = member?.presence?.activities.find((a) => a.type === ActivityType.Playing);
    if (!game) {
      await interaction.reply({
        content: "❌ Es wurde kein aktives Spiel in deinem Discord-Status erkannt.",
        ephemeral: true,
      });
      return;
    }

    const newName = `🔊・${game.name}`.slice(0, 100);
    await interaction.deferReply({ ephemeral: true });
    const status = await renameSafely(voiceChannel, newName);
    await interaction.editReply({
      content: status === "done" ? `🎮 Kanalname erfolgreich auf dein Spiel gesetzt: **${newName}**` : RENAME_LIMIT_HINT,
    });
    return;
  }

  if (selected === "text") {
    const existingTextId = tempVoiceService.getTempTextChannel(voiceChannel.id);
    if (existingTextId && interaction.guild?.channels.cache.has(existingTextId)) {
      await interaction.reply({
        content: `ℹ️ Du hast bereits einen Textkanal für diese Lobby: <#${existingTextId}>`,
        ephemeral: true,
      });
      return;
    }

    const textChannel = await interaction.guild?.channels.create({
      name: `💬・${voiceChannel.name.replace(/^🔊・/, "")}`,
      type: ChannelType.GuildText,
      parent: voiceChannel.parentId || undefined,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        // Alle, die gerade in der Lobby sind (inkl. Besitzer), dürfen lesen & schreiben
        ...[...new Set([interaction.user.id, ...voiceChannel.members.keys()])].map((id) => ({
          id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        })),
      ],
    });

    if (textChannel) {
      tempVoiceService.setTempTextChannel(voiceChannel.id, textChannel.id);
      await interaction.reply({
        content: `💬 Privater Textkanal erstellt: <#${textChannel.id}> (wird automatisch mit der Voice-Lobby gelöscht).`,
        ephemeral: true,
      });
    }
    return;
  }

  if (selected === "pw_set") {
    const currentPw = channelPasswordService.getPassword(voiceChannel.id) || "";
    const modal = new ModalBuilder()
      .setCustomId("modal_voice_pw_set")
      .setTitle("Lobby-Passwort festlegen");

    const input = new TextInputBuilder()
      .setCustomId("voice_pw_input")
      .setLabel("Passwort für diese Lobby")
      .setStyle(TextInputStyle.Short)
      .setValue(currentPw)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (selected === "pw_remove") {
    channelPasswordService.removePassword(voiceChannel.id);
    const everyoneRole = interaction.guild?.roles.everyone;
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
    }
    await interaction.reply({
      content: "🔓 **Passwort entfernt!** Die Lobby ist wieder für alle geöffnet.",
      ephemeral: true,
    });
    return;
  }

  // --- BERECHTIGUNGEN ---
  const everyoneRole = interaction.guild?.roles.everyone;

  if (selected === "lock") {
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });
    }
    await interaction.reply({ content: "🔒 Lobby gesperrt (niemand Neues kann beitreten).", ephemeral: true });
    return;
  }

  if (selected === "unlock") {
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: null });
    }
    await interaction.reply({ content: "🔓 Lobby wieder für alle geöffnet.", ephemeral: true });
    return;
  }

  if (selected === "hide") {
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
    }
    await interaction.reply({ content: "🙈 Lobby ist jetzt für andere unsichtbar.", ephemeral: true });
    return;
  }

  if (selected === "unhide") {
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
    }
    await interaction.reply({ content: "👁️ Lobby ist jetzt wieder für alle sichtbar.", ephemeral: true });
    return;
  }
}

export async function handleVoiceModalSubmit(interaction: ModalSubmitInteraction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const voiceChannel = (member?.voice.channel || (interaction.channel?.type === ChannelType.GuildVoice ? interaction.channel : null)) as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: "❌ Du musst dich in deinem temporären Kanal befinden.",
      ephemeral: true,
    });
    return;
  }

  const isTemp = tempVoiceService.isTempChannel(voiceChannel.id);
  const liveEntry = liveStreamService.getLiveEntryByChannel(voiceChannel.id);

  if (!isTemp && !liveEntry) {
    await interaction.reply({
      content: "❌ Dieser Kanal ist kein verwalteter Sprachkanal.",
      ephemeral: true,
    });
    return;
  }

  // A. Passwort eingeben (jeder darf)
  if (interaction.customId === "modal_voice_pw_enter") {
    const inputPw = interaction.fields.getTextInputValue("voice_pw_enter_input").trim();
    const isCorrect = channelPasswordService.verifyPassword(voiceChannel.id, inputPw);

    if (!isCorrect) {
      await interaction.reply({
        content: "❌ **Falsches Passwort!** Bitte überprüfe deine Eingabe.",
        ephemeral: true,
      });
      return;
    }

    await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
      Connect: true,
      ViewChannel: true,
      Speak: true,
    });

    if (member?.voice.channelId) {
      await member.voice.setChannel(voiceChannel).catch(() => null);
    }

    await interaction.reply({
      content: `✅ **Passwort korrekt!** Du darfst der Lobby **${voiceChannel.name}** jetzt beitreten.`,
      ephemeral: true,
    });
    return;
  }

  // Für alle anderen Modals: Besitzer oder Admin
  const modalOwner = liveEntry ? liveEntry.userId : tempVoiceService.getChannelOwner(voiceChannel.id);
  if (modalOwner !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ Nur der Ersteller dieser Lobby kann die Einstellungen anpassen.", ephemeral: true });
    return;
  }

  if (interaction.customId === "modal_voice_pw_set") {
    const rawPw = interaction.fields.getTextInputValue("voice_pw_input").trim();
    if (!rawPw) {
      channelPasswordService.removePassword(voiceChannel.id);
      const everyoneRole = voiceChannel.guild.roles.everyone;
      if (everyoneRole) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
      }
      await interaction.reply({ content: "🔓 Passwort wurde entfernt und der Raum für alle geöffnet.", ephemeral: true });
      return;
    }

    channelPasswordService.setPassword(voiceChannel.id, rawPw);
    const everyoneRole = voiceChannel.guild.roles.everyone;
    if (everyoneRole) {
      await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false }).catch(() => null);
    }
    await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
      Connect: true,
      ViewChannel: true,
    }).catch(() => null);

    for (const [memberId] of voiceChannel.members) {
      await voiceChannel.permissionOverwrites.edit(memberId, { Connect: true }).catch(() => null);
    }

    await interaction.reply({
      content: `🔐 **Passwort erfolgreich festgelegt:** \`${rawPw}\`\nDer Raum wurde für @everyone gesperrt. Andere können mit **"Passwort eingeben"** beitreten!`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === "modal_voice_name") {
    const rawName = interaction.fields.getTextInputValue("voice_name_input").trim();
    const formatted = `🔊・${rawName}`;
    await interaction.deferReply({ ephemeral: true });
    const status = await renameSafely(voiceChannel, formatted);
    await interaction.editReply({
      content: status === "done" ? `✅ Kanalname erfolgreich geändert zu: **${formatted}**` : RENAME_LIMIT_HINT,
    });
    return;
  }

  if (interaction.customId === "modal_voice_limit") {
    const rawLimit = interaction.fields.getTextInputValue("voice_limit_input").trim();
    const parsedLimit = parseInt(rawLimit, 10);

    if (isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 99) {
      await interaction.reply({
        content: "❌ Bitte gib eine gültige Zahl zwischen 0 und 99 ein.",
        ephemeral: true,
      });
      return;
    }

    await voiceChannel.setUserLimit(parsedLimit);
    await interaction.reply({
      content: parsedLimit === 0
        ? "✅ Teilnehmerlimit aufgehoben (unbegrenzt)."
        : `✅ Teilnehmerlimit auf **${parsedLimit} Personen** gesetzt.`,
      ephemeral: true,
    });
    return;
  }
}

export async function handleVoiceButton(interaction: ButtonInteraction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const voiceChannel = (member?.voice.channel || (interaction.channel?.type === ChannelType.GuildVoice ? interaction.channel : null)) as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: "ℹ️ Du befindest dich aktuell in keinem verwalteten Sprachkanal.",
      ephemeral: true,
    });
    return;
  }

  const isTemp = tempVoiceService.isTempChannel(voiceChannel.id);
  const liveEntry = liveStreamService.getLiveEntryByChannel(voiceChannel.id);

  if (!isTemp && !liveEntry) {
    await interaction.reply({
      content: "ℹ️ Dieser Sprachkanal ist kein verwalteter Sprachkanal.",
      ephemeral: true,
    });
    return;
  }

  // 1. Passwort eingeben Button (jeder darf)
  if (interaction.customId === "voice_btn_enter_pw") {
    if (!channelPasswordService.hasPassword(voiceChannel.id)) {
      await interaction.reply({
        content: "ℹ️ Für diese Lobby ist aktuell kein Passwort eingerichtet. Du kannst direkt beitreten!",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_voice_pw_enter")
      .setTitle("Lobby-Passwort eingeben");

    const input = new TextInputBuilder()
      .setCustomId("voice_pw_enter_input")
      .setLabel("Passwort für diesen Raum eingeben")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // 2. Refresh Button
  if (interaction.customId === "voice_btn_refresh") {
    const ownerId = liveEntry ? liveEntry.userId : tempVoiceService.getChannelOwner(voiceChannel.id);
    const isOwnerOrAdmin = ownerId === interaction.user.id || !!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    const hasPw = channelPasswordService.hasPassword(voiceChannel.id);
    const actualPw = hasPw && isOwnerOrAdmin ? channelPasswordService.getPassword(voiceChannel.id) : null;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🎙️ Status: ${voiceChannel.name}`)
      .addFields(
        { name: "👑 Besitzer", value: ownerId ? `<@${ownerId}>` : "*Niemand*", inline: true },
        { name: "👥 Mitglieder", value: `${voiceChannel.members.size} / ${voiceChannel.userLimit || "∞"}`, inline: true },
        { name: "📶 Bitrate", value: `${Math.round(voiceChannel.bitrate / 1000)} kbps`, inline: true },
        {
          name: "🔑 Passwort-Schutz",
          value: hasPw ? (actualPw ? `Aktiv (\`${actualPw}\`) 🔐` : "Aktiv 🔐") : "Keiner (Frei)",
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
}
