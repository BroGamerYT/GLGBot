import { Message } from "discord.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(__dirname, "../../data");
const MUSIC_DIR = path.join(DATA_DIR, "music");

const ALLOWED_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a"]);
const MAX_BYTES = 25 * 1024 * 1024;
const CODE_TTL_MS = 10 * 60 * 1000;

interface UploadCode {
  code: string;
  guildId: string;
  userId: string;
  expiresAt: number;
}

function sanitize(name: string): string | null {
  const base = path.basename(name.trim());
  if (!base || base.startsWith(".") || base.includes("..")) return null;
  const clean = base.replace(/[^a-zA-Z0-9._\- äöüÄÖÜß]/g, "_").slice(0, 100);
  if (!ALLOWED_EXT.has(path.extname(clean).toLowerCase())) return null;
  return clean;
}

class MusicUploadService {
  private codes = new Map<string, UploadCode>();

  /** Erstellt einen einmaligen 10-Minuten-Code für den Upload. */
  createCode(guildId: string, userId: string): string {
    const code = `MUS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    this.codes.set(code, { code, guildId, userId, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  /** Prüft Code und verbraucht ihn (einmalig). Gibt guildId zurück oder null. */
  claimCode(rawCode: string, userId: string): string | null {
    const code = rawCode.trim().toUpperCase();
    const entry = this.codes.get(code);
    if (!entry || entry.userId !== userId) return null;
    this.codes.delete(code);
    if (entry.expiresAt < Date.now()) return null;
    return entry.guildId;
  }

  /** Lädt einen Anhang herunter und speichert ihn. Gibt Dateinamen zurück. */
  async saveAttachment(att: { name?: string | null; url: string; size?: number | null }): Promise<string> {
    const clean = sanitize(att.name || "");
    if (!clean) throw new Error(`„${att.name || "?"}“: Nur MP3/WAV/OGG/M4A erlaubt.`);
    if ((att.size || 0) > MAX_BYTES) throw new Error(`„${clean}“ ist größer als 25 MB.`);
    const res = await fetch(att.url);
    if (!res.ok) throw new Error(`Download fehlgeschlagen (HTTP ${res.status}).`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) throw new Error(`„${clean}“: ungültige Größe.`);
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
    const target = path.join(MUSIC_DIR, clean);
    if (fs.existsSync(target)) throw new Error(`„${clean}“ existiert bereits (Duplikat).`);
    fs.writeFileSync(target, buf);
    return clean;
  }

  /** Verarbeitet eine DM mit Anhang + Code. Gibt Status zurück oder null (nicht zuständig). */
  async handleDM(message: Message): Promise<string | null> {
    if (message.guild || message.author.bot || message.attachments.size === 0) return null;
    const match = message.content.toUpperCase().match(/MUS-[0-9A-F]{6}/);
    if (!match) return null;
    const guildId = this.claimCode(match[0], message.author.id);
    if (!guildId) {
      await message.reply("❌ Ungültiger, fremder oder abgelaufener Upload-Code. Neuen Code im Dashboard unter `/radio` erzeugen.");
      return "invalid";
    }
    const saved: string[] = [];
    for (const att of message.attachments.values()) {
      try {
        saved.push(await this.saveAttachment({ name: att.name, url: att.proxyURL || att.url, size: att.size }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
        await message.reply(`❌ ${msg}`);
      }
    }
    if (saved.length > 0) {
      await message.reply(
        `✅ Gespeichert: ${saved.map((s) => `**${s}**`).join(", ")}\nAbspielen mit \`/music play local:NAME\` oder \`/soundboard play\`.`,
      );
    }
    return "handled";
  }
}

export const musicUploadService = new MusicUploadService();
