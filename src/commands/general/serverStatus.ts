import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { gameServerService } from "../../services/gameServerService";

const TYPE_LABEL = { minecraft: "Minecraft", source: "Source/Steam", tcp: "Port-Check" } as const;

const serverStatusCommand: Command = {
  data: new SlashCommandBuilder().setName("serverstatus").setDescription("Zeigt den Live-Status unserer Game-Server."),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const servers = gameServerService.list(interaction.guild.id);
    if (servers.length === 0) {
      await interaction.reply({ content: "ℹ️ Es sind noch keine Game-Server eingetragen (Dashboard → Game-Server).", ephemeral: true });
      return;
    }
    await interaction.deferReply();
    const results = await gameServerService.checkGuild(interaction.guild.id);
    const online = results.filter((r) => r.status.online).length;
    const embed = new EmbedBuilder()
      .setColor(online === results.length ? 0x57f287 : online === 0 ? 0xed4245 : 0xfee75c)
      .setTitle(`🖥️ Game-Server · ${online}/${results.length} online`)
      .setTimestamp();
    for (const { server, status } of results.slice(0, 25)) {
      const lines = [
        status.online ? "🟢 **Online**" : `🔴 **Offline**${status.error ? ` – ${status.error}` : ""}`,
        status.online && status.maxPlayers ? `👥 ${status.players}/${status.maxPlayers} Spieler` : null,
        status.map ? `🗺️ ${status.map}` : null,
        status.version ? `🏷️ ${status.version}` : null,
        server.hideAddress ? null : `📡 \`${server.displayAddress || `${server.host}:${server.port}`}\``,
      ].filter(Boolean);
      embed.addFields({ name: `${server.name} (${TYPE_LABEL[server.type]})`, value: lines.join("\n"), inline: results.length > 1 });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};

export default serverStatusCommand;
