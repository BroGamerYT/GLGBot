import { Events, Interaction, AttachmentBuilder } from "discord.js";
import { BotEvent } from "../types";
import { 
  handleVoiceSelectMenu, 
  handleVoiceModalSubmit, 
  handleVoiceButton 
} from "../handlers/voicePanelHandler";
import { rolePanelService } from "../services/rolePanelService";
import { ticketService } from "../services/ticketService";
import { transcriptService } from "../services/transcriptService";
import { suggestionService } from "../services/suggestionService";

const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    // 1. Slash-Befehle
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`[Command] Unbekannter Befehl aufgerufen: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[Command Error] Fehler bei Ausführung von /${interaction.commandName}:`, error);

        const errorMessage = {
          content: "❌ Bei der Ausführung dieses Befehls ist ein interner Fehler aufgetreten.",
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => null);
        } else {
          await interaction.reply(errorMessage).catch(() => null);
        }
      }
      return;
    }

    // 2. Dropdown Menüs (Voice Panel)
    if (interaction.isStringSelectMenu()) {
      if (
        interaction.customId === "voice_settings_menu" ||
        interaction.customId === "voice_permissions_menu"
      ) {
        await handleVoiceSelectMenu(interaction);
      }
      return;
    }

    // 3. Modals (Texteingaben für Name & Limit)
    if (interaction.isModalSubmit()) {
      if (
        interaction.customId === "modal_voice_name" ||
        interaction.customId === "modal_voice_limit"
      ) {
        await handleVoiceModalSubmit(interaction);
      }
      return;
    }

    // 4. Buttons (Voice & Rollen-Panel)
    if (interaction.isButton()) {
      if (interaction.customId === "voice_btn_refresh") {
        await handleVoiceButton(interaction);
        return;
      }

      if (interaction.customId.startsWith("role_btn_")) {
        await rolePanelService.handleButton(interaction);
        return;
      }

      // Ticket Buttons
      if (interaction.customId === "btn_ticket_create") {
        if (!interaction.guild) return;
        await interaction.deferReply({ ephemeral: true });
        try {
          const ch = await ticketService.createTicket(interaction.guild, interaction.user, client);
          await interaction.editReply(`✅ Dein Ticket wurde geöffnet: <#${ch.id}>`);
        } catch (e: any) {
          await interaction.editReply(`❌ Fehler beim Öffnen des Tickets: ${e.message}`);
        }
        return;
      }

      if (interaction.customId === "btn_ticket_close") {
        if (!interaction.channel || !("guild" in interaction.channel)) return;
        await interaction.reply({ content: "🔒 Ticket wird geschlossen...", ephemeral: true });
        await ticketService.closeTicket(interaction.channel as any, interaction.user, client);
        return;
      }

      if (interaction.customId === "btn_ticket_transcript") {
        if (!interaction.channel || !("guild" in interaction.channel)) return;
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel as any;
        const messages = await transcriptService.fetchAllMessages(channel);
        const formatted = transcriptService.formatMessages(messages, channel.guild);

        const record = ticketService.getTickets(channel.guild.id).find((t) => t.channelId === channel.id);
        const now = new Date();
        const meta = {
          channelName: channel.name,
          channelId: channel.id,
          guildName: channel.guild.name,
          guildId: channel.guild.id,
          guildIcon: channel.guild.iconURL(),
          creatorTag: record?.creatorTag || interaction.user.tag,
          creatorId: record?.creatorId || interaction.user.id,
          createdAt: record ? new Date(record.createdAt).toLocaleString("de-DE") : now.toLocaleString("de-DE"),
          closedAt: now.toLocaleString("de-DE"),
        };

        const text = transcriptService.generateTextTranscript(meta, formatted);
        const html = transcriptService.generateHtmlTranscript(meta, formatted);

        const htmlAttachment = new AttachmentBuilder(Buffer.from(html, "utf-8"), {
          name: `transcript-${channel.name}.html`,
        });
        const txtAttachment = new AttachmentBuilder(Buffer.from(text, "utf-8"), {
          name: `transcript-${channel.name}.txt`,
        });

        await interaction.editReply({
          content: "📜 **Transkript erfolgreich erstellt!**\nDu kannst die `.html`-Datei direkt im Browser öffnen (Discord Dark-Theme) oder die `.txt`-Datei ansehen:",
          files: [htmlAttachment, txtAttachment],
        });
        return;
      }

      // Suggestion Vote Buttons
      if (interaction.customId.startsWith("btn_sugg_up_")) {
        const id = parseInt(interaction.customId.replace("btn_sugg_up_", ""), 10);
        await suggestionService.handleVote(interaction, id, "UP");
        return;
      }

      if (interaction.customId.startsWith("btn_sugg_down_")) {
        const id = parseInt(interaction.customId.replace("btn_sugg_down_", ""), 10);
        await suggestionService.handleVote(interaction, id, "DOWN");
        return;
      }
    }
  },
};

export default interactionCreateEvent;
