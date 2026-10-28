import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import {
  Guild,
  User,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from "discord.js";

export interface Suggestion {
  id: number;
  guildId: string;
  messageId: string;
  channelId: string;
  authorId: string;
  authorTag: string;
  authorAvatar?: string;
  content: string;
  upvotes: string[]; // User IDs
  downvotes: string[]; // User IDs
  status: "PENDING" | "ACCEPTED" | "DENIED";
  createdAt: string;
}

const DATA_DIR = path.join(__dirname, "../../data");
const SUGGESTIONS_FILE = path.join(DATA_DIR, "suggestions.json");

class SuggestionService {
  private suggestions: Suggestion[] = [];

  constructor() {
    this.ensureDataDir();
    this.loadSuggestions();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadSuggestions() {
    try {
      if (fs.existsSync(SUGGESTIONS_FILE)) {
        this.suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[SuggestionService] Fehler beim Laden der Vorschläge:", e);
    }
  }

  private saveSuggestions() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(SUGGESTIONS_FILE, this.suggestions);
    } catch (e) {
      console.error("[SuggestionService] Fehler beim Speichern der Vorschläge:", e);
    }
  }

  public getNextId(guildId: string): number {
    const list = this.suggestions.filter((s) => s.guildId === guildId);
    if (list.length === 0) return 1;
    return Math.max(...list.map((s) => s.id)) + 1;
  }

  public createEmbed(suggestion: Suggestion): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const statusColor =
      suggestion.status === "ACCEPTED"
        ? 0x57f287
        : suggestion.status === "DENIED"
        ? 0xed4245
        : 0xfee75c;

    const statusText =
      suggestion.status === "ACCEPTED"
        ? "🟢 Angenommen"
        : suggestion.status === "DENIED"
        ? "🔴 Abgelehnt"
        : "🟡 Abstimmung läuft";

    const embed = new EmbedBuilder()
      .setColor(statusColor)
      .setAuthor({
        name: `Vorschlag von ${suggestion.authorTag}`,
        iconURL: suggestion.authorAvatar || undefined,
      })
      .setTitle(`💡 Vorschlag #${suggestion.id}`)
      .setDescription(suggestion.content)
      .addFields(
        { name: "Status", value: statusText, inline: true },
        { name: "Ergebnis", value: `👍 **${suggestion.upvotes.length}** | 👎 **${suggestion.downvotes.length}**`, inline: true }
      )
      .setFooter({ text: `Vorschlags-ID: #${suggestion.id}` })
      .setTimestamp(new Date(suggestion.createdAt));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_sugg_up_${suggestion.id}`)
        .setLabel(`Dafür (${suggestion.upvotes.length})`)
        .setEmoji("👍")
        .setStyle(ButtonStyle.Success)
        .setDisabled(suggestion.status !== "PENDING"),
      new ButtonBuilder()
        .setCustomId(`btn_sugg_down_${suggestion.id}`)
        .setLabel(`Dagegen (${suggestion.downvotes.length})`)
        .setEmoji("👎")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(suggestion.status !== "PENDING")
    );

    return { embeds: [embed], components: [row] };
  }

  public async postSuggestion(channel: TextChannel, author: User, content: string): Promise<Suggestion> {
    const id = this.getNextId(channel.guild.id);
    const item: Suggestion = {
      id,
      guildId: channel.guild.id,
      messageId: "",
      channelId: channel.id,
      authorId: author.id,
      authorTag: author.tag || author.username,
      authorAvatar: author.displayAvatarURL(),
      content,
      upvotes: [],
      downvotes: [],
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const rendered = this.createEmbed(item);
    const msg = await channel.send(rendered);
    item.messageId = msg.id;

    this.suggestions.unshift(item);
    this.saveSuggestions();
    return item;
  }

  public async handleVote(interaction: ButtonInteraction, id: number, type: "UP" | "DOWN") {
    const item = this.suggestions.find((s) => s.id === id && s.guildId === interaction.guildId);
    if (!item) {
      await interaction.reply({ content: "❌ Vorschlag nicht gefunden.", ephemeral: true });
      return;
    }

    if (item.status !== "PENDING") {
      await interaction.reply({ content: "ℹ️ Diese Abstimmung ist bereits beendet.", ephemeral: true });
      return;
    }

    const userId = interaction.user.id;

    if (type === "UP") {
      item.downvotes = item.downvotes.filter((uid) => uid !== userId);
      if (item.upvotes.includes(userId)) {
        item.upvotes = item.upvotes.filter((uid) => uid !== userId); // Toggle off
      } else {
        item.upvotes.push(userId);
      }
    } else {
      item.upvotes = item.upvotes.filter((uid) => uid !== userId);
      if (item.downvotes.includes(userId)) {
        item.downvotes = item.downvotes.filter((uid) => uid !== userId); // Toggle off
      } else {
        item.downvotes.push(userId);
      }
    }

    this.saveSuggestions();

    const rendered = this.createEmbed(item);
    await interaction.update({ embeds: rendered.embeds, components: rendered.components });
  }

  public async setStatus(guildId: string, id: number, status: "ACCEPTED" | "DENIED", channel: TextChannel) {
    const item = this.suggestions.find((s) => s.id === id && s.guildId === guildId);
    if (!item) return false;

    item.status = status;
    this.saveSuggestions();

    try {
      const msg = await channel.messages.fetch(item.messageId).catch(() => null);
      if (msg) {
        const rendered = this.createEmbed(item);
        await msg.edit({ embeds: rendered.embeds, components: rendered.components });
      }
    } catch {}

    return true;
  }
}

export const suggestionService = new SuggestionService();
