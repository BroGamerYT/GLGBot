import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import {
  toSmallCaps,
  toBoldSans,
  toGothic,
  toDoubleStruck,
  toMonospace,
  toBubble,
  toItalic,
} from "../../utils/fontUtils";
import { BRANDING } from "../../config/branding";

const fontCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("font")
    .setDescription("Wandelt Text in stylische Unicode-Schriftarten (Small Caps, Bold, Gothic etc.) um.")
    .addStringOption((opt) =>
      opt
        .setName("text")
        .setDescription("Der Text, den du umwandeln möchtest")
        .setRequired(true)
        .setMaxLength(150)
    )
    .addStringOption((opt) =>
      opt
        .setName("style")
        .setDescription("Direkt einen bestimmten Schriftstil wählen (optional)")
        .setRequired(false)
        .addChoices(
          { name: "Small Caps (ᴋʟᴇɪɴᴇ ɢʀᴏßʙᴜᴄʜꜱᴛᴀʙᴇɴ)", value: "smallcaps" },
          { name: "Bold Sans (𝗙𝗲𝘁𝘁)", value: "boldsans" },
          { name: "Gothic / Fraktur (𝔉𝔯𝔞𝔨𝔱𝔲𝔯)", value: "gothic" },
          { name: "Double-Struck / Blackboard (𝕆𝕦𝕥𝕝𝕚𝕟𝕖)", value: "doublestruck" },
          { name: "Monospace / Code (𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎)", value: "monospace" },
          { name: "Bubble / Circled (Ⓑⓤⓑⓑⓛⓔ)", value: "bubble" },
          { name: "Kursiv / Italic (𝘒𝘶𝘳𝘴𝘪𝘷)", value: "italic" }
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const text = interaction.options.getString("text", true);
    const style = interaction.options.getString("style");

    const smallCapsVal = toSmallCaps(text);
    const boldSansVal = toBoldSans(text);
    const gothicVal = toGothic(text);
    const doubleStruckVal = toDoubleStruck(text);
    const monospaceVal = toMonospace(text);
    const bubbleVal = toBubble(text);
    const italicVal = toItalic(text);

    if (style) {
      let result = text;
      let styleName = "Standard";
      switch (style) {
        case "smallcaps":
          result = smallCapsVal;
          styleName = "Small Caps";
          break;
        case "boldsans":
          result = boldSansVal;
          styleName = "Bold Sans";
          break;
        case "gothic":
          result = gothicVal;
          styleName = "Gothic / Fraktur";
          break;
        case "doublestruck":
          result = doubleStruckVal;
          styleName = "Double-Struck";
          break;
        case "monospace":
          result = monospaceVal;
          styleName = "Monospace";
          break;
        case "bubble":
          result = bubbleVal;
          styleName = "Bubble";
          break;
        case "italic":
          result = italicVal;
          styleName = "Kursiv / Italic";
          break;
      }

      await interaction.reply({
        content: `**${styleName}:**\n${result}`,
      });
      return;
    }

    // Wenn kein einzelner Stil gewählt wurde: Übersicht aller Schriftarten anzeigen
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("✨ Schriftarten & Unicode-Designer")
      .setDescription(`Hier ist dein Text in verschiedenen Stilen (zum Kopieren anklicken):\n\n**Eingabe:** \`${text}\``)
      .addFields(
        { name: "🔤 Small Caps", value: `\`${smallCapsVal}\``, inline: true },
        { name: "🔤 Bold Sans", value: `\`${boldSansVal}\``, inline: true },
        { name: "🔤 Gothic / Fraktur", value: `\`${gothicVal}\``, inline: true },
        { name: "🔤 Double-Struck", value: `\`${doubleStruckVal}\``, inline: true },
        { name: "🔤 Monospace", value: `\`${monospaceVal}\``, inline: true },
        { name: "🔤 Bubble / Circles", value: `\`${bubbleVal}\``, inline: true },
        { name: "🔤 Kursiv / Italic", value: `\`${italicVal}\``, inline: true },
        { name: "💬 Kanal-Vorschau (Small Caps)", value: `\`💬・${smallCapsVal}\``, inline: true },
        { name: "〢 Aesthetic-Vorschau", value: `\`〢・${smallCapsVal}\``, inline: true }
      )
      .setFooter({ text: `${BRANDING.community} • Tipp: Nutze /channel-style, um Kanäle direkt umzubenennen!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default fontCommand;
