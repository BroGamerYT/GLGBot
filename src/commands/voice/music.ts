import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  VoiceBasedChannel,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { BotClient } from "../../client/BotClient";
import { isMusicEnabled } from "../../config/env";
import { musicService, QueueItem } from "../../services/musicService";
import { createMusicControlRow } from "../../handlers/musicControlHandler";

/** DJ-Rolle aus MUSIC_DJ_ROLE_ID (kann im Economy-Shop verkauft werden). */
function hasDjRole(member: GuildMember | null): boolean {
  try {
    const roleId = (process.env.MUSIC_DJ_ROLE_ID || "").trim();
    if (!roleId || !member) return false;
    return member.roles.cache.has(roleId);
  } catch {
    return false;
  }
}

function getMemberVoiceChannel(interaction: ChatInputCommandInteraction): VoiceBasedChannel {
  const member = interaction.member as GuildMember;
  const channel = member?.voice?.channel;
  if (!channel) {
    throw new Error("Du musst in einem Voice-Kanal sein, um Musik zu spielen.");
  }
  return channel;
}

function formatQueuePage(queue: QueueItem[], page: number, pageSize = 10): { embed: EmbedBuilder; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(queue.length / pageSize));
  const p = Math.min(page, totalPages - 1);
  const start = p * pageSize;
  const items = queue.slice(start, start + pageSize);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎵 Warteschlange (${queue.length} Songs)`)
    .setDescription(
      items.map((item, i) => `**${start + i + 1}.** [${item.title}](${item.url}) — ${item.duration} | ${item.requestedBy.tag}`).join("\n") || "Keine Songs in der Queue.",
    )
    .setFooter({ text: `Seite ${p + 1}/${totalPages}` });

  return { embed, totalPages };
}

const musicCommand: Command = {
  data: null as any,
  execute: async (interaction: ChatInputCommandInteraction, _client: BotClient) => {
    const sub = interaction.options.data[0]?.name;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: "Dieser Befehl funktioniert nur auf einem Server.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (!isMusicEnabled()) {
      await interaction.reply({ content: "❌ Musik ist deaktiviert (`MUSIC_MODE=disabled`).", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      switch (sub) {
        case "play": {
          const query = interaction.options.get("query", true).value as string;
          const channel = getMemberVoiceChannel(interaction);
          await interaction.deferReply();

          // YouTube-Playlist-Link? -> alle Videos importieren
          const listId = musicService.extractPlaylistId(query);
          if (listId) {
            try {
              const imp = await musicService.importYouTubePlaylist(channel, listId, interaction.user);
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle("🎶 Playlist hinzugefügt")
                .setDescription(`**${imp.name}**\n✅ ${imp.added} Songs in Queue${imp.failed > 0 ? `\n❌ ${imp.failed} übersprungen` : ""}`);
              await interaction.editReply({ embeds: [embed] });
              break;
            } catch (e: unknown) {
              const { extractVideoId } = await import("../../utils/ytDlpService");
              const vid = extractVideoId(query);
              if (!vid) {
                const msg = e instanceof Error ? e.message : "Import fehlgeschlagen.";
                await interaction.editReply({ content: `❌ ${msg}` });
                break;
              }
              // Hat eine Video-ID -> spiele Einzelvideo als Fallback ab
            }
          }

          const result = await musicService.play(channel, query, interaction.user);

          const fmtTitle = (item: typeof result.item) =>
            item && item.source === "local" ? `📁 ${item.title}` : item ? `[${item.title}](${item.url})` : "";
          if (result.status === "started" && result.item) {
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle("🎵 Spielt jetzt")
              .setDescription(fmtTitle(result.item))
              .addFields(
                { name: "Dauer", value: result.item.duration, inline: true },
                { name: "Von", value: result.item.requestedBy.tag, inline: true },
              );
            if (result.item.thumbnail) embed.setThumbnail(result.item.thumbnail);
            await interaction.editReply({ embeds: [embed], components: [createMusicControlRow()] });
          } else if (result.status === "queued" && result.item) {
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("➕ Zur Queue hinzugefügt")
              .setDescription(fmtTitle(result.item))
              .addFields(
                { name: "Position", value: `#${result.position}`, inline: true },
                { name: "Von", value: result.item.requestedBy.tag, inline: true },
              );
            if (result.item.thumbnail) embed.setThumbnail(result.item.thumbnail);
            await interaction.editReply({ embeds: [embed] });
          }
          break;
        }

        case "spotify": {
          const input = interaction.options.get("playlist", true).value as string;
          const channel = getMemberVoiceChannel(interaction);
          await interaction.deferReply();
          try {
            const imp = await musicService.importSpotifyPlaylist(channel, input, interaction.user);
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle("💚 Spotify-Playlist hinzugefügt")
              .setDescription(`**${imp.name}**\n✅ ${imp.added} Songs in Queue${imp.failed > 0 ? `\n❌ ${imp.failed} nicht gefunden` : ""}`);
            await interaction.editReply({ embeds: [embed] });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Import fehlgeschlagen.";
            await interaction.editReply({ content: `❌ ${msg}` });
          }
          break;
        }

        case "upload": {
          const attachment = interaction.options.getAttachment("datei", true);
          const code = interaction.options.getString("code");
          const member = interaction.member as GuildMember;
          // Ohne Code: Kanal-Recht nötig. Mit gültigem Code: jeder.
          if (code) {
            const { musicUploadService } = await import("../../services/musicUploadService");
            if (!musicUploadService.claimCode(code, interaction.user.id)) {
              await interaction.reply({ content: "❌ Ungültiger, fremder oder abgelaufener Code.", flags: MessageFlags.Ephemeral });
              return;
            }
          } else if (
            !member?.permissions.has(PermissionFlagsBits.ManageChannels) &&
            !hasDjRole(member)
          ) {
            await interaction.reply({
              content: "❌ Du brauchst das Recht „Kanäle verwalten“, die DJ-Rolle (im Economy-Shop kaufbar) – oder nutze einen Upload-Code aus dem Dashboard (`/radio` → DM-Upload).",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          try {
            const { musicUploadService } = await import("../../services/musicUploadService");
            const saved = await musicUploadService.saveAttachment({
              name: attachment.name,
              url: attachment.url,
              size: attachment.size,
            });
            await interaction.editReply({
              content: `✅ Gespeichert: **${saved}**\nAbspielen mit \`/music play local:${saved}\` oder im Dashboard.`,
            });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen.";
            await interaction.editReply({ content: `❌ ${msg}` });
          }
          break;
        }

        case "skip": {
          const ok = musicService.skip(guildId);
          await interaction.reply({
            content: ok ? "⏭️ Song übersprungen." : "Es wird gerade nichts abgespielt.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "stop": {
          const ok = musicService.stop(guildId);
          await interaction.reply({
            content: ok ? "⏹️ Musik gestoppt und Kanal verlassen." : "Es läuft keine Musik.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "pause": {
          const ok = musicService.pause(guildId);
          await interaction.reply({
            content: ok ? "⏸️ Musik pausiert." : "Es läuft keine Musik.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "resume": {
          const ok = musicService.resume(guildId);
          await interaction.reply({
            content: ok ? "▶️ Musik fortgesetzt." : "Es läuft keine Musik.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "queue": {
          const queue = musicService.getQueue(guildId);
          if (queue.length === 0) {
            await interaction.reply({ content: "Die Queue ist leer.", flags: MessageFlags.Ephemeral });
            return;
          }

          const { embed, totalPages } = formatQueuePage(queue, 0);
          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder().setCustomId("queue_prev").setLabel("◀").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("queue_next").setLabel("▶").setStyle(ButtonStyle.Secondary),
            );

          await interaction.reply({ embeds: [embed], components: [totalPages > 1 ? row : new ActionRowBuilder<ButtonBuilder>()] });
          break;
        }

        case "shuffle": {
          const ok = musicService.shuffle(guildId);
          await interaction.reply({
            content: ok ? "🔀 Queue gemischt." : "Nicht genug Songs zum Mischen.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "remove": {
          const position = interaction.options.get("position", true).value as number;
          const item = musicService.remove(guildId, position - 1);
          await interaction.reply({
            content: item ? `🗑️ **${item.title}** entfernt.` : "Ungültige Position.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "volume": {
          const percent = interaction.options.get("percent", true).value as number;
          const member = interaction.member as GuildMember;
          musicService.setVolume(guildId, percent, member?.voice?.channel?.id, interaction.user.id);
          await interaction.reply({
            content: `🔊 Lautstärke auf ${percent}% gesetzt.`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "loop": {
          const mode = interaction.options.get("modus", true).value as "off" | "track" | "queue";
          const ok = musicService.setLoop(guildId, mode);
          const label = mode === "off" ? "ausgeschaltet" : mode === "track" ? "🔂 Song-Wiederholung an" : "🔁 Queue-Wiederholung an";
          await interaction.reply({
            content: ok ? `🔁 Loop ${label}.` : "Es läuft keine Musik.",
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "history": {
          const history = musicService.getHistory(guildId, 10);
          if (history.length === 0) {
            await interaction.reply({ content: "ℹ️ Noch nichts gespielt.", flags: MessageFlags.Ephemeral });
            return;
          }
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🕘 Zuletzt gespielt")
            .setDescription(
              history
                .map((h) => `${h.source === "local" ? "📁" : "🎬"} **${h.title}**\n_${h.by} · <t:${Math.floor(h.at / 1000)}:R>_`)
                .join("\n\n")
                .slice(0, 4000),
            );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case "nowplaying": {
          const status = musicService.getStatus(guildId);
          if (!status?.current) {
            await interaction.reply({ content: "Es wird gerade nichts abgespielt.", flags: MessageFlags.Ephemeral });
            return;
          }

          const title = status.current.source === "local"
            ? `📁 ${status.current.title}`
            : `[${status.current.title}](${status.current.url})`;
          const embed = musicService.buildNowPlayingEmbed(
            title,
            status.queueLength,
            status.isPaused,
            status.volume,
          );
          if (status.current.thumbnail) embed.setThumbnail(status.current.thumbnail);
          await interaction.reply({ embeds: [embed], components: [createMusicControlRow()] });
          break;
        }

        case "panel": {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          try {
            const { postMusicPanel, buildPanelEmbed, createMusicPanelRows } = await import("../../handlers/musicControlHandler");
            const kanalOption = interaction.options.getChannel("kanal");
            if (!kanalOption) {
              const channel = await postMusicPanel(interaction.guild!);
              await interaction.editReply({ content: `✅ Musik-Steuerpanel in ${channel} bereitgestellt.` });
            } else {
              if (!("send" in kanalOption)) {
                await interaction.editReply({ content: "❌ Kein gültiger Textkanal." });
                return;
              }
              const msg = await (kanalOption as import("discord.js").TextChannel).send({
                embeds: [buildPanelEmbed(guildId)],
                components: createMusicPanelRows(),
              });
              const { panelChannelService } = await import("../../services/panelChannelService");
              await panelChannelService.cleanOldMessages(kanalOption as import("discord.js").TextChannel, msg.id).catch(() => null);
              await interaction.editReply({ content: `✅ Musik-Panel in ${kanalOption} gepostet.` });
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Konnte Panel nicht senden.";
            await interaction.editReply({ content: `❌ ${msg}` });
          }
          break;
        }
      }
    } catch (error: any) {
      const message = error?.message ?? "Ein unbekannter Fehler ist aufgetreten.";
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ ${message}` });
      } else {
        await interaction.reply({ content: `❌ ${message}`, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

import { SlashCommandBuilder } from "discord.js";
musicCommand.data = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Musik-Player mit YouTube-Suche und Warteschlange.")
  .addSubcommand((sub) =>
    sub
      .setName("play")
      .setDescription("Spielt einen Song oder fügt ihn zur Queue hinzu.")
      .addStringOption((opt) =>
        opt.setName("query").setDescription("YouTube-Suchbegriff oder URL").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("spotify")
      .setDescription("Importiert eine Spotify-Playlist in die Queue.")
      .addStringOption((opt) =>
        opt.setName("playlist").setDescription("Spotify-Playlist-Link oder ID").setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName("skip").setDescription("Überspielt den aktuellen Song."))
  .addSubcommand((sub) => sub.setName("stop").setDescription("Stoppt den Player und verlässt den Kanal."))
  .addSubcommand((sub) => sub.setName("pause").setDescription("Pausiert den aktuellen Song."))
  .addSubcommand((sub) => sub.setName("resume").setDescription("Setzt den Song fort."))
  .addSubcommand((sub) => sub.setName("queue").setDescription("Zeigt die Warteschlange."))
  .addSubcommand((sub) => sub.setName("shuffle").setDescription("Mischt die Warteschlange."))
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Entfernt einen Song aus der Queue.")
      .addIntegerOption((opt) =>
        opt.setName("position").setDescription("Position in der Queue (1-basiert)").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("volume")
      .setDescription("Ändert die Lautstärke.")
      .addIntegerOption((opt) =>
        opt.setName("percent").setDescription("Lautstärke in % (0-100)").setRequired(true).setMinValue(0).setMaxValue(100),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("loop")
      .setDescription("Wiederholung: Song, Queue oder aus.")
      .addStringOption((opt) =>
        opt
          .setName("modus")
          .setDescription("Wiederholungs-Modus")
          .setRequired(true)
          .addChoices(
            { name: "Aus", value: "off" },
            { name: "🔂 Song wiederholen", value: "track" },
            { name: "🔁 Queue wiederholen", value: "queue" },
          ),
      ),
  )
  .addSubcommand((sub) => sub.setName("nowplaying").setDescription("Zeigt den aktuellen Song."))
  .addSubcommand((sub) => sub.setName("history").setDescription("Zeigt die zuletzt gespielten Songs."))
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Richtet den Steuerungs-Textkanal #🎵・musik-steuerung ein oder postet das Panel.")
      .addChannelOption((opt) =>
        opt.setName("kanal").setDescription("Ziel-Textkanal (Standard: #🎵・musik-steuerung anlegen)").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("upload")
      .setDescription("Lädt eine Audiodatei in die Soundboard-Bibliothek hoch.")
      .addAttachmentOption((opt) =>
        opt.setName("datei").setDescription("MP3/WAV/OGG/M4A, max. 25 MB").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("code").setDescription("Upload-Code aus dem Dashboard (statt Kanal-Recht)").setRequired(false),
      ),
  );

export default musicCommand;
