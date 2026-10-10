import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { suggestionService } from "../../services/suggestionService";

const suggestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Reiche einen Vorschlag oder eine Idee für den Server ein.")
    .addSubcommand((sub) =>
      sub
        .setName("neu")
        .setDescription("Reiche eine neue Idee ein.")
        .addStringOption((opt) =>
          opt
            .setName("idee")
            .setDescription("Deine Idee oder dein Vorschlag für den Server.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Setze den Status eines Vorschlags (Nur für Admins).")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("Die Vorschlags-ID (#1, #2...)").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("entscheidung")
            .setDescription("Die Entscheidung")
            .setRequired(true)
            .addChoices(
              { name: "🟢 Annehmen", value: "ACCEPTED" },
              { name: "🔴 Ablehnen", value: "DENIED" }
            )
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "neu") {
      const idea = interaction.options.getString("idee", true);
      let targetChannel = interaction.guild.channels.cache.find(
        (c) => c.isTextBased() && (c.name.includes("vorschl") || c.name.includes("ideen"))
      ) as TextChannel | undefined;

      if (!targetChannel) {
        targetChannel = interaction.channel as TextChannel;
      }

      if (!targetChannel || !("send" in targetChannel)) {
        await interaction.reply({ content: "❌ Ungültiger Kanal.", ephemeral: true });
        return;
      }

      const item = await suggestionService.postSuggestion(targetChannel, interaction.user, idea);
      await interaction.reply({
        content: `✅ Dein Vorschlag **#${item.id}** wurde erfolgreich in <#${targetChannel.id}> eingereicht!`,
        ephemeral: true,
      });
    } else if (sub === "status") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: "❌ Du benötigst Server-Verwaltungsrechte für diesen Befehl.",
          ephemeral: true,
        });
        return;
      }

      const id = interaction.options.getInteger("id", true);
      const status = interaction.options.getString("entscheidung", true) as "ACCEPTED" | "DENIED";

      const ok = await suggestionService.setStatus(
        interaction.guild.id,
        id,
        status,
        interaction.channel as TextChannel
      );

      if (ok) {
        await interaction.reply({
          content: `✅ Vorschlag **#${id}** wurde auf **${status === "ACCEPTED" ? "Angenommen 🟢" : "Abgelehnt 🔴"}** gesetzt.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `❌ Vorschlag **#${id}** nicht gefunden.`,
          ephemeral: true,
        });
      }
    }
  },
};

export default suggestCommand;
