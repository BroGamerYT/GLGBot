import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import { loadChannelMap, saveChannelMap, Station, loadStations } from "./config";
import { stationPlayer } from "./player";

export function buildPanelEmbed(
  statuses: { name: string; playing: boolean; paused: boolean; nowPlaying: string | null; lastError: string | null }[],
  activeStationName?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎵 Musik-Bot Steuerung")
    .setDescription(
      "🎧 **Auto-Join aktiv:** Betrete einfach einen der 📻 Sender-Kanäle.\n" +
      "Der Musik-Bot springt automatisch in deinen Kanal und startet den Sender!\n\n" +
      "Wenn alle Hörer den Kanal verlassen, pausiert der Bot nach 45 Sekunden automatisch.",
    )
    .setTimestamp();

  if (statuses.length === 0) {
    embed.addFields({ name: "Sender", value: "Keine Sender konfiguriert." });
    return embed;
  }

  const lines = statuses.map((s) => {
    let icon = "⚪";
    let statusText = "Bereit (betreten zum Starten)";
    if (s.playing) {
      icon = s.paused ? "⏸️" : "▶️";
      statusText = s.nowPlaying ? `**${s.nowPlaying}**` : "Läuft";
    } else if (s.lastError) {
      icon = "⚠️";
      statusText = s.lastError;
    }
    return `${icon} **${s.name}**\n↳ ${statusText}`;
  });

  embed.addFields({
    name: "📻 Verfügbare Sender",
    value: lines.slice(0, 15).join("\n\n") || "Keine Sender verfügbar.",
  });

  return embed;
}

export function panelRows(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("mb_pause").setLabel("⏸️ Pausieren").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("mb_resume").setLabel("▶️ Fortsetzen").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("mb_stop").setLabel("⏹️ Stoppen").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("mb_status").setLabel("🔄 Aktualisieren").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export async function ensureCategory(guild: Guild) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && /musik|music|radio/i.test(c.name),
  );
  if (existing) return existing;
  return guild.channels.create({ name: "🎵 Musik", type: ChannelType.GuildCategory, reason: "MusicBot: Einrichtung" });
}

export async function ensureStationChannel(guild: Guild, parentId: string, station: Station, knownId?: string): Promise<VoiceChannel> {
  if (knownId) {
    const known = await guild.channels.fetch(knownId).catch(() => null);
    if (known && known.type === ChannelType.GuildVoice) return known as VoiceChannel;
  }
  const wanted = `📻・${station.name}`.toLowerCase();
  const byName = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildVoice && c.parentId === parentId && c.name.toLowerCase() === wanted,
  ) as VoiceChannel | undefined;
  if (byName) {
    try {
      if ((byName.bitrate || 0) < 128000) await byName.setBitrate(128000);
    } catch {}
    return byName;
  }
  for (const bitrate of [384000, 128000, undefined]) {
    try {
      return await guild.channels.create({
        name: `📻・${station.name}`.slice(0, 100),
        type: ChannelType.GuildVoice,
        parent: parentId,
        ...(bitrate ? { bitrate } : {}),
        reason: "MusicBot: Sender-Kanal",
      });
    } catch {}
  }
  throw new Error("Sender-Kanal konnte nicht erstellt werden.");
}

export async function ensurePanelChannel(guild: Guild, parentId: string): Promise<TextChannel> {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && /musik-steuerung|music-panel|musik-panel/i.test(c.name),
  ) as TextChannel | undefined;
  if (existing) return existing;
  return guild.channels.create({
    name: "🎵・musik-steuerung",
    type: ChannelType.GuildText,
    parent: parentId,
    topic: "Musik-Bot Steuerung",
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
    ],
    reason: "MusicBot: Panel-Kanal",
  });
}

/**
 * Aktualisiert das Steuerungs-Panel im Textkanal (oder erstellt es, falls nicht vorhanden).
 */
export async function updatePanel(guild: Guild, stations?: Station[]) {
  try {
    const category = await ensureCategory(guild);
    const panelChannel = await ensurePanelChannel(guild, category.id);
    const active = (stations || loadStations(guild.id)).filter((s) => s.active);
    const statuses = stationPlayer.getStatuses(guild.id, active);
    const activeSess = stationPlayer.getActiveSession(guild.id);

    const messages = await panelChannel.messages.fetch({ limit: 10 }).catch(() => null);
    const existing = messages?.find(
      (m) => m.author.id === guild.client.user?.id && m.embeds[0]?.title?.includes("Musik-Bot"),
    );

    if (existing) {
      await existing.edit({
        embeds: [buildPanelEmbed(statuses, activeSess?.name)],
        components: panelRows(),
      });
    } else {
      await panelChannel.send({
        embeds: [buildPanelEmbed(statuses, activeSess?.name)],
        components: panelRows(),
      });
    }
  } catch (e) {
    console.error("[MusicBot] updatePanel Fehler:", (e as Error).message);
  }
}

/**
 * Auto-Einrichtung: Kategorie, Panel-Kanal + Panel.
 * Sender-Kanäle werden als temporäre Kanäle erst bei Bedarf erstellt.
 */
export async function autoSetup(guild: Guild, stations: Station[]): Promise<Record<string, string>> {
  await guild.channels.fetch();
  const category = await ensureCategory(guild);
  const map = loadChannelMap()[guild.id] || {};
  const active = stations.filter((s) => s.active);

  // Bestehende Kanäle in der Map prüfen: Leere Kanäle aufräumen
  const updatedMap: Record<string, string> = {};
  for (const [stId, chId] of Object.entries(map)) {
    try {
      const ch = await guild.channels.fetch(chId).catch(() => null);
      if (ch && ch.isVoiceBased()) {
        const humans = ch.members.filter((m) => !m.user.bot).size;
        if (humans > 0) {
          updatedMap[stId] = ch.id;
        } else {
          // Ungenutzter Kanal aus vorheriger Session -> als Temp-Kanal entfernen
          await ch.delete("Ungenutzter Temp-Kanal").catch(() => null);
        }
      }
    } catch {}
  }

  const all = loadChannelMap();
  all[guild.id] = updatedMap;
  saveChannelMap(all);

  await updatePanel(guild, active);
  return updatedMap;
}

/** Kanal wurde gelöscht -> aus channel_map entfernen (kein Zombie-Neuaufbau). */
export async function handleChannelDelete(guild: Guild, channelId: string, stations: Station[]): Promise<string | null> {
  const map = loadChannelMap()[guild.id] || {};
  const stationId = Object.keys(map).find((id) => map[id] === channelId);
  if (!stationId) return null;
  delete map[stationId];
  const all = loadChannelMap();
  all[guild.id] = map;
  saveChannelMap(all);
  console.log(`[MusicBot] Temp-Kanal #${channelId} gelöscht und aus Zuordnung entfernt.`);
  return null;
}
