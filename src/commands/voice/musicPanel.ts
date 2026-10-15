import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { BotClient } from "../../client/BotClient";
import { isMusicEnabled } from "../../config/env";
import { buildPanelEmbed, createMusicPanelRows } from "../../handlers/musicControlHandler";

const musicPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("music-panel")
    .setDescription("Postet das permanente Musik-Panel (Steuerung + Lautstärke) in einen Textkanal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption((opt) =>
      opt.setName("kanal").setDescription("Ziel-Textkanal (Standard: aktueller Kanal)").setRequired(false),
    ) as any,
  execute: async (interaction: ChatInputCommandInteraction, _client: BotClient) => {
    if (!interaction.inGuild() || !interaction.guildId) {
      await interaction.reply({ content: "Nur auf Servern nutzbar.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!isMusicEnabled()) {
      await interaction.reply({ content: "❌ Musik ist deaktiviert (`MUSIC_MODE=disabled`).", flags: MessageFlags.Ephemeral });
      return;
    }
    const target = interaction.options.getChannel("kanal") || interaction.channel;
    if (!target || !("send" in target)) {
      await interaction.reply({ content: "❌ Kein gültiger Textkanal.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await (target as TextChannel).send({
        embeds: [buildPanelEmbed(interaction.guildId!)],
        components: createMusicPanelRows(),
      });
      await interaction.editReply({ content: `✅ Musik-Panel in ${target} gepostet.` });
    } catch (e: any) {
      await interaction.editReply({ content: `❌ ${e?.message || "Konnte Panel nicht senden."}` });
    }
  },
};

export default musicPanelCommand;
