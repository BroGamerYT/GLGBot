import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { radioService } from "../services/radioService";
import { radioStationService } from "../services/radioStationService";

export interface PanelStation {
  id: string;
  name: string;
  url: string;
}

/** Sender aus Dashboard-Config (Standard + eigene). */
export function getPanelStations(guildId: string): PanelStation[] {
  return radioStationService.listAll(guildId);
}

export function createRadioPanelRows(stations: PanelStation[]): Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> {
  const rows: Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> = [];
  if (stations.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("radio_station_pick")
          .setPlaceholder("📻 Sender wählen …")
          .addOptions(
            stations.slice(0, 25).map((s) => ({
              label: s.name.slice(0, 100),
              description: "Startet den Stream in deinem Voice-Kanal".slice(0, 100),
              value: s.id.slice(0, 100),
            })),
          ),
      ),
    );
  }
  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("radio_pause").setLabel("⏸️ Pause").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("radio_resume").setLabel("▶️ Weiter").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("radio_stop").setLabel("⏹️ Stop").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("radio_refresh").setLabel("🔄 Status").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("radio_vol_down").setLabel("🔉 -10%").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("radio_vol_up").setLabel("🔊 +10%").setStyle(ButtonStyle.Secondary),
    ),
  );
  return rows;
}

export function buildRadioPanelEmbed(guildId: string, stations: PanelStation[]): EmbedBuilder {
  const status = radioService.getStatus(guildId);
  const embed = new EmbedBuilder()
    .setColor(0xe91e63)
    .setTitle("📻 Radio-Panel")
    .setTimestamp();
  if (!status) {
    embed.setDescription(
      "Gerade läuft kein Radio.\nWähle oben einen Sender (du musst im Voice sein) oder starte mit `/radio start`.",
    );
    return embed;
  }
  embed.setDescription(
    `${status.paused ? "⏸️ Pausiert" : "▶️ Läuft"}: **${status.name}**` +
    (status.nowPlaying ? `\n🎵 ${status.nowPlaying}` : "") +
    (status.lastError ? `\n⚠️ ${status.lastError}` : ""),
  );
  embed.addFields(
    { name: "Lautstärke", value: `${status.volume}%`, inline: true },
    { name: "Sender", value: `${stations.length} hinterlegt`, inline: true },
  );
  return embed;
}

async function refreshPanel(interaction: ButtonInteraction | StringSelectMenuInteraction, guildId: string) {
  const stations = getPanelStations(guildId);
  try {
    if (interaction.message?.editable) {
      await interaction.update({
        embeds: [buildRadioPanelEmbed(guildId, stations)],
        components: createRadioPanelRows(stations),
      });
    } else {
      await interaction.reply({ content: "✅ Fertig.", ephemeral: true });
    }
  } catch {
    await interaction.reply({ content: "✅ Fertig.", ephemeral: true }).catch(() => null);
  }
}

export async function handleRadioSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;
  const stations = getPanelStations(guildId);
  const station = stations.find((s) => s.id === interaction.values[0]);
  if (!station) {
    await interaction.reply({ content: "❌ Sender nicht gefunden.", ephemeral: true });
    return;
  }
  const member = interaction.member as GuildMember;
  const channel = member?.voice?.channel;
  if (!channel) {
    await interaction.reply({ content: "❌ Du musst in einem Voice-Kanal sein.", ephemeral: true });
    return;
  }
  await interaction.deferUpdate();
  try {
    await radioService.start(channel, station.url, station.name);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Start fehlgeschlagen";
    await interaction.followUp({ content: `❌ ${msg}`, ephemeral: true }).catch(() => null);
  }
  await refreshPanel(interaction, guildId);
}

export async function handleRadioButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;
  const id = interaction.customId;

  if (id === "radio_pause" || id === "radio_resume" || id === "radio_stop" || id === "radio_refresh") {
    let ok = true;
    if (id === "radio_pause") ok = radioService.pause(guildId);
    else if (id === "radio_resume") ok = radioService.resume(guildId);
    else if (id === "radio_stop") ok = await radioService.stop(guildId);
    if (!ok && id !== "radio_refresh") {
      await interaction.reply({ content: "ℹ️ Es läuft gerade kein Radio.", ephemeral: true });
      return;
    }
    await refreshPanel(interaction, guildId);
    return;
  }

  if (id === "radio_vol_down" || id === "radio_vol_up") {
    const status = radioService.getStatus(guildId);
    if (!status) {
      await interaction.reply({ content: "ℹ️ Es läuft gerade kein Radio.", ephemeral: true });
      return;
    }
    const member = interaction.member as GuildMember;
    radioService.setVolume(guildId, status.volume + (id === "radio_vol_up" ? 10 : -10), member?.voice?.channel?.id, interaction.user.id);
    await refreshPanel(interaction, guildId);
  }
}
