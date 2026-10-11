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

class AuthCodeService {
  private codes = new Map<string, ActiveAuthCode>();
  private readonly CODE_TTL_MS = 30 * 60 * 1000; // 30 Minuten Gültigkeit

  constructor() {
    // Alle 5 Minuten abgelaufene Codes bereinigen
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
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

    // 4-stellige Zufallszahl mit Präfix GLG- (z. B. GLG-4819)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `GLG-${randomDigits}`;
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

    let formatted = inputCode.trim().toUpperCase();
    if (/^\d{4}$/.test(formatted)) {
      formatted = `GLG-${formatted}`;
    }

    const entry = this.codes.get(formatted);
    if (!entry) {
      return { valid: false, error: "Der eingegebene Code ist ungültig oder abgelaufen." };
    }

    if (entry.expiresAt <= Date.now()) {
      this.codes.delete(formatted);
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
