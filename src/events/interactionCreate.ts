import { Events, Interaction, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { BotEvent } from "../types";
import { 
  handleVoiceSelectMenu, 
  handleVoiceModalSubmit, 
  handleVoiceButton 
} from "../handlers/voicePanelHandler";
import {
  handleStreamerSelectMenu,
  handleStreamerButton,
  handleStreamerModalSubmit,
} from "../handlers/streamerPanelHandler";
import { rolePanelService } from "../services/rolePanelService";
import { ticketService } from "../services/ticketService";
import { transcriptService } from "../services/transcriptService";
import { suggestionService } from "../services/suggestionService";
import { moduleService } from "../services/moduleService";
import { customCommandService } from "../services/customCommandService";
import { lfgService } from "../services/lfgService";
import { giveawayService } from "../services/giveawayService";
import { directMessageService } from "../services/directMessageService";
import { musicService } from "../services/musicService";
import { handleMusicButton, handleSoundSelect } from "../handlers/musicControlHandler";
import { handleRadioButton, handleRadioSelect } from "../handlers/radioPanelHandler";

const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    // Direktnachrichten-Interaktionen (Buttons & Dropdowns in DMs)
    if ((interaction.isButton() || interaction.isStringSelectMenu()) && (!interaction.guildId || interaction.customId.startsWith("dm_"))) {
      await directMessageService.handleInteraction(interaction as any, client);
      return;
    }
    // 1. Slash-Befehle
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        // Eigene Befehle des Servers (Dashboard "Eigene Befehle")
        if (await customCommandService.handleInteraction(interaction).catch(() => false)) return;
        console.warn(`[Command] Unbekannter Befehl aufgerufen: ${interaction.commandName}`);
        return;
      }

      // Modul-Prüfung: Ist das Modul für diesen Befehl aktiv?
      if (interaction.guildId) {
        const modCheck = moduleService.isCommandEnabled(interaction.guildId, interaction.commandName);
        if (!modCheck.enabled) {
          await interaction.reply({
            content: `⚠️ Das Modul **${modCheck.moduleName}** ist auf diesem Server aktuell deaktiviert.\nEin Administrator kann es mit \`/modules enable\` oder im Web-Dashboard wieder aktivieren.`,
            ephemeral: true,
          });
          return;
        }
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

    // Modul-Prüfung für Buttons, Dropdowns & Formulare (z. B. Ticket-Button bei ausgeschaltetem Ticket-Modul)
    if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && interaction.guildId) {
      const modId = moduleService.moduleForComponent(interaction.customId);
      if (modId && !moduleService.isEnabled(interaction.guildId, modId)) {
        const name = moduleService.getModuleById(modId)?.name || modId;
        await interaction
          .reply({ content: `⚠️ Das Modul **${name}** ist auf diesem Server aktuell ausgeschaltet.`, ephemeral: true })
          .catch(() => null);
        return;
      }
    }

    // 2. Dropdown Menüs (Voice & Streamer Panel)
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "sound_pick") {
        await handleSoundSelect(interaction);
        return;
      }
      if (interaction.customId === "radio_station_pick" || interaction.customId.startsWith("radio_station_pick_")) {
        await handleRadioSelect(interaction);
        return;
      }
      if (
        interaction.customId === "voice_settings_menu" ||
        interaction.customId === "voice_permissions_menu"
      ) {
        await handleVoiceSelectMenu(interaction);
      } else if (interaction.customId === "stream_panel_menu") {
        await handleStreamerSelectMenu(interaction);
      }
      return;
    }

    // 3. Modals (Texteingaben für Name, Limit, PW)
    if (interaction.isModalSubmit()) {
      if (
        interaction.customId === "modal_voice_name" ||
        interaction.customId === "modal_voice_limit" ||
        interaction.customId.startsWith("modal_voice_pw_")
      ) {
        await handleVoiceModalSubmit(interaction);
      } else if (interaction.customId.startsWith("modal_stream_")) {
        await handleStreamerModalSubmit(interaction);
      }
      return;
    }

    // 4. Buttons (Voice, Streamer & Rollen-Panel)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("voice_btn_")) {
        await handleVoiceButton(interaction);
        return;
      }

      if (interaction.customId.startsWith("stream_btn_")) {
        await handleStreamerButton(interaction);
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

      // Music Control Buttons (⏸️/▶️/⏭️/⏹️/🔀)
      if (interaction.customId.startsWith("music_")) {
        await handleMusicButton(interaction);
        return;
      }

      // Radio Panel Buttons (Pause/Weiter/Stop/Lautstärke/Refresh)
      if (interaction.customId.startsWith("radio_")) {
        await handleRadioButton(interaction);
        return;
      }

      // Music Queue Buttons
      if (interaction.customId === "queue_prev" || interaction.customId === "queue_next") {
        if (!interaction.guildId) return;
        const queue = musicService.getQueue(interaction.guildId);
        if (queue.length === 0) {
          await interaction.reply({ content: "Die Queue ist leer.", ephemeral: true });
          return;
        }

        const currentEmbed = interaction.message?.embeds[0];
        const footerText = currentEmbed?.footer?.text ?? "Seite 1/1";
        const match = footerText.match(/Seite (\d+)\/(\d+)/);
        let page = match ? parseInt(match[1], 10) - 1 : 0;
        const totalPages = match ? parseInt(match[2], 10) : 1;

        if (interaction.customId === "queue_prev") page = Math.max(0, page - 1);
        else page = Math.min(totalPages - 1, page + 1);

        const pageSize = 10;
        const start = page * pageSize;
        const items = queue.slice(start, start + pageSize);

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎵 Warteschlange (${queue.length} Songs)`)
          .setDescription(
            items.map((item, i) => `**${start + i + 1}.** [${item.title}](${item.url}) — ${item.duration} | ${item.requestedBy.tag}`).join("\n"),
          )
          .setFooter({ text: `Seite ${page + 1}/${totalPages}` });

        await interaction.update({ embeds: [embed] });
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

      // LFG / Mitspieler-Suche
      if (interaction.customId.startsWith("lfg_")) {
        await lfgService.handleButton(interaction);
        return;
      }

      // Giveaway Buttons
      if (interaction.customId.startsWith("giveaway_enter_")) {
        if (!interaction.guild) return;
        const giveawayId = interaction.customId.replace("giveaway_enter_", "");
        const res = await giveawayService.toggleEntry(interaction.guild, giveawayId, interaction.user.id);

        const data = giveawayService.getGiveaway(giveawayId);
        if (data && interaction.message) {
          const embed = giveawayService.buildGiveawayEmbed(data);
          const row = giveawayService.buildGiveawayButton(data);
          await interaction.message.edit({ embeds: [embed], components: [row] }).catch(() => null);
        }

        await interaction.reply({
          content: res.message,
          ephemeral: true,
        });
        return;
      }
    }
  },
};

export default interactionCreateEvent;
