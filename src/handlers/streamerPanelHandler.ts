import {
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  VoiceChannel,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { liveStreamService } from "../services/liveStreamService";
import { channelPasswordService } from "../services/channelPasswordService";
import { renameSafely, RENAME_LIMIT_HINT } from "../utils/rename";
import { tempVoiceService } from "../services/tempVoiceService";

function getTargetChannel(interaction: StringSelectMenuInteraction | ButtonInteraction | ModalSubmitInteraction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (interaction.channel?.isVoiceBased() || interaction.channel?.type === ChannelType.GuildText) {
    return interaction.channel as VoiceChannel | TextChannel;
  }
  if (member?.voice.channel) {
    return member.voice.channel as VoiceChannel;
  }
  return null;
}

function getChannelOwnerId(channelId: string): string | null {
  const liveEntry = liveStreamService.getLiveEntryByChannel(channelId);
  if (liveEntry) return liveEntry.userId;
  const tempOwner = tempVoiceService.getChannelOwner(channelId);
  if (tempOwner) return tempOwner;
  return null;
}

function checkIsOwnerOrAdmin(interaction: any, channelId: string): boolean {
  const ownerId = getChannelOwnerId(channelId);
  const isOwner = ownerId === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  return isOwner || !!isAdmin;
}

// -------------------------------------------------------------
// 1. SELECT MENU HANDLER
// -------------------------------------------------------------
export async function handleStreamerSelectMenu(interaction: StringSelectMenuInteraction) {
  const channel = getTargetChannel(interaction);
  if (!channel) {
    await interaction.reply({
      content: "❌ Kanal konnte nicht ermittelt werden. Bitte führe die Aktion direkt im Kanal aus.",
      ephemeral: true,
    });
    return;
  }

  const selected = interaction.values[0];

  // Für alle Einstellungen im Menü muss der Nutzer Owner oder Admin sein
  if (!checkIsOwnerOrAdmin(interaction, channel.id)) {
    await interaction.reply({
      content: "❌ Nur der Streamer (Kanal-Besitzer) oder Administratoren können diese Einstellungen anpassen.",
      ephemeral: true,
    });
    return;
  }

  // 1. Umbenennen
  if (selected === "rename") {
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_name")
      .setTitle("Stream-Kanal umbenennen");

    const input = new TextInputBuilder()
      .setCustomId("stream_name_input")
      .setLabel("Neuer Name für deinen Kanal")
      .setStyle(TextInputStyle.Short)
      .setValue(channel.name.replace(/^🔴・/, "").slice(0, 30))
      .setMaxLength(32)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // 2. Benutzerlimit
  if (selected === "limit") {
    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: "❌ Ein Benutzerlimit kann nur bei Sprachkanälen gesetzt werden.", ephemeral: true });
      return;
    }
    const vc = channel as VoiceChannel;
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_limit")
      .setTitle("Benutzerlimit anpassen");

    const input = new TextInputBuilder()
      .setCustomId("stream_limit_input")
      .setLabel("Maximale Personen (0 für unbegrenzt, max. 99)")
      .setStyle(TextInputStyle.Short)
      .setValue(vc.userLimit.toString())
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // 3. Passwort setzen
  if (selected === "pw_set") {
    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: "❌ Passwort-Schutz ist nur für Sprachkanäle verfügbar.", ephemeral: true });
      return;
    }
    const currentPw = channelPasswordService.getPassword(channel.id) || "";
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_pw_set")
      .setTitle("Kanal-Passwort festlegen");

    const input = new TextInputBuilder()
      .setCustomId("stream_pw_input")
      .setLabel("Neues Passwort für diesen Sprachkanal")
      .setStyle(TextInputStyle.Short)
      .setValue(currentPw)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // 4. Passwort entfernen
  if (selected === "pw_remove") {
    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: "❌ Passwort-Schutz ist nur für Sprachkanäle verfügbar.", ephemeral: true });
      return;
    }
    channelPasswordService.removePassword(channel.id);
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      await channel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
    }
    await interaction.reply({
      content: "🔓 **Passwort entfernt!** Der Sprachkanal ist wieder für alle geöffnet.",
      ephemeral: true,
    });
    return;
  }

  // 5. Sperren
  if (selected === "lock") {
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      if (channel.type === ChannelType.GuildVoice) {
        await channel.permissionOverwrites.edit(everyoneRole, { Connect: false }).catch(() => null);
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }).catch(() => null);
      }
    }
    await interaction.reply({
      content: "🔒 **Kanal gesperrt!** Niemand Neues kann den Kanal betreten bzw. Nachrichten schreiben.",
      ephemeral: true,
    });
    return;
  }

  // 6. Entsperren
  if (selected === "unlock") {
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      if (channel.type === ChannelType.GuildVoice) {
        await channel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }).catch(() => null);
      }
    }
    await interaction.reply({
      content: "🔓 **Kanal freigegeben!** Der Kanal ist wieder für alle geöffnet.",
      ephemeral: true,
    });
    return;
  }

  // 7. Verstecken
  if (selected === "hide") {
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false }).catch(() => null);
    }
    await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true }).catch(() => null);
    await interaction.reply({
      content: "🙈 **Kanal verborgen!** Nur du und berechtigte Mitglieder können ihn jetzt sehen.",
      ephemeral: true,
    });
    return;
  }

  // 8. Sichtbar machen
  if (selected === "unhide") {
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: null }).catch(() => null);
    }
    await interaction.reply({
      content: "👁️ **Kanal sichtbar gemacht!** Der Kanal wird wieder in der Serverliste angezeigt.",
      ephemeral: true,
    });
    return;
  }

  // 9. Bitrate
  if (selected === "bitrate") {
    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: "❌ Bitrate kann nur in Sprachkanälen angepasst werden.", ephemeral: true });
      return;
    }
    const vc = channel as VoiceChannel;
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_bitrate")
      .setTitle("Audio-Bitrate einstellen");

    const input = new TextInputBuilder()
      .setCustomId("stream_bitrate_input")
      .setLabel("Bitrate in kbps (z. B. 64, 96, 128, 256, 384)")
      .setStyle(TextInputStyle.Short)
      .setValue(Math.round(vc.bitrate / 1000).toString())
      .setMaxLength(3)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // 10. Live beenden
  if (selected === "stop") {
    await interaction.reply({
      content: "🛑 **Live-Status wird beendet...** Der Kanal wird gelöscht.",
      ephemeral: true,
    });
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (member) {
      await liveStreamService.clearLive(member, "all");
    } else {
      await channel.delete("Streamer hat den Kanal beendet").catch(() => null);
    }
    return;
  }
}

