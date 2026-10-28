import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { Command } from "../../types";
import { BotClient } from "../../client/BotClient";
import { isMusicEnabled } from "../../config/env";
import { soundboardService } from "../../services/soundboardService";

const soundboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("soundboard")
    .setDescription("Spielt kurze Sounds aus data/music im Voice-Kanal ab.")
    .addSubcommand((sub) => sub.setName("list").setDescription("Zeigt alle verfügbaren Sounds."))
    .addSubcommand((sub) =>
      sub
        .setName("play")
        .setDescription("Spielt einen Sound ab (du musst im Voice sein).")
        .addStringOption((opt) =>
          opt.setName("sound").setDescription("Dateiname, z. B. intro.mp3 oder jingles/intro.mp3 (siehe /soundboard list)").setRequired(true),
        ),
    ) as any,
  execute: async (interaction: ChatInputCommandInteraction, _client: BotClient) => {
    if (!isMusicEnabled()) {
      await interaction.reply({ content: "❌ Musik ist deaktiviert (`MUSIC_MODE=disabled`).", flags: MessageFlags.Ephemeral });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const sounds = soundboardService.list();
      if (sounds.length === 0) {
        await interaction.reply({
          content: "ℹ️ Keine Sounds vorhanden. MP3/WAV-Dateien (max. 25 MB) in `data/music/` legen – auch in Unterordnern.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const byFolder = new Map<string, typeof sounds>();
      for (const s of sounds) {
        const key = s.folder || "📁 Hauptverzeichnis";
        if (!byFolder.has(key)) byFolder.set(key, []);
        byFolder.get(key)!.push(s);
      }
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🔊 Soundboard");
      for (const [folder, items] of byFolder) {
        embed.addFields({
          name: folder,
          value: items.map((s) => `• ${s.name} \`(${s.sizeKb} KB)\``).join("\n").slice(0, 1000),
        });
      }
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const member = interaction.member as GuildMember;
    const channel = member?.voice?.channel;
    if (!channel) {
      await interaction.reply({ content: "❌ Du musst in einem Voice-Kanal sein.", flags: MessageFlags.Ephemeral });
      return;
    }
    const file = interaction.options.getString("sound", true);
    await interaction.deferReply();
    try {
      const played = await soundboardService.play(channel, file);
      await interaction.editReply({ content: `🔊 Sound abgespielt: **${played}**` });
    } catch (e: any) {
      await interaction.editReply({ content: `❌ ${e?.message || "Konnte Sound nicht abspielen."}` });
    }
  },
};

export default soundboardCommand;
