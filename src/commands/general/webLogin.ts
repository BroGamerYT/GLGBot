import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import { authCodeService } from "../../services/authCodeService";
import { BRANDING } from "../../config/branding";

const webLoginCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("web-login")
    .setDescription("Erhalte einen sicheren 30-Minuten Login-Code für das Web-Dashboard und den Shop."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: "❌ Dieser Befehl kann nur auf einem Discord-Server verwendet werden.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const { code, expiresAt, loginUrl } = authCodeService.generateCode(
      interaction.guild,
      interaction.user,
      member
    );

    const expiresSec = Math.floor(expiresAt / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🔐 Dein persönlicher Web-Login Code")
      .setDescription(
        `Mit diesem Code kannst du dich sofort im **Web-Dashboard** und im **Shop** anmelden – ganz ohne Passwort oder Discord-OAuth-Bestätigung!\n\n` +
          `### Dein Einmal-Code:\n` +
          `# \`\`\`${code}\`\`\`\n` +
          `⏱️ **Gültig für:** <t:${expiresSec}:R> (30 Minuten)\n` +
          `👤 **Konto:** <@${interaction.user.id}> (${interaction.user.tag})\n\n` +
          `👉 Klicke unten auf den Button, um dich direkt im Browser einzuloggen, oder tippe den Code im Dashboard unter **„Mit Code einloggen“** ein.`
      )
      .setFooter({
        text: `${BRANDING.bot} • Einmal-Code verfällt automatisch`,
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Im Browser öffnen & einloggen")
        .setEmoji("🚀")
        .setStyle(ButtonStyle.Link)
        .setURL(loginUrl),
      new ButtonBuilder()
        .setLabel("Shop öffnen")
        .setEmoji("🛒")
        .setStyle(ButtonStyle.Link)
        .setURL(`${(process.env.DASHBOARD_URL || "https://glgbot.brogameryt.de").replace(/\/+$/, "")}/economy`)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};

export default webLoginCommand;