// -------------------------------------------------------------
// 2. BUTTON HANDLER
// -------------------------------------------------------------
export async function handleStreamerButton(interaction: ButtonInteraction) {
  const channel = getTargetChannel(interaction);
  if (!channel) {
    await interaction.reply({
      content: "❌ Kanal konnte nicht ermittelt werden.",
      ephemeral: true,
    });
    return;
  }

  // A. Passwort eingeben (jeder darf diesen Button klicken!)
  if (interaction.customId === "stream_btn_enter_pw") {
    if (!channelPasswordService.hasPassword(channel.id)) {
      await interaction.reply({
        content: "ℹ️ Für diesen Kanal ist aktuell kein Passwort eingerichtet. Du kannst direkt beitreten!",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_stream_pw_enter")
      .setTitle("Kanal-Passwort eingeben");

    const input = new TextInputBuilder()
      .setCustomId("stream_pw_enter_input")
      .setLabel("Gib das geheime Kanal-Passwort ein")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // B. Status & Info (jeder darf diesen Button klicken)
  if (interaction.customId === "stream_btn_refresh") {
    const ownerId = getChannelOwnerId(channel.id);
    const isOwnerOrAdmin = checkIsOwnerOrAdmin(interaction, channel.id);
    const isVoice = channel.type === ChannelType.GuildVoice;
    const vc = isVoice ? (channel as VoiceChannel) : null;
    const hasPw = channelPasswordService.hasPassword(channel.id);
    const actualPw = hasPw && isOwnerOrAdmin ? channelPasswordService.getPassword(channel.id) : null;

    const everyoneRole = channel.guild.roles.everyone;
    const isLocked = isVoice
      ? !!everyoneRole && channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.Connect)
      : !!everyoneRole && channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.SendMessages);

    const embed = new EmbedBuilder()
      .setColor(0x9146ff)
      .setTitle(`🎛️ Kanal-Status: ${channel.name}`)
      .addFields(
        { name: "👑 Streamer", value: ownerId ? `<@${ownerId}>` : "*Unbekannt*", inline: true },
        { name: "🔒 Status", value: isLocked ? "Gesperrt 🔒" : "Offen 🔓", inline: true },
        {
          name: "🔑 Passwort-Schutz",
          value: hasPw ? (actualPw ? `Aktiv (\`${actualPw}\`) 🔐` : "Aktiv 🔐") : "Keiner (Frei)",
          inline: true,
        }
      );

    if (vc) {
      embed.addFields(
        { name: "👥 Mitglieder", value: `${vc.members.size} / ${vc.userLimit > 0 ? vc.userLimit : "∞"}`, inline: true },
        { name: "📶 Audio-Bitrate", value: `${Math.round(vc.bitrate / 1000)} kbps`, inline: true }
      );
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // C. Für alle anderen Buttons muss der Nutzer Owner oder Admin sein
  if (!checkIsOwnerOrAdmin(interaction, channel.id)) {
    await interaction.reply({
      content: "❌ Nur der Streamer (Kanal-Besitzer) oder Administratoren können diese Steuerung nutzen.",
      ephemeral: true,
    });
    return;
  }

  // Sperren / Freigeben Toggle
  if (interaction.customId === "stream_btn_toggle_lock") {
    const everyoneRole = channel.guild.roles.everyone;
    if (!everyoneRole) return;
    const isVoice = channel.type === ChannelType.GuildVoice;
    const currentLocked = isVoice
      ? channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.Connect)
      : channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.SendMessages);

    if (currentLocked) {
      if (isVoice) {
        await channel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }).catch(() => null);
      }
      await interaction.reply({ content: "🔓 **Kanal freigegeben!** Jeder kann wieder beitreten.", ephemeral: true });
    } else {
      if (isVoice) {
        await channel.permissionOverwrites.edit(everyoneRole, { Connect: false }).catch(() => null);
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }).catch(() => null);
      }
      await interaction.reply({ content: "🔒 **Kanal gesperrt!** Beitritt verweigert.", ephemeral: true });
    }
    return;
  }

  // Umbenennen
  if (interaction.customId === "stream_btn_rename") {
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_name")
      .setTitle("Stream-Kanal umbenennen");

    const input = new TextInputBuilder()
      .setCustomId("stream_name_input")
      .setLabel("Neuer Name für deinen Kanal")
      .setStyle(TextInputStyle.Short)
      .setValue(channel.name.replace(/^🔴・/, "").slice(0, 30))
      .setMaxLength(32)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // Limit
  if (interaction.customId === "stream_btn_limit") {
    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: "❌ Limit existiert nur bei Sprachkanälen.", ephemeral: true });
      return;
    }
    const vc = channel as VoiceChannel;
    const modal = new ModalBuilder()
      .setCustomId("modal_stream_limit")
      .setTitle("Benutzerlimit anpassen");

    const input = new TextInputBuilder()
      .setCustomId("stream_limit_input")
      .setLabel("Maximale Personen (0 für unbegrenzt, max. 99)")
      .setStyle(TextInputStyle.Short)
      .setValue(vc.userLimit.toString())
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  // Live beenden
  if (interaction.customId === "stream_btn_stop") {
    await interaction.reply({
      content: "🛑 **Live-Status wird beendet...** Der Kanal wird gelöscht.",
      ephemeral: true,
    });
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (member) {
      await liveStreamService.clearLive(member, "all");
    } else {
      await channel.delete("Stream beendet via Button").catch(() => null);
    }
    return;
  }
}

