import crypto from "crypto";
import { Client, Guild, GuildMember, PermissionFlagsBits, User } from "discord.js";

export interface ActiveAuthCode {
  code: string;
  userId: string;
  username: string;
  globalName: string;
  avatar: string | null;
  guildId: string;
  createdAt: number;
  expiresAt: number;
}

export interface VerifyAuthCodeResult {
  valid: boolean;
  error?: string;
  user?: {
    id: string;
    username: string;
    global_name: string;
    avatar: string | null;
    isAdmin: boolean;
    guilds: string[];
  };
}

/**
 * Zeichenvorrat ohne verwechselbare Zeichen (kein 0/O, kein 1/I/L).
 * 30 Zeichen hoch 6 = rund 729 Millionen Möglichkeiten - Raten ist damit aussichtslos.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

class AuthCodeService {
  private codes = new Map<string, ActiveAuthCode>();
  private readonly CODE_TTL_MS = 30 * 60 * 1000; // 30 Minuten Gültigkeit
  /** Fehlversuche im laufenden Zeitfenster (nur für die Warnung im Log) */
  private failWindow = { count: 0, since: Date.now() };

  constructor() {
    // Alle 5 Minuten abgelaufene Codes bereinigen
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000).unref?.();
  }

  /** Kryptografisch sicherer Code, z. B. GLG-K7P2WD */
  private randomCode(): string {
    for (let attempt = 0; attempt < 10; attempt++) {
      const bytes = crypto.randomBytes(CODE_LENGTH);
      let out = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      }
      const code = `GLG-${out}`;
      if (!this.codes.has(code)) return code;
    }
    // Praktisch unerreichbar - zur Sicherheit mit Zeitstempel eindeutig machen
    return `GLG-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  }

  /**
   * Zählt Fehlversuche und meldet auffälliges Raten im Log (sichtbar im System-Manager).
   * Bewusst keine harte Sperre: sonst könnte jemand durch absichtliche Fehlversuche
   * den Login für alle blockieren. Die eigentliche Bremse sitzt pro IP im Dashboard.
   */
  private noteFailure() {
    const now = Date.now();
    if (now - this.failWindow.since > 10 * 60 * 1000) {
      this.failWindow = { count: 0, since: now };
    }
    this.failWindow.count++;
    if (this.failWindow.count === 20) {
      console.warn(
        `🚨 [Auth] ${this.failWindow.count} fehlgeschlagene Login-Codes in den letzten 10 Minuten - möglicher Rateversuch.`
      );
    }
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [code, entry] of this.codes.entries()) {
      if (entry.expiresAt <= now) {
        this.codes.delete(code);
      }
    }
  }

  /**
   * Erstellt einen neuen 30-Minuten Login-Code für ein Discord-Mitglied.
   */
  public generateCode(
    guild: Guild,
    user: User,
    member: GuildMember
  ): { code: string; expiresAt: number; loginUrl: string } {
    this.cleanupExpired();

    // Vorherige Codes dieses Benutzers ungültig machen
    for (const [existingCode, entry] of this.codes.entries()) {
      if (entry.userId === user.id) {
        this.codes.delete(existingCode);
      }
    }

    const code = this.randomCode();
    const expiresAt = Date.now() + this.CODE_TTL_MS;

    const entry: ActiveAuthCode = {
      code,
      userId: user.id,
      username: user.username,
      globalName: user.displayName || user.username,
      avatar: user.avatar,
      guildId: guild.id,
      createdAt: Date.now(),
      expiresAt,
    };

    this.codes.set(code.toUpperCase(), entry);

    const baseUrl = (process.env.DASHBOARD_URL || "https://glgbot.brogameryt.de").replace(/\/+$/, "");
    const loginUrl = `${baseUrl}/login?code=${code}`;

    return { code, expiresAt, loginUrl };
  }

  /**
   * Prüft einen eingegebenen Code und liefert die Nutzerdaten inklusive Admin-Status.
   */
  public async verifyCode(inputCode: string, client: Client): Promise<VerifyAuthCodeResult> {
    this.cleanupExpired();

    // Eingabe vereinheitlichen: Leerzeichen raus, groß, "GLG-" ergänzen falls weggelassen
    let formatted = inputCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!formatted.startsWith("GLG-")) formatted = `GLG-${formatted.replace(/^GLG/, "")}`;

    const entry = this.codes.get(formatted);
    if (!entry) {
      this.noteFailure();
      return { valid: false, error: "Der eingegebene Code ist ungültig oder abgelaufen." };
    }

    if (entry.expiresAt <= Date.now()) {
      this.codes.delete(formatted);
      this.noteFailure();
      return { valid: false, error: "Dieser Login-Code ist bereits abgelaufen (Gültigkeit: 30 Minuten)." };
    }

    // Code nach erfolgreicher Prüfung verbrauchen (Einmal-Nutzung für Erstellung des 24h Session-Cookies)
    this.codes.delete(formatted);

    // Rechte ermitteln
    let isAdmin = false;
    const adminGuilds: string[] = [];

    const allowedUserIds = (process.env.DASHBOARD_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowedUserIds.includes(entry.userId)) {
      isAdmin = true;
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        if (guild.ownerId === entry.userId) {
          isAdmin = true;
          adminGuilds.push(guild.id);
          continue;
        }

        const member = await guild.members.fetch(entry.userId).catch(() => null);
        if (member) {
          const hasAdminPerm =
            member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageGuild);

          const allowedRoleIds = (process.env.DASHBOARD_ROLE_IDS || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const hasAllowedRole = member.roles.cache.some((r) => allowedRoleIds.includes(r.id));

          if (hasAdminPerm || hasAllowedRole) {
            isAdmin = true;
            adminGuilds.push(guild.id);
          }
        }
      } catch {
        // Fehler bei Guild ignorieren
      }
    }

    return {
      valid: true,
      user: {
        id: entry.userId,
        username: entry.username,
        global_name: entry.globalName,
        avatar: entry.avatar,
        isAdmin,
        guilds: adminGuilds.length > 0 ? adminGuilds : [entry.guildId],
      },
    };
  }
}

export const authCodeService = new AuthCodeService();
