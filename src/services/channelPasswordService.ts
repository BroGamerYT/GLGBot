import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";

const DATA_DIR = path.join(__dirname, "../../data");
const PASSWORDS_FILE = path.join(DATA_DIR, "channel_passwords.json");

class ChannelPasswordService {
  private passwords: Map<string, string> = new Map();

  constructor() {
    this.ensureDataDir();
    this.loadPasswords();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadPasswords() {
    try {
      if (fs.existsSync(PASSWORDS_FILE)) {
        const raw = fs.readFileSync(PASSWORDS_FILE, "utf-8");
        const data: Record<string, string> = JSON.parse(raw);
        for (const [channelId, pw] of Object.entries(data)) {
          this.passwords.set(channelId, String(pw));
        }
      }
    } catch (err) {
      console.error("[ChannelPasswordService] Fehler beim Laden der Passwörter:", err);
      this.passwords = new Map();
    }
  }

  private savePasswords() {
    try {
      this.ensureDataDir();
      const obj: Record<string, string> = {};
      for (const [channelId, pw] of this.passwords.entries()) {
        obj[channelId] = pw;
      }
      writeJsonAtomic(PASSWORDS_FILE, obj);
    } catch (err) {
      console.error("[ChannelPasswordService] Fehler beim Speichern der Passwörter:", err);
    }
  }

  public setPassword(channelId: string, password: string): void {
    const trimmed = password.trim();
    if (!trimmed) {
      this.removePassword(channelId);
      return;
    }
    this.passwords.set(channelId, trimmed);
    this.savePasswords();
  }

  public removePassword(channelId: string): boolean {
    const deleted = this.passwords.delete(channelId);
    if (deleted) {
      this.savePasswords();
    }
    return deleted;
  }

  public getPassword(channelId: string): string | undefined {
    return this.passwords.get(channelId);
  }

  public hasPassword(channelId: string): boolean {
    return this.passwords.has(channelId);
  }

  public verifyPassword(channelId: string, input: string): boolean {
    const actual = this.passwords.get(channelId);
    if (!actual) return false;
    return actual.trim().toLowerCase() === input.trim().toLowerCase();
  }

  public cleanChannel(channelId: string): void {
    if (this.passwords.has(channelId)) {
      this.passwords.delete(channelId);
      this.savePasswords();
    }
  }
}

export const channelPasswordService = new ChannelPasswordService();