// -------------------------------------------------------------
// 3. MODAL SUBMIT HANDLER
// -------------------------------------------------------------
export async function handleStreamerModalSubmit(interaction: ModalSubmitInteraction) {
  const channel = getTargetChannel(interaction);
  if (!channel) {
    await interaction.reply({
      content: "❌ Kanal konnte nicht ermittelt werden.",
      ephemeral: true,
    });
    return;
  }

  // A. Passwort eingeben (jeder darf)
  if (interaction.customId === "modal_stream_pw_enter") {
    const inputPw = interaction.fields.getTextInputValue("stream_pw_enter_input").trim();
    const isCorrect = channelPasswordService.verifyPassword(channel.id, inputPw);

    if (!isCorrect) {
      await interaction.reply({
        content: "❌ **Falsches Passwort!** Bitte überprüfe die Eingabe.",
        ephemeral: true,
      });
      return;
    }

    // Zutritt gewähren
    await channel.permissionOverwrites.edit(interaction.user.id, {
      Connect: true,
      ViewChannel: true,
      Speak: true,
    });

    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (member?.voice.channelId && channel.type === ChannelType.GuildVoice) {
      await member.voice.setChannel(channel as VoiceChannel).catch(() => null);
    }

    await interaction.reply({
      content: `✅ **Passwort korrekt!** Du hast jetzt vollen Zutritt zu **${channel.name}**.`,
      ephemeral: true,
    });
    return;
  }

  // B. Für alle anderen Modals muss der Nutzer Owner oder Admin sein
  if (!checkIsOwnerOrAdmin(interaction, channel.id)) {
    await interaction.reply({
      content: "❌ Nur der Streamer (Kanal-Besitzer) oder Administratoren können diese Änderungen durchführen.",
      ephemeral: true,
    });
    return;
  }

  // Passwort setzen
  if (interaction.customId === "modal_stream_pw_set") {
    const rawPw = interaction.fields.getTextInputValue("stream_pw_input").trim();
    if (!rawPw) {
      channelPasswordService.removePassword(channel.id);
      const everyoneRole = channel.guild.roles.everyone;
      if (everyoneRole) {
        await channel.permissionOverwrites.edit(everyoneRole, { Connect: null }).catch(() => null);
      }
      await interaction.reply({
        content: "🔓 Passwort wurde gelöscht und der Raum wieder für alle geöffnet.",
        ephemeral: true,
      });
      return;
    }

    channelPasswordService.setPassword(channel.id, rawPw);
    const everyoneRole = channel.guild.roles.everyone;
    if (everyoneRole) {
      await channel.permissionOverwrites.edit(everyoneRole, { Connect: false }).catch(() => null);
    }
    // Streamer selbst darf immer connecten
    await channel.permissionOverwrites.edit(interaction.user.id, {
      Connect: true,
      ViewChannel: true,
    }).catch(() => null);

    // Alle aktuell im Kanal anwesenden Mitglieder freischalten, damit sie nicht disconnected werden
    if (channel.type === ChannelType.GuildVoice) {
      const vc = channel as VoiceChannel;
      for (const [memberId] of vc.members) {
        await vc.permissionOverwrites.edit(memberId, { Connect: true }).catch(() => null);
      }
    }

    await interaction.reply({
      content: `🔐 **Passwort erfolgreich festgelegt:** \`${rawPw}\`\nDer Kanal wurde für @everyone gesperrt. Andere Mitglieder können auf den Button **"Passwort eingeben"** klicken, um beizutreten!`,
      ephemeral: true,
    });
    return;
  }

  // Name ändern
  if (interaction.customId === "modal_stream_name") {
    const rawName = interaction.fields.getTextInputValue("stream_name_input").trim();
    const formatted = `🔴・${rawName}`.slice(0, 100);
    await interaction.deferReply({ ephemeral: true });
    const status = await renameSafely(channel, formatted);
    await interaction.editReply({
      content: status === "done" ? `✅ Kanalname erfolgreich geändert zu: **${formatted}**` : RENAME_LIMIT_HINT,
    });
    return;
  }

  // Limit anpassen
  if (interaction.customId === "modal_stream_limit") {
    if (channel.type !== ChannelType.GuildVoice) return;
    const vc = channel as VoiceChannel;
    const rawLimit = interaction.fields.getTextInputValue("stream_limit_input").trim();
    const parsedLimit = parseInt(rawLimit, 10);

    if (isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 99) {
      await interaction.reply({
        content: "❌ Bitte gib eine gültige Zahl zwischen 0 und 99 ein.",
        ephemeral: true,
      });
      return;
    }

    await vc.setUserLimit(parsedLimit);
    await interaction.reply({
      content: parsedLimit === 0
        ? "✅ Teilnehmerlimit aufgehoben (unbegrenzt)."
        : `✅ Teilnehmerlimit auf **${parsedLimit} Personen** gesetzt.`,
      ephemeral: true,
    });
    return;
  }

  // Bitrate anpassen
  if (interaction.customId === "modal_stream_bitrate") {
    if (channel.type !== ChannelType.GuildVoice) return;
    const vc = channel as VoiceChannel;
    const rawBitrate = interaction.fields.getTextInputValue("stream_bitrate_input").trim();
    const parsedBitrate = parseInt(rawBitrate, 10);

    if (isNaN(parsedBitrate) || parsedBitrate < 8 || parsedBitrate > 384) {
      await interaction.reply({
        content: "❌ Bitte gib eine gültige Bitrate zwischen 8 und 384 kbps ein.",
        ephemeral: true,
      });
      return;
    }

    await vc.setBitrate(parsedBitrate * 1000);
    await interaction.reply({
      content: `📶 Audioqualität auf **${parsedBitrate} kbps** gesetzt.`,
      ephemeral: true,
    });
    return;
  }
}
