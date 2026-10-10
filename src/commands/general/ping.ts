import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../../types";

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Überprüft die Latenz und Erreichbarkeit des Bots."),
  execute: async (interaction, client) => {
    const sent = await interaction.reply({
      content: "🏓 Berechne Ping...",
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "🌐 WebSocket-Latenz", value: `\`${wsPing}ms\``, inline: true },
        { name: "⚡ Roundtrip-Latenz", value: `\`${roundtrip}ms\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      content: null,
      embeds: [embed],
    });
  },
};

export default pingCommand;
