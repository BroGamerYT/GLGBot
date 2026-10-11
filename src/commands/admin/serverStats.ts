import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { COUNTERS, CounterId, statsChannelsService } from "../../services/statsChannelsService";

const IDS = Object.keys(COUNTERS) as CounterId[];
/** Optionsnamen im Befehl (deutsch) */
const OPT_NAME: Record<CounterId, string> = { members: "mitglieder", humans: "menschen", online: "online", voice: "voice", live: "live", boosts: "boosts" };

const serverStatsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("server-stats")
    .setDescription("Statistik-Kanäle (Live-Zähler ganz oben) einrichten oder entfernen.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) => {
      sub.setName("einrichten").setDescription("Wählt die Zähler aus und legt die Kanäle an.");
      for (const id of IDS) {
        sub.addBooleanOption((o) => o.setName(OPT_NAME[id]).setDescription(COUNTERS[id].label));
      }
      return sub;
    })
    .addSubcommand((sub) => sub.setName("entfernen").setDescription("Entfernt alle Statistik-Kanäle."))
    .addSubcommand((sub) => sub.setName("status").setDescription("Zeigt die aktiven Zähler.")),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "status") {
      const cfg = statsChannelsService.getConfig(guild.id);
      const active = IDS.filter((id) => cfg.counters[id]?.enabled);
      await interaction.reply({
        content: active.length ? `📊 Aktive Zähler: ${active.map((id) => `<#${cfg.counters[id]!.channelId}>`).join(", ")}\nAktualisierung alle 10 Minuten.` : "ℹ️ Keine Statistik-Kanäle eingerichtet.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const wanted: Partial<Record<CounterId, { enabled: boolean }>> = {};
      if (sub === "einrichten") {
        const cfg = statsChannelsService.getConfig(guild.id);
        let any = false;
        for (const id of IDS) {
          const v = interaction.options.getBoolean(OPT_NAME[id]);
          if (v !== null) any = true;
          wanted[id] = { enabled: v ?? !!cfg.counters[id]?.enabled };
        }
        // Ohne Auswahl: sinnvolle Standard-Zähler
        if (!any) for (const id of ["members", "voice", "live"] as CounterId[]) wanted[id] = { enabled: true };
      } else {
        for (const id of IDS) wanted[id] = { enabled: false };
      }
      const cfg = await statsChannelsService.apply(guild, wanted);
      const active = IDS.filter((id) => cfg.counters[id]?.enabled);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(sub === "einrichten" ? "📊 Statistik-Kanäle eingerichtet" : "🗑️ Statistik-Kanäle entfernt")
            .setDescription(active.length ? active.map((id) => `• <#${cfg.counters[id]!.channelId}>`).join("\n") + "\n\nDie Zahlen werden alle 10 Minuten aktualisiert." : "Keine Zähler aktiv."),
        ],
      });
    } catch (e: any) {
      await interaction.editReply({ content: `❌ ${e?.message || "Fehler beim Einrichten."}` });
    }
  },
};

export default serverStatsCommand;
