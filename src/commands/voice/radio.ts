import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { isMusicEnabled } from "../../config/env";
import { radioService } from "../../services/radioService";
import { radioStationService } from "../../services/radioStationService";
import { buildRadioPanelEmbed, createRadioPanelRows, getPanelStations } from "../../handlers/radioPanelHandler";

const radioCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Steuert einen Web-Radio-Stream im Voice-Kanal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Startet einen Web-Radio-Stream in deinem Voice-Kanal.")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Stream-URL (http/https)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Anzeigename des Senders").setMaxLength(60),
        ),
    )
    .addSubcommand((sub) => sub.setName("stop").setDescription("Stoppt das Radio und verlaesst den Kanal."))
    .addSubcommand((sub) => sub.setName("pause").setDescription("Pausiert das Radio."))
    .addSubcommand((sub) => sub.setName("resume").setDescription("Setzt das Radio fort."))
    .addSubcommand((sub) => sub.setName("status").setDescription("Zeigt den aktuellen Radio-Status."))
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Postet das Radio-Panel (Senderwahl + Lautstärke).")
        .addChannelOption((opt) =>
          opt.setName("kanal").setDescription("Ziel-Textkanal (Standard: aktueller Kanal)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("ton").setDescription("Selbsttest: 5s Testton – prüft, ob du den Bot hörst."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Speichert einen eigenen Sender.")
        .addStringOption((opt) => opt.setName("name").setDescription("Anzeigename").setRequired(true).setMaxLength(60))
        .addStringOption((opt) => opt.setName("url").setDescription("Stream-URL (http/https)").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Löscht einen gespeicherten Sender.")
        .addStringOption((opt) => opt.setName("sender").setDescription("Name oder ID des Senders").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("Zeigt alle gespeicherten Sender.")),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf Servern nutzbar.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!isMusicEnabled()) {
      await interaction.reply({ content: "❌ Musik ist deaktiviert (`MUSIC_MODE=disabled`).", flags: MessageFlags.Ephemeral });
      return;
    }
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setTimestamp();

    try {
      if (sub === "start") {
        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        if (!channel) {
          await interaction.reply({ content: "❌ Du musst in einem Voice-Kanal sein.", flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.deferReply();
        const url = interaction.options.getString("url", true);
        const name = interaction.options.getString("name") ?? "Web-Radio";
        await radioService.start(channel, url, name, interaction.user.id);
        embed
          .setColor(0x00ff00)
          .setTitle("📻 Web-Radio gestartet")
          .setDescription(`**Sender:** ${name}\n**Kanal:** ${channel}`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (sub === "ton") {
        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        if (!channel) {
          await interaction.reply({ content: "❌ Du musst in einem Voice-Kanal sein.", flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
          await radioService.selfTest(channel);
          await interaction.editReply({
            content: "🔔 Testton abgespielt.\n• **Gehört?** → Voice-Pipeline ok, Problem liegt an der Stream-URL.\n• **Nichts gehört?** → Server kann kein Audio senden (Firewall/UDP/Opus) – Logs prüfen.",
          });
        } catch (e: any) {
          await interaction.editReply({ content: `❌ ${e?.message || "Selbsttest fehlgeschlagen."}` });
        }
        return;
      }

      if (sub === "status") {
        const status = radioService.getStatus(guildId);
        if (!status) {
          await interaction.reply({ content: "ℹ️ Es läuft gerade kein Radio.", flags: MessageFlags.Ephemeral });
          return;
        }
        embed
          .setColor(0x5865f2)
          .setTitle("📻 Radio-Status")
          .setDescription(
            `**Sender:** ${status.name}\n**Kanal:** <#${status.channelId}>\n**Status:** ${status.paused ? "⏸️ Pausiert" : "▶️ Läuft"}` +
            (status.nowPlaying ? `\n🎵 **Läuft gerade:** ${status.nowPlaying}` : "") +
            (status.lastError ? `\n⚠️ **Letzter Fehler:** ${status.lastError}` : ""),
          );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (sub === "panel") {
        const target = interaction.options.getChannel("kanal") || interaction.channel;
        if (!target || !("send" in target)) {
          await interaction.reply({ content: "❌ Kein gültiger Textkanal.", flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
          const stations = getPanelStations(guildId);
          await (target as import("discord.js").TextChannel).send({
            embeds: [buildRadioPanelEmbed(guildId, stations)],
            components: createRadioPanelRows(stations),
          });
          await interaction.editReply({ content: `✅ Radio-Panel in ${target} gepostet.` });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Konnte Panel nicht senden.";
          await interaction.editReply({ content: `❌ ${msg}` });
        }
        return;
      }

      if (sub === "add") {
        const name = interaction.options.getString("name", true);
        const url = interaction.options.getString("url", true);
        try {
          const station = radioStationService.add(guildId, name, url);
          await interaction.reply({ content: `✅ Sender **${station.name}** gespeichert.`, flags: MessageFlags.Ephemeral });
        } catch (e: any) {
          await interaction.reply({ content: `❌ ${e?.message || "Konnte Sender nicht speichern."}`, flags: MessageFlags.Ephemeral });
        }
        return;
      }

      if (sub === "remove") {
        const query = interaction.options.getString("sender", true);
        const removed = radioStationService.remove(guildId, query);
        await interaction.reply({
          content: removed ? `🗑️ Sender **${removed.name}** gelöscht.` : "❌ Sender nicht gefunden.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (sub === "list") {
        const list = radioStationService.listCustom(guildId);
        if (list.length === 0) {
          await interaction.reply({ content: "ℹ️ Keine eigenen Sender gespeichert.", flags: MessageFlags.Ephemeral });
          return;
        }
        embed
          .setColor(0x5865f2)
          .setTitle("📻 Gespeicherte Sender")
          .setDescription(list.map((s, i) => `**${i + 1}.** ${s.name}\n${s.url}`).join("\n\n").slice(0, 4000));
        await interaction.reply({ embeds: [embed] });
        return;
      }

      let ok: boolean;
      let title: string;
      if (sub === "stop") {
        ok = await radioService.stop(guildId);
        title = "⏹️ Radio gestoppt";
      } else if (sub === "pause") {
        ok = radioService.pause(guildId);
        title = "⏸️ Radio pausiert";
      } else {
        ok = radioService.resume(guildId);
        title = "▶️ Radio fortgesetzt";
      }
      if (!ok) {
        await interaction.reply({ content: "ℹ️ Es läuft gerade kein Radio.", flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ embeds: [embed.setColor(0x00ff00).setTitle(title)] });
    } catch (error) {
      const message = `❌ ${error instanceof Error ? error.message : "Unbekannter Fehler."}`;
      console.error(`[Radio] /radio ${sub} fehlgeschlagen:`, error);
      if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message, embeds: [] });
      else await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  },
};

export default radioCommand;
