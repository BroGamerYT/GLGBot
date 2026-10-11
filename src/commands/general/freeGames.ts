import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types";
import { freeGamesService } from "../../services/freeGamesService";

const freeGamesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("free-games")
    .setDescription("Kostenlose PC-Spiele (Epic, Steam, GOG & mehr).")
    .addSubcommand((sub) => sub.setName("list").setDescription("Zeigt dir alle aktuell kostenlosen Spiele."))
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("[Admin] Postet neue Gratis-Spiele jetzt sofort in den Free-Games-Kanal.")
        .addBooleanOption((o) =>
          o.setName("erneut").setDescription("Auch bereits gepostete Spiele noch einmal posten (ohne Ping).")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("einstellungen")
        .setDescription("[Admin] Welche Stores sollen gemeldet werden?")
        .addBooleanOption((o) => o.setName("epic").setDescription("Epic Games Store"))
        .addBooleanOption((o) => o.setName("steam").setDescription("Steam"))
        .addBooleanOption((o) => o.setName("gog").setDescription("GOG.com"))
        .addBooleanOption((o) => o.setName("andere").setDescription("Ubisoft, itch.io, Prime Gaming & Co."))
        .addBooleanOption((o) => o.setName("vorschau").setDescription("Epic-Vorschau: „Nächste Woche gratis“ ankündigen"))
        .addBooleanOption((o) => o.setName("verlosungen").setDescription("Key-Verlosungen auf Drittseiten (Alienware Arena & Co., Konto nötig)"))
    ),

  execute: async (interaction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (sub !== "list" && !isAdmin) {
      await interaction.reply({ content: "❌ Dafür brauchst du die Berechtigung **Server verwalten**.", ephemeral: true });
      return;
    }

    if (sub === "list") {
      await interaction.deferReply({ ephemeral: true });
      const games = (await freeGamesService.fetchAll()).filter((g) => !g.upcoming);
      if (games.length === 0) {
        await interaction.editReply("ℹ️ Gerade konnten keine kostenlosen Spiele gefunden werden. Versuch es später noch einmal.");
        return;
      }
      // Discord erlaubt max. 10 Embeds bzw. 5 Button-Reihen pro Nachricht
      const shown = games.slice(0, 5).map((g) => freeGamesService.buildMessage(g, games.length > 1));
      await interaction.editReply({
        content: `🎁 **${games.length} kostenlose Spiele gefunden**${games.length > 5 ? " (die 5 neuesten)" : ""}:`,
        embeds: shown.flatMap((m) => m.embeds),
        components: shown.flatMap((m) => m.components),
      });
      return;
    }

    if (sub === "post") {
      await interaction.deferReply({ ephemeral: true });
      const result = await freeGamesService.postFreeGames(interaction.guild, interaction.options.getBoolean("erneut") ?? false);
      if (result.error === "no_channel") {
        await interaction.editReply("⚠️ Kein Free-Games-Kanal eingerichtet. Nutze `/setup-roles set freegames_kanal:` oder `/setup-roles auto`.");
      } else if (result.count === 0) {
        await interaction.editReply("ℹ️ Keine neuen Gratis-Spiele - alles Aktuelle wurde schon gepostet. (Mit `erneut:True` nochmal posten.)");
      } else {
        await interaction.editReply(`✅ **${result.count}** Gratis-Spiel(e) in <#${result.channelId}> gepostet!`);
      }
      return;
    }

    if (sub === "einstellungen") {
      const patch: Record<string, boolean> = {};
      for (const [opt, key] of [["epic", "epic"], ["steam", "steam"], ["gog", "gog"], ["andere", "other"], ["vorschau", "upcoming"], ["verlosungen", "keys"]]) {
        const v = interaction.options.getBoolean(opt);
        if (v !== null) patch[key] = v;
      }
      const s = Object.keys(patch).length
        ? freeGamesService.updateSettings(interaction.guild.id, patch)
        : freeGamesService.getSettings(interaction.guild.id);
      const on = (b: boolean) => (b ? "✅ An" : "❌ Aus");
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🎮 Free-Games Einstellungen")
            .addFields(
              { name: "🟦 Epic Games", value: on(s.epic), inline: true },
              { name: "🎮 Steam", value: on(s.steam), inline: true },
              { name: "🟪 GOG", value: on(s.gog), inline: true },
              { name: "🎁 Andere Stores", value: on(s.other), inline: true },
              { name: "🔜 Epic-Vorschau", value: on(s.upcoming), inline: true },
              { name: "🎟️ Key-Verlosungen", value: on(s.keys), inline: true }
            )
            .setFooter({ text: "Geprüft wird automatisch alle 30 Minuten." }),
        ],
      });
      return;
    }
  },
};

export default freeGamesCommand;
