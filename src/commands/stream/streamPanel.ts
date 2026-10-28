import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  ChannelType,
  VoiceChannel,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { BRANDING, dashboardLink } from "../../config/branding";
import { channelPasswordService } from "../../services/channelPasswordService";
import { liveStreamService } from "../../services/liveStreamService";

export function createStreamerPanelEmbed(
  member: GuildMember,
  channel: VoiceChannel | TextChannel
) {
  const isVoice = channel.type === ChannelType.GuildVoice;
  const hasPw = channelPasswordService.hasPassword(channel.id);
  const everyoneRole = channel.guild.roles.everyone;
  const everyoneOverwrite = everyoneRole ? channel.permissionOverwrites.cache.get(everyoneRole.id) : null;
  const isLocked = isVoice
    ? everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect)
    : everyoneOverwrite?.deny.has(PermissionFlagsBits.SendMessages);
  const isHidden = everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel);

  const statusParts: string[] = [];
  if (hasPw) statusParts.push("🔑 Passwort-geschützt");
  if (isLocked) statusParts.push("🔒 Gesperrt");
  if (isHidden) statusParts.push("🙈 Unsichtbar");
  if (statusParts.length === 0) statusParts.push("🌐 Öffentlich & Offen");

  const embed = new EmbedBuilder()
    .setColor(0x9146ff) // Twitch Violett
    .setTitle("🎛️ Streamer-Kanal Steuerung & Einrichtung")
    .setDescription(
      `Willkommen in deinem persönlichen Live-Kanal, <@${member.id}>!\n` +
      `Du hast in diesem Raum **komplette Rechte** und kannst alle Einstellungen direkt hier steuern.\n\n` +
      `• **🔑 Passwort (PW):** Schütze deinen Kanal mit einem Kennwort\n` +
      `• **👥 Benutzerlimit:** Begrenze die Anzahl an Personen (0 = unbegrenzt)\n` +
      `• **✏️ Umbenennung:** Passe den Kanalnamen dynamisch an\n` +
      `• **🔒 Sperren / Freigeben:** Bestimme, wer beitreten darf\n` +
      `• **🛑 Beenden:** Schließt den Raum und beendet deinen Live-Status`
    )
    .addFields(
      { name: "👑 Streamer", value: `<@${member.id}>`, inline: true },
      { name: "🛡️ Raum-Status", value: statusParts.join(" • "), inline: true }
    )
    .setFooter({ text: `${BRANDING.bot} Live-Streamer Suite` })
    .setTimestamp();

  if (isVoice) {
    const vc = channel as VoiceChannel;
    embed.addFields(
      {
        name: "👥 Benutzerlimit",
        value: vc.userLimit > 0 ? `${vc.userLimit} Personen` : "Unbegrenzt (∞)",
        inline: true,
      },
      {
        name: "📶 Audio-Bitrate",
        value: `${Math.round(vc.bitrate / 1000)} kbps`,
        inline: true,
      }
    );
  }

  return embed;
}

export function createStreamerPanelComponents(
  channel: VoiceChannel | TextChannel
) {
  const isVoice = channel.type === ChannelType.GuildVoice;

  // 1. Dropdown Menü für Streamer
  const menuOptions = [
    {
      label: "Kanal umbenennen",
      description: "Passe den Namen deines Stream-Kanals an",
      value: "rename",
      emoji: "✏️",
    },
  ];

  if (isVoice) {
    menuOptions.push(
      {
        label: "Benutzerlimit ändern",
        description: "Maximale Personenanzahl festlegen (0-99)",
        value: "limit",
        emoji: "👥",
      },
      {
        label: "Passwort festlegen / ändern",
        description: "Raum mit einem geheimen Passwort schützen",
        value: "pw_set",
        emoji: "🔑",
      },
      {
        label: "Passwort entfernen",
        description: "Passwort-Schutz löschen und Raum öffnen",
        value: "pw_remove",
        emoji: "🔓",
      }
    );
  }

  menuOptions.push(
    {
      label: "Kanal sperren (Lock)",
      description: "Niemand Neues kann den Kanal betreten",
      value: "lock",
      emoji: "🔒",
    },
    {
      label: "Kanal entsperren (Unlock)",
      description: "Gibt den Kanal wieder für alle frei",
      value: "unlock",
      emoji: "🔓",
    },
    {
      label: "Kanal verstecken (Hide)",
      description: "Macht den Kanal für andere Mitglieder unsichtbar",
      value: "hide",
      emoji: "🙈",
    },
    {
      label: "Kanal sichtbar machen (Unhide)",
      description: "Macht den Kanal wieder für alle sichtbar",
      value: "unhide",
      emoji: "👁️",
    }
  );

  if (isVoice) {
    menuOptions.push({
      label: "Audioqualität (Bitrate)",
      description: "Passe die Sprach-Bitrate an",
      value: "bitrate",
      emoji: "📶",
    });
  }

  menuOptions.push({
    label: "Live-Kanal beenden",
    description: "Beendet deinen Live-Status und löscht diesen Kanal",
    value: "stop",
    emoji: "🛑",
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("stream_panel_menu")
    .setPlaceholder("⚙️ Streamer-Einstellungen auswählen...")
    .addOptions(menuOptions);

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // 2. Buttons
  const buttons: ButtonBuilder[] = [];

  if (isVoice) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("stream_btn_enter_pw")
        .setLabel("Passwort eingeben")
        .setEmoji("🔑")
        .setStyle(ButtonStyle.Success)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("stream_btn_toggle_lock")
      .setLabel("Sperren / Freigeben")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("stream_btn_rename")
      .setLabel("Umbenennen")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
  );

  if (isVoice) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("stream_btn_limit")
        .setLabel("Limit")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("stream_btn_refresh")
      .setLabel("Status & Info")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  // 3. Reihe: Danger Button & Dashboard
  const row3Buttons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId("stream_btn_stop")
      .setLabel("Live beenden")
      .setEmoji("🛑")
      .setStyle(ButtonStyle.Danger),
  ];

  const dashUrl = dashboardLink();
  if (dashUrl) {
    row3Buttons.push(
      new ButtonBuilder()
        .setLabel("Web-Dashboard")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Link)
        .setURL(dashUrl)
    );
  }

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(row3Buttons);

  return [row1, row2, row3];
}

const streamPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stream-panel")
    .setDescription("Sendet das Streamer Einrichtungs- & Steuerungs-Panel in diesen Kanal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  execute: async (interaction) => {
    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({
        content: "❌ Dieser Befehl kann nur in einem Server-Kanal verwendet werden.",
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return;

    const channel = interaction.channel;
    if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "❌ Dieses Panel kann nur in einem Text- oder Sprachkanal gesendet werden.",
        ephemeral: true,
      });
      return;
    }

    // Ermitteln, ob dies ein Live-Kanal ist
    const liveEntry = liveStreamService.getLiveEntryByChannel(channel.id);
    const targetMember = liveEntry
      ? (await interaction.guild.members.fetch(liveEntry.userId).catch(() => member))
      : member;

    const embed = createStreamerPanelEmbed(targetMember, channel as VoiceChannel | TextChannel);
    const components = createStreamerPanelComponents(channel as VoiceChannel | TextChannel);

    await interaction.reply({
      content: "✅ Das Streamer-Steuerungs-Panel wurde gesendet!",
      ephemeral: true,
    });

    if ("send" in channel) {
      await (channel as any).send({
        embeds: [embed],
        components,
      });
    }
  },
};

export default streamPanelCommand;
