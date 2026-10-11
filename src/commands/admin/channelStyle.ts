import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  GuildChannel,
} from "discord.js";
import { Command } from "../../types";
import { CHANNEL_STYLES } from "../../utils/fontUtils";
import { BRANDING } from "../../config/branding";

const channelStyleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("channel-style")
    .setDescription("Benennt einen Discord-Kanal in ein stylisches Design / Schriftart um.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName("style")
        .setDescription("Der gewünschte Design- & Schriftstil")
        .setRequired(true)
        .addChoices(
          { name: "Small Caps (z. B. 💬・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "smallcaps" },
          { name: "Bold Sans (z. B. 💬・𝗵𝗮𝘂𝗽𝘁𝗰𝗵𝗮𝘁)", value: "boldsans" },
          { name: "Aesthetic Small Caps (z. B. 〢・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "aesthetic_caps" },
          { name: "Aesthetic Pipe (z. B. 〢・hauptchat)", value: "aesthetic" },
          { name: "Box Small Caps (z. B. 「💬」ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "box_caps" },
          { name: "Box & Bold (z. B. 「💬」hauptchat)", value: "box" },
          { name: "Cyber & Neon (z. B. ◈・ʜᴀᴜᴘᴛᴄʜᴀᴛ)", value: "cyber" },
          { name: "Gothic / Fraktur (z. B. ⚔・𝖍𝖆𝖚𝖕𝖙𝖈𝖍𝖆𝖙)", value: "gothic" },
          { name: "Modern mit Emojis (z. B. 💬・hauptchat)", value: "modern" },
          { name: "Clean & Minimalistisch (z. B. hauptchat)", value: "clean" }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Neuer Kanalname (optional – wenn leer, wird der jetzige Name gestylt)")
        .setRequired(false)
        .setMaxLength(80)
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Zielkanal (optional – Standard: dieser Kanal)")
        .setRequired(false)
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildCategory
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("icon")
        .setDescription("Optionales Icon/Emoji am Anfang (z. B. 💬, 🎮, 📢)")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetChannel = (interaction.options.getChannel("channel") || interaction.channel) as GuildChannel | null;
    if (!targetChannel) {
      await interaction.reply({ content: "❌ Kein gültiger Kanal gefunden.", ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ Dem Bot fehlt die Berechtigung **„Kanäle verwalten“**.",
        ephemeral: true,
      });
      return;
    }

    const styleId = interaction.options.getString("style", true);
    const customName = interaction.options.getString("name");
    const customIcon = interaction.options.getString("icon");

    const preset = CHANNEL_STYLES.find((s) => s.id === styleId) || CHANNEL_STYLES[0];

    // Extrahiere Basis-Namen (ohne vorherige Deko-Symbole falls vorhanden)
    let baseName = customName;
    if (!baseName) {
      baseName = targetChannel.name
        .replace(/^[^\w\s\u00C0-\u024F\u1E00-\u1EFF\u1D00-\u1D7F]+/gu, "") // Emojis / Zeichen vorne entfernen
        .replace(/^[・|〢「」◈›‹•\-_\s]+/gu, "")
        .trim();
      if (!baseName) baseName = targetChannel.name;
    }

    // Bestimme passendes Icon
    const defaultIcon =
      targetChannel.type === ChannelType.GuildVoice
        ? "🔊"
        : targetChannel.type === ChannelType.GuildAnnouncement
        ? "📢"
        : targetChannel.type === ChannelType.GuildCategory
        ? "📁"
        : "💬";
    const icon = customIcon || defaultIcon;

    let formattedName = "";
    if (targetChannel.type === ChannelType.GuildCategory) {
      formattedName = preset.formatCategory(baseName, icon);
    } else if (targetChannel.type === ChannelType.GuildVoice) {
      formattedName = preset.formatVoice(baseName, icon);
    } else {
      formattedName = preset.formatText(baseName, icon);
    }

    // Discord Limit für Kanalnamen ist 100 Zeichen
    if (formattedName.length > 100) {
      formattedName = formattedName.substring(0, 100);
    }

    const oldName = targetChannel.name;

    try {
      await targetChannel.setName(formattedName, `Kanal-Styling durch ${interaction.user.tag} (Stil: ${preset.name})`);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("✨ Kanal erfolgreich umgestylt!")
        .setDescription(
          `Der Kanal **${targetChannel.name}** wurde mit dem Stil **${preset.name}** aktualisiert.\n\n` +
          `🔹 **Vorher:** \`${oldName}\`\n` +
          `✨ **Nachher:** \`${formattedName}\`\n` +
          `🎨 **Stil-Profil:** ${preset.description}`
        )
        .setFooter({ text: `${BRANDING.community} • Kanal-Designer` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      console.error("[channelStyleCommand] Fehler:", err);
      await interaction.reply({
        content: `❌ Fehler beim Umbenennen: ${err.message || "Unbekannter Fehler. Bitte Discord Rate-Limits beachten."}`,
        ephemeral: true,
      });
    }
  },
};

export default channelStyleCommand;
