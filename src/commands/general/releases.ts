import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { releaseService } from "../../services/releaseService";
import { BRANDING } from "../../config/branding";

const releasesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("releases")
    .setDescription("Zeigt kommende Spiele-Neuerscheinungen und Release-Termine an.")
    .addSubcommand((sub) =>
      sub
        .setName("uebersicht")
        .setDescription("Zeigt kommende Spiele-Releases nach Zeitraum und Plattform.")
        .addStringOption((opt) =>
          opt
            .setName("zeitraum")
            .setDescription("Zeitraum der Veröffentlichungen.")
            .addChoices(
              { name: "Diese Woche", value: "week" },
              { name: "Dieser Monat", value: "month" },
              { name: "Nächster Monat", value: "next_month" },
              { name: "Alle kommenden", value: "upcoming" }
            )
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("plattform")
            .setDescription("Nach Spielplattform filtern.")
            .addChoices(
              { name: "Alle Plattformen", value: "alle" },
              { name: "PC", value: "pc" },
              { name: "PlayStation 5", value: "ps5" },
              { name: "Xbox Series", value: "xbox" },
              { name: "Nintendo Switch", value: "switch" },
              { name: "Xbox Game Pass", value: "gamepass" }
            )
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("post-woche")
        .setDescription("Postet die Releases der laufenden Woche in den konfigurierten Ankündigungskanal.")
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand(false) || "uebersicht";

    if (sub === "post-woche") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: "❌ Dafür benötigst du die Berechtigung „Server verwalten“.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const ok = await releaseService.postWeeklyReleases(interaction.client, interaction.guild.id);
      if (!ok) {
        await interaction.editReply({
          content: "❌ Wochen-Post konnte nicht versendet werden. Prüfe bitte im Dashboard (`/releases`), ob ein Kanal hinterlegt ist.",
        });
        return;
      }

      await interaction.editReply({
        content: "✅ Der Release-Post für die laufende Woche wurde erfolgreich im Kanal veröffentlicht!",
      });
      return;
    }

    const timeframe = (interaction.options.getString("zeitraum") as any) || "upcoming";
    const platform = interaction.options.getString("plattform") || "alle";

    const filtered = releaseService.getFilteredReleases(interaction.guild.id, {
      timeframe,
      platform,
    });

    const timeframeTitles = {
      week: "dieser Woche",
      month: "dieses Monats",
      next_month: "des nächsten Monats",
      upcoming: "der kommenden Zeit",
      all: "im Kalender",
    };

    const titleSuffix = timeframeTitles[timeframe as keyof typeof timeframeTitles] || "der kommenden Zeit";

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📅 Spiele-Releases ${titleSuffix}`)
      .setDescription(
        filtered.length === 0
          ? `Keine anstehenden Releases für die Auswahl gefunden (Plattform: **${platform.toUpperCase()}**).\nSchau im Web-Dashboard vorbei oder wähle einen anderen Zeitraum!`
          : `Gefundene Titel (**${filtered.length}**)${platform !== "alle" ? ` für **${platform.toUpperCase()}**` : ""}:`
      )
      .setFooter({ text: `${BRANDING.community} • Game-Release Kalender` })
      .setTimestamp();

    for (const r of filtered.slice(0, 7)) {
      const parts = r.releaseDate.split("-");
      const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
      const rDate = new Date(`${r.releaseDate}T00:00:00`);
      const unix = Math.floor(rDate.getTime() / 1000);

      const platIcons = r.platforms
        .map((p) => {
          if (p === "PC") return "💻 PC";
          if (p === "PS5") return "🎮 PS5";
          if (p === "Xbox") return "🟢 Xbox";
          if (p === "Switch") return "🔴 Switch";
          if (p === "Game Pass") return "🎫 Game Pass";
          return p;
        })
        .join(" • ");

      let val = `📅 **${formattedDate}** (<t:${unix}:R>)\n🕹️ **Plattformen:** ${platIcons}\n🏷️ **Genre:** ${r.genre}`;
      const links = [];
      if (r.storeUrl) links.push(`[🛒 Store](${r.storeUrl})`);
      if (r.trailerUrl) links.push(`[🎥 Trailer](${r.trailerUrl})`);
      if (links.length > 0) val += `\n${links.join(" • ")}`;

      embed.addFields({
        name: `🎮 ${r.title}`,
        value: val,
        inline: false,
      });
    }

    if (filtered.length > 7) {
      embed.addFields({
        name: "➕ Weitere Titel",
        value: `...und **${filtered.length - 7} weitere Spiele** im vollständigen Web-Kalender!`,
      });
    }

    if (filtered.length > 0 && filtered[0].coverUrl) {
      embed.setThumbnail(filtered[0].coverUrl);
    }

    const row = new ActionRowBuilder<ButtonBuilder>();
    const dashboardUrl = process.env.DASHBOARD_URL || "";
    if (dashboardUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Web-Kalender öffnen")
          .setStyle(ButtonStyle.Link)
          .setURL(`${dashboardUrl.replace(/\/+$/, "")}/releases`)
      );
    }

    await interaction.reply({
      embeds: [embed],
      components: row.components.length > 0 ? [row] : undefined,
    });
  },
};

export default releasesCommand;
