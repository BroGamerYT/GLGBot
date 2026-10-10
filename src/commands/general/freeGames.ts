import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { freeGamesService } from "../../services/freeGamesService";

const freeGamesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("free-games")
    .setDescription("Zeigt die aktuell kostenlosen PC-Spiele im Epic Games Store an.")
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Listet die aktuellen Gratis-Spiele für dich auf.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("Postet die aktuellen Gratis-Spiele in den konfigurierten #free-games Kanal.")
    ),

  execute: async (interaction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      await interaction.deferReply({ ephemeral: true });
      const games = await freeGamesService.fetchEpicFreeGames();

      if (games.length === 0) {
        await interaction.editReply({
          content: "ℹ️ Aktuell konnten keine kostenlosen Spiele gefunden werden. Bitte versuche es später erneut.",
        });
        return;
      }

      const embeds = games.map((game) => {
        const emb = new EmbedBuilder()
          .setColor(0x0078f2)
          .setTitle(`🎁 GRATIS: ${game.title}`)
          .setURL(game.storeUrl)
          .setDescription(game.description)
          .addFields(
            { name: "💰 Preis", value: "~~100% Rabatt~~ **0,00 € (KOSTENLOS)**", inline: true },
            { name: "🔗 Store-Link", value: `[Hier kostenlos sichern](${game.storeUrl})`, inline: true }
          );

        if (game.imageUrl) {
          emb.setImage(game.imageUrl);
        }

        if (game.endDate) {
          const endUnix = Math.floor(new Date(game.endDate).getTime() / 1000);
          emb.addFields({ name: "⏳ Verfügbar bis", value: `<t:${endUnix}:F> (<t:${endUnix}:R>)`, inline: false });
        }

        return emb;
      });

      await interaction.editReply({
        content: `🎉 **${games.length} kostenlose Spiele im Epic Games Store gefunden!**`,
        embeds,
      });
      return;
    }

    if (sub === "post") {
      await interaction.deferReply({ ephemeral: true });
      const result = await freeGamesService.postFreeGames(interaction.guild);

      if (result.count === 0) {
        await interaction.editReply({
          content: "⚠️ Konnte keine Spiele posten. Bitte stelle sicher, dass mit `/setup-roles set` ein Free-Games Kanal eingerichtet ist.",
        });
      } else {
        await interaction.editReply({
          content: `✅ Es wurden **${result.count} kostenlose Spiele** erfolgreich in <#${result.channelName}> gepostet!`,
        });
      }
      return;
    }
  },
};

export default freeGamesCommand;
