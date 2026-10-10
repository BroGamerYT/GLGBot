import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { liveStreamService } from "../../services/liveStreamService";

const twitchLiveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("twitch-live")
    .setDescription("Markiert dich als LIVE auf Twitch, vergibt die Live-Rolle und erstellt deinen Stream-Kanal.")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Startet deinen Live-Status und postet die Ankündigung.")
        .addStringOption((opt) =>
          opt
            .setName("link")
            .setDescription("Dein Twitch-Link (z. B. https://twitch.tv/deinkanal).")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("spiel")
            .setDescription("Welches Spiel oder welche Kategorie streamst du? (z. B. Just Chatting, Minecraft).")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("titel")
            .setDescription("Dein Stream-Titel.")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stop")
        .setDescription("Beendet deinen Live-Status, entfernt die Live-Rolle und löscht den temporären Kanal.")
    ),

  execute: async (interaction) => {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const link = interaction.options.getString("link", false) || undefined;
      const game = interaction.options.getString("spiel", false) || undefined;
      const title = interaction.options.getString("titel", false) || undefined;

      await interaction.deferReply({ ephemeral: true });
      const result = await liveStreamService.startLive(member, { url: link, game, title });

      await interaction.editReply({
        content: result.message,
      });
      return;
    }

    if (sub === "stop") {
      await interaction.deferReply({ ephemeral: true });
      const result = await liveStreamService.stopLive(member);
      await interaction.editReply({
        content: result.message,
      });
      return;
    }
  },
};

export default twitchLiveCommand;
