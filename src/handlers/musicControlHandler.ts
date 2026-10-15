import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js";
import { musicService } from "../services/musicService";
import { soundboardService } from "../services/soundboardService";

export function createMusicControlRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("music_pause").setLabel("⏸️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("music_resume").setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("music_skip").setLabel("⏭️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("music_stop").setLabel("⏹️").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("music_shuffle").setLabel("🔀").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );
}

export function createMusicPanelRows(): Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> {
  const rows: Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("music_pause").setLabel("⏸️ Pause").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_resume").setLabel("▶️ Weiter").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_skip").setLabel("⏭️ Skip").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_stop").setLabel("⏹️ Stop").setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("music_vol_down").setLabel("🔉 -10%").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_vol_up").setLabel("🔊 +10%").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_loop").setLabel("🔁 Loop").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_shuffle").setLabel("🔀 Shuffle").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music_refresh").setLabel("🔄 Status").setStyle(ButtonStyle.Secondary),
    ),
  ];
  const soundRow = createSoundSelectRow();
  if (soundRow) rows.push(soundRow);
  return rows;
}

/** Dropdown mit allen Sounds (max. 25, Discord-Limit), gruppiert per Beschreibung. */
export function createSoundSelectRow(): ActionRowBuilder<StringSelectMenuBuilder> | null {
  const sounds = soundboardService.list().slice(0, 25);
  if (sounds.length === 0) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId("sound_pick")
    .setPlaceholder("🔊 Sound aus dem Soundboard wählen …")
    .addOptions(
      sounds.map((s) => ({
        label: s.name.slice(0, 100),
        description: (s.folder ? `📁 ${s.folder}` : "Hauptverzeichnis").slice(0, 100),
        value: s.file.slice(0, 100),
      })),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/**
 * Sucht oder erstellt den Steuerungs-Textkanal und postet das Musik-Panel.
 * Wird aufgerufen, sobald ein Musik-/Radio-Kanal erstellt wird.
 */
export async function postMusicPanel(guild: Guild, parentId?: string): Promise<TextChannel> {
  const existing = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      /musik-steuerung|music-panel|musik-panel/i.test(c.name) &&
      (!parentId || c.parentId === parentId),
  ) as TextChannel | undefined;
  const channel =
    existing ||
    (await guild.channels.create({
      name: "🎵・musik-steuerung",
      type: ChannelType.GuildText,
      parent: parentId,
      topic: "Musik-Panel: Radio & Songs steuern (Play/Pause, Lautstärke, Queue)",
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
        ...(guild.members.me?.id || guild.client.user?.id
          ? [
              {
                id: (guild.members.me?.id || guild.client.user?.id)!,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
              },
            ]
          : []),
      ],
      reason: "GLGBot: Musik-Panel",
    }));
  await channel.send({ embeds: [buildPanelEmbed(guild.id)], components: createMusicPanelRows() });
  return channel;
}

export async function handleSoundSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;
  const file = interaction.values[0];
  if (!file) return;
  const member = interaction.member as GuildMember;
  const channel = member?.voice?.channel;
  if (!channel) {
    await interaction.reply({ content: "❌ Du musst in einem Voice-Kanal sein.", ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    await soundboardService.play(channel, file);
    await interaction.editReply({ content: `🔊 Sound abgespielt: **${file}**` });
  } catch (e: any) {
    await interaction.editReply({ content: `❌ ${e?.message || "Konnte Sound nicht abspielen."}` });
  }
}

export function buildPanelEmbed(guildId: string): EmbedBuilder {
  const status = musicService.getStatus(guildId);
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🎵 Musik-Panel").setTimestamp();
  if (!status?.current) {
    embed.setDescription(
      "Gerade läuft nichts.\nStarte Musik mit `/music play <Suche oder URL>` oder Radio mit `/radio start <URL>`.",
    );
    if (status) {
      embed.addFields(
        { name: "Lautstärke", value: `${status.volume}%`, inline: true },
        { name: "Loop", value: status.loop, inline: true },
      );
    }
    return embed;
  }
  const title = status.current.source === "local" ? `📁 ${status.current.title}` : `[${status.current.title}](${status.current.url})`;
  embed.setDescription(
    `${status.isPaused ? "⏸️ Pausiert" : "▶️ Läuft"}: ${title}` +
    (status.lastError ? `\n⚠️ Letzter Fehler: ${status.lastError}` : ""),
  );
  if (status.current.thumbnail) embed.setThumbnail(status.current.thumbnail);
  embed.addFields(
    { name: "Queue", value: `${status.queueLength} Song${status.queueLength === 1 ? "" : "s"}`, inline: true },
    { name: "Lautstärke", value: `${status.volume}%`, inline: true },
    { name: "Loop", value: status.loop, inline: true },
  );
  return embed;
}

function statusEmbed(guildId: string): EmbedBuilder | null {
  const status = musicService.getStatus(guildId);
  if (!status?.current) return null;
  const embed = musicService.buildNowPlayingEmbed(
    `[${status.current.title}](${status.current.url})`,
    status.queueLength,
    status.isPaused,
    status.volume,
  );
  if (status.current.thumbnail) embed.setThumbnail(status.current.thumbnail);
  return embed;
}

export async function handleMusicButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  let ok = false;
  let reply: string | null = null;

  switch (interaction.customId) {
    case "music_pause":
      ok = musicService.pause(guildId);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    case "music_resume":
      ok = musicService.resume(guildId);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    case "music_skip":
      ok = musicService.skip(guildId);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    case "music_stop":
      ok = musicService.stop(guildId);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    case "music_shuffle":
      ok = musicService.shuffle(guildId);
      if (!ok) reply = "Nicht genug Songs zum Mischen.";
      break;
    case "music_vol_down":
    case "music_vol_up": {
      const status = musicService.getStatus(guildId);
      if (!status) {
        reply = "Es läuft gerade keine Musik.";
        break;
      }
      const next = Math.max(0, Math.min(100, status.volume + (interaction.customId === "music_vol_up" ? 10 : -10)));
      const member = interaction.member as GuildMember;
      ok = musicService.setVolume(guildId, next, member?.voice?.channel?.id, interaction.user.id);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    }
    case "music_loop": {
      const status = musicService.getStatus(guildId);
      if (!status) {
        reply = "Es läuft gerade keine Musik.";
        break;
      }
      const next = status.loop === "off" ? "track" : status.loop === "track" ? "queue" : "off";
      ok = musicService.setLoop(guildId, next);
      if (!ok) reply = "Es läuft gerade keine Musik.";
      break;
    }
    case "music_refresh":
      ok = true;
      break;
    default:
      return;
  }

  if (reply) {
    await interaction.reply({ content: reply, ephemeral: true });
    return;
  }

  const isPanel = (interaction.message?.components?.length || 0) > 1;
  const embed = isPanel ? buildPanelEmbed(guildId) : statusEmbed(guildId);
  const components = isPanel ? createMusicPanelRows() : [createMusicControlRow()];
  try {
    if (embed && interaction.message?.editable) {
      await interaction.update({ embeds: [embed], components });
    } else if (embed) {
      await interaction.update({ embeds: [embed] });
    } else if (isPanel) {
      await interaction.update({ embeds: [buildPanelEmbed(guildId)], components });
    } else {
      await interaction.update({ components: [createMusicControlRow(true)] });
    }
  } catch {
    await interaction.reply({ content: "✅ Fertig.", ephemeral: true }).catch(() => null);
  }
}
