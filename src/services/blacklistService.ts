import fs from "fs";
import path from "path";
import { Message, Guild, GuildMember, User, Client } from "discord.js";
import { moderationService } from "./moderationService";

export interface BlacklistConfig {
  words: string[];
  autoDelete: boolean;
  autoWarn: boolean;
  xpPenalty: number;
  badNameCheck: boolean;
  badNameXpPenalty: number;
}

interface BlacklistStorage {
  [guildId: string]: BlacklistConfig;
}

const DATA_DIR = path.join(__dirname, "../../data");
const BLACKLIST_FILE = path.join(DATA_DIR, "blacklist.json");

const DEFAULT_WORDS = [
  "hurensohn",
  "arschloch",
  "bastard",
  "spast",
  "fotze",
  "nazi",
  "hitler",
  "huren",
  "wichser",
  "discord.gg/",
  ".gg/",
  "free nitro",
  "steamcommunity-",
  "steam-gift",
  "telegram.me/",
  "t.me/",
];

class BlacklistService {
  private config: BlacklistStorage = {};

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
      if (fs.existsSync(BLACKLIST_FILE)) {
        this.config = JSON.parse(fs.readFileSync(BLACKLIST_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[BlacklistService] Fehler beim Laden der Blacklist:", e);
      this.config = {};
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (e) {
      console.error("[BlacklistService] Fehler beim Speichern der Blacklist:", e);
    }
  }

  public getConfig(guildId: string): BlacklistConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {
        words: [...DEFAULT_WORDS],
        autoDelete: true,
        autoWarn: true,
        xpPenalty: 300,
        badNameCheck: true,
        badNameXpPenalty: 400,
      };
      this.saveData();
    }
    return this.config[guildId];
  }

  public setConfig(guildId: string, patch: Partial<BlacklistConfig>): BlacklistConfig {
    const current = this.getConfig(guildId);
    this.config[guildId] = { ...current, ...patch };
    this.saveData();
    return this.config[guildId];
  }

  public addWord(guildId: string, word: string): boolean {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return false;
    const cfg = this.getConfig(guildId);
    if (!cfg.words.includes(trimmed)) {
      cfg.words.push(trimmed);
      this.saveData();
      return true;
    }
    return false;
  }

  public removeWord(guildId: string, word: string): boolean {
    const trimmed = word.trim().toLowerCase();
    const cfg = this.getConfig(guildId);
    const idx = cfg.words.indexOf(trimmed);
    if (idx !== -1) {
      cfg.words.splice(idx, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Prüft einen Text gegen die Wort-Blacklist
  public checkText(guildId: string, text: string): { matched: boolean; word?: string } {
    const cfg = this.getConfig(guildId);
    const lower = text.toLowerCase();

    for (const w of cfg.words) {
      if (lower.includes(w.toLowerCase())) {
        return { matched: true, word: w };
      }
    }
    return { matched: false };
  }

  // Überprüft Chat-Nachrichten auf Blacklist-Treffer
  public async handleMessage(message: Message, client: Client): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    // Admins ignorieren
    if (message.member?.permissions.has("Administrator")) {
      return false;
    }

    const cfg = this.getConfig(message.guild.id);
    const result = this.checkText(message.guild.id, message.content);

    if (result.matched && result.word) {
      // 1. Nachricht löschen
      if (cfg.autoDelete) {
        await message.delete().catch(() => null);
      }

      // 2. Mod-Case erstellen (zieht automatisch 300 XP ab und berechnet Minus-Level)
      await moderationService.createCase(
        message.guild,
        client.user || message.author,
        message.author,
        "BLACKLIST",
        `Verbotenen Begriff im Chat verwendet: "${result.word}"`,
        { client }
      );

      // 3. Temporäre Warnmeldung im Kanal
      if (cfg.autoWarn && "send" in message.channel) {
        const warnMsg = await (message.channel as any)
          .send({
            content: `🚫 <@${message.author.id}>, deine Nachricht wurde entfernt, da sie einen verbotenen Begriff enthält! **(-${cfg.xpPenalty} XP)**`,
          })
          .catch(() => null);

        if (warnMsg) {
          setTimeout(() => warnMsg.delete().catch(() => null), 6000);
        }
      }

      return true;
    }

    return false;
  }

  // Prüft, ob ein Name (Username oder Nickname) auffällig oder unzulässig ist
  public isBadName(guildId: string, name: string): { isBad: boolean; reason?: string } {
    const lower = name.toLowerCase();
    const cfg = this.getConfig(guildId);

    // 1. Blacklist Wörter
    for (const w of cfg.words) {
      if (lower.includes(w.toLowerCase())) {
        return { isBad: true, reason: `Enthält verbotenen Begriff: "${w}"` };
      }
    }

    // 2. Discord-Invite Links im Namen
    if (lower.includes("discord.gg/") || lower.includes(".gg/")) {
      return { isBad: true, reason: "Server-Werbung (Discord-Invite) im Namen" };
    }

    // 3. Scam / Phishing Keywords
    const scamWords = ["free nitro", "steam gift", "airdrop", "giveaway bot", "moderator bot"];
    for (const sw of scamWords) {
      if (lower.includes(sw)) {
        return { isBad: true, reason: `Verdächtiges Phishing-Muster: "${sw}"` };
      }
    }

    // 4. Hoisting (Namen die mit Sonderzeichen beginnen, um oben in der Mitgliederliste zu stehen)
    if (/^[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?~`\s]/.test(name)) {
      return { isBad: true, reason: "Hoisting-Zeichen am Namensanfang" };
    }

    return { isBad: false };
  }

  // Moderiert einen schlechten Namen (ändert Nickname & zieht XP ab)
  public async moderateBadName(
    guild: Guild,
    member: GuildMember,
    moderator: User,
    client?: Client
  ): Promise<{ ok: boolean; newNick: string; error?: string }> {
    try {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newNick = `Moderierter Name #${randomNum}`;

      await member.setNickname(newNick, "Unzulässiger Name durch Moderation angepasst");

      // ModCase erstellen (zieht automatisch 400 XP ab)
      await moderationService.createCase(
        guild,
        moderator,
        member.user,
        "BAD_NAME",
        `Unzulässiger Name moderiert (Alter Name: "${member.displayName}" -> Neuer Nickname: "${newNick}")`,
        { client }
      );

      return { ok: true, newNick };
    } catch (e: any) {
      console.error("[BlacklistService] Fehler beim Moderieren des Namens:", e);
      return { ok: false, newNick: "", error: e?.message || "Konnte Namen nicht ändern." };
    }
  }
}

export const blacklistService = new BlacklistService();
