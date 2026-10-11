import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Command } from "../../types";
import { guildAccessService } from "../../services/guildAccessService";
import { systemService } from "../../services/systemService";
import { BRANDING } from "../../config/branding";

const restartCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Startet den Bot oder das Webinterface neu (nur Administratoren & Bot-Besitzer).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("komponente")
        .setDescription("Welche Komponente soll neu gestartet werden?")
        .setRequired(false)
        .addChoices(
          { name: "🤖 Discord Bot (Standard)", value: "bot" },
          { name: "🌐 Webinterface (Dashboard)", value: "web" },
          { name: "⚡ Bot & Webinterface gemeinsam", value: "all" }
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction, client) => {
    const isOwner = guildAccessService.isBotOwner(interaction.user.id, client);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: "❌ Dieser Befehl ist nur für Server-Administratoren und den Bot-Besitzer verfügbar.",
        ephemeral: true,
      });
      return;
    }

    const target = (interaction.options.getString("komponente") || "bot") as "bot" | "web" | "all";

    const targetNames: Record<string, string> = {
      bot: "🤖 Discord-Bot (`discord-bot`)",
      web: "🌐 Webinterface (`discord-web`)",
      all: "⚡ Discord-Bot & Webinterface (Beide Prozesse)",
    };

    const embed = new EmbedBuilder()
      .setColor(0xffac33)
      .setTitle("🔄 Neustart wird ausgeführt...")
      .setDescription(
        `Der Neustart wurde von <@${interaction.user.id}> angefordert.\n\n` +
          `📦 **Komponente:** ${targetNames[target]}\n` +
          `⚙️ **Prozess-Manager:** PM2\n` +
          `⏳ **Dauer:** ca. 3–5 Sekunden\n\n` +
          `*Der Bot wird in wenigen Augenblicken wieder voll einsatzbereit sein.*`
      )
      .setFooter({ text: `${BRANDING.bot} System-Manager` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    try {
      await systemService.restart(target);
    } catch (err: any) {
      console.error("[RestartCommand] Fehler beim Ausführen des Neustarts:", err);
    }
  },
};

export default restartCommand;
