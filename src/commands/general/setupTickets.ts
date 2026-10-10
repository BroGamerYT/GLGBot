import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import { ticketService } from "../../services/ticketService";

const setupTicketsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Richtet das Ticket- & Support-System ein und postet das Erstellungs-Panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("kanal")
        .setDescription("Der Kanal, in dem das Ticket-Panel gepostet werden soll.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName("kategorie")
        .setDescription("Die Kategorie, unter der neue Tickets erstellt werden sollen.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName("support_rolle")
        .setDescription("Rolle, die Zugriff auf alle Tickets erhalten soll (z.B. Moderator).")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const targetChannel =
      (interaction.options.getChannel("kanal") as TextChannel) || (interaction.channel as TextChannel);
    const category = interaction.options.getChannel("kategorie");
    const supportRole = interaction.options.getRole("support_rolle");

    ticketService.setConfig(interaction.guild.id, {
      categoryId: category ? category.id : undefined,
      supportRoleId: supportRole ? supportRole.id : undefined,
    });

    const panel = ticketService.createPanelEmbed();
    await targetChannel.send(panel);

    await interaction.reply({
      content: `✅ Ticket-Panel erfolgreich in <#${targetChannel.id}> gepostet!`,
      ephemeral: true,
    });
  },
};

export default setupTicketsCommand;
