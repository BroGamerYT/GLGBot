import fs from "fs";
import path from "path";
import { Message, TextChannel, EmbedBuilder } from "discord.js";

interface StickyItem {
  channelId: string;
  guildId: string;
  content: string;
  lastMessageId?: string;
}

interface StickyStorage {
  [channelId: string]: StickyItem;
}

const DATA_DIR = path.join(__dirname, "../../data");
const STICKY_FILE = path.join(DATA_DIR, "sticky_messages.json");

class StickyService {
  private stickyMessages: StickyStorage = {};

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(STICKY_FILE)) {
        this.stickyMessages = JSON.parse(fs.readFileSync(STICKY_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[StickyService] Fehler beim Laden der Sticky Messages:", e);
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(STICKY_FILE, JSON.stringify(this.stickyMessages, null, 2), "utf-8");
    } catch (e) {
      console.error("[StickyService] Fehler beim Speichern der Sticky Messages:", e);
    }
  }

  public setSticky(channelId: string, guildId: string, content: string): StickyItem {
    this.stickyMessages[channelId] = {
      channelId,
      guildId,
      content,
    };
    this.saveData();
    return this.stickyMessages[channelId];
  }

  public removeSticky(channelId: string): boolean {
    if (!this.stickyMessages[channelId]) return false;
    delete this.stickyMessages[channelId];
    this.saveData();
    return true;
  }

  public getSticky(channelId: string): StickyItem | undefined {
    return this.stickyMessages[channelId];
  }

  public async handleMessage(message: Message) {
    if (message.author.bot || !message.guild) return;

    const sticky = this.stickyMessages[message.channelId];
    if (!sticky) return;

    try {
      const channel = message.channel as TextChannel;

      // Vorherige angeheftete Nachricht löschen falls vorhanden
      if (sticky.lastMessageId) {
        const oldMsg = await channel.messages.fetch(sticky.lastMessageId).catch(() => null);
        if (oldMsg) {
          await oldMsg.delete().catch(() => {});
        }
      }

      // Neu unten im Chat anheften
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📌 Angepinnter Hinweis")
        .setDescription(sticky.content)
        .setFooter({ text: "Bleibt immer als aktuellste Nachricht im Kanal fixiert." });

      const newMsg = await channel.send({ embeds: [embed] });
      sticky.lastMessageId = newMsg.id;
      this.saveData();
    } catch (err) {
      console.error("[StickyService] Fehler beim Aktualisieren der Sticky Message:", err);
    }
  }
}

export const stickyService = new StickyService();
