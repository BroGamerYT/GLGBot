import fs from "fs";
import path from "path";
import { Guild, GuildMember, Message, Client, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { auditLogService } from "./auditLogService";

interface ActionRecord {
  userId: string;
  timestamp: number;
}

interface SecurityConfig {
  antiNuke: {
    enabled: boolean;
    maxChannelDeletesPerMin: number;
    maxRoleDeletesPerMin: number;
    maxBansPerMin: number;
  };
  antiPhishing: {
    enabled: boolean;
    autoTimeoutHours: number;
  };
  antiRaid: {
    enabled: boolean;
    maxJoinsIn10s: number;
  };
  whitelistedUserIds: string[];
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "security_config.json");

// Phishing & Scam Domain Muster
const PHISHING_PATTERNS = [
  /discorcl[a-z0-9-]*\.(gift|com|org|net|ru|xyz|click|site)/i,
  /dlscord[a-z0-9-]*\.(gift|com|org|net|ru|xyz|click|site)/i,
  /discord-[a-z0-9-]*\.(gift|xyz|click|top|site|link|info)/i,
  /discordapp\.(click|gift|xyz|top|link)/i,
  /discordgift\.[a-z]{2,}/i,
  /free-nitro[a-z0-9-]*\.[a-z]{2,}/i,
  /nitro-[a-z0-9-]*\.(gift|xyz|click|top|ru)/i,
  /steamcommun[a-z0-9-]*\.(com|ru|org|xyz|site)/i,
  /steam-gift[a-z0-9-]*\.[a-z]{2,}/i,
  /steam-trade[a-z0-9-]*\.[a-z]{2,}/i,
  /trade-steam[a-z0-9-]*\.[a-z]{2,}/i,
];

class SecurityService {
  private config: SecurityConfig = {
    antiNuke: {
      enabled: true,
      maxChannelDeletesPerMin: 3,
      maxRoleDeletesPerMin: 3,
      maxBansPerMin: 4,
    },
    antiPhishing: {
      enabled: true,
      autoTimeoutHours: 1,
    },
    antiRaid: {
      enabled: true,
      maxJoinsIn10s: 6,
    },
    whitelistedUserIds: [],
  };

  private channelDeletes: ActionRecord[] = [];
  private roleDeletes: ActionRecord[] = [];
  private bans: ActionRecord[] = [];
  private recentJoins: number[] = [];

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = { ...this.config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) };
      }
    } catch (e) {
      console.error("[SecurityService] Fehler beim Laden der Security-Config:", e);
    }
  }

  public getConfig(): SecurityConfig {
    return this.config;
  }

  public updateConfig(patch: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...patch };
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (e) {
      console.error("[SecurityService] Fehler beim Speichern der Security-Config:", e);
    }
  }

  public isWhitelisted(guild: Guild, userId: string): boolean {
    if (userId === guild.ownerId) return true;
    if (userId === guild.client.user.id) return true;
    return this.config.whitelistedUserIds.includes(userId);
  }

  // --- ANTI-NUKE PRÜFUNG ---
  public async trackAndCheckNuke(
    guild: Guild,
    userId: string,
    action: "CHANNEL_DELETE" | "ROLE_DELETE" | "BAN",
    client: Client
  ): Promise<boolean> {
    if (!this.config.antiNuke.enabled) return false;
    if (this.isWhitelisted(guild, userId)) return false;

    const now = Date.now();
    const oneMinAgo = now - 60000;

    let targetArray: ActionRecord[];
    let threshold: number;

    if (action === "CHANNEL_DELETE") {
      this.channelDeletes.push({ userId, timestamp: now });
      this.channelDeletes = this.channelDeletes.filter((r) => r.timestamp > oneMinAgo);
      targetArray = this.channelDeletes.filter((r) => r.userId === userId);
      threshold = this.config.antiNuke.maxChannelDeletesPerMin;
    } else if (action === "ROLE_DELETE") {
      this.roleDeletes.push({ userId, timestamp: now });
      this.roleDeletes = this.roleDeletes.filter((r) => r.timestamp > oneMinAgo);
      targetArray = this.roleDeletes.filter((r) => r.userId === userId);
      threshold = this.config.antiNuke.maxRoleDeletesPerMin;
    } else {
      this.bans.push({ userId, timestamp: now });
      this.bans = this.bans.filter((r) => r.timestamp > oneMinAgo);
      targetArray = this.bans.filter((r) => r.userId === userId);
      threshold = this.config.antiNuke.maxBansPerMin;
    }

    if (targetArray.length >= threshold) {
      await this.triggerNukeLockdown(guild, userId, action, targetArray.length, client);
      return true;
    }

    return false;
  }

  private async triggerNukeLockdown(
    guild: Guild,
    userId: string,
    action: string,
    count: number,
    client: Client
  ) {
    console.error(`🚨 [ANTI-NUKE] Ratenbegrenzung ausgelöst für User ${userId}! (${action}: ${count}x in 60s)`);

    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      let strippedRoles: string[] = [];

      if (member && member.moderatable) {
        // Rollen mit Admin-/Verwaltungsrechten sofort entziehen
        const dangerousRoles = member.roles.cache.filter(
          (r) =>
            r.id !== guild.id &&
            (r.permissions.has(PermissionFlagsBits.Administrator) ||
              r.permissions.has(PermissionFlagsBits.ManageChannels) ||
              r.permissions.has(PermissionFlagsBits.ManageRoles) ||
              r.permissions.has(PermissionFlagsBits.BanMembers))
        );

        if (dangerousRoles.size > 0) {
          strippedRoles = dangerousRoles.map((r) => r.name);
          await member.roles.remove(dangerousRoles, "Anti-Nuke Notfallsperre: Schutz vor Massen-Löschung");
        }

        // 24 Stunden Timeout als Sofort-Notbremse
        await member.timeout(86400 * 1000, "Anti-Nuke System: Notbremse ausgelöst");
      }

      // Log in Discord & System
      await auditLogService.log(
        {
          guildId: guild.id,
          category: "server",
          action: "ANTI_NUKE_TRIGGERED",
          executor: {
            id: client.user?.id || "bot",
            tag: client.user?.tag || "GLG-Security",
          },
          target: {
            id: userId,
            tag: member?.user.tag || userId,
          },
          details: {
            reason: `Massen-Aktion erkannt: ${count}x ${action} innerhalb von 60 Sekunden`,
            strippedRoles,
            actionTaken: "Admin-Rechte entzogen + 24h Timeout",
          },
        },
        client
      );
    } catch (err) {
      console.error("[SecurityService] Fehler bei Anti-Nuke Abwehrmaßnahme:", err);
    }
  }

  // --- ANTI-PHISHING PRÜFUNG ---
  public checkPhishing(content: string): boolean {
    if (!this.config.antiPhishing.enabled || !content) return false;
    for (const pattern of PHISHING_PATTERNS) {
      if (pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  public async handlePhishingMessage(message: Message, client: Client): Promise<boolean> {
    if (message.author.bot || !message.guild) return false;
    if (this.isWhitelisted(message.guild, message.author.id)) return false;

    if (!this.checkPhishing(message.content)) return false;

    try {
      // 1. Nachricht sofort löschen
      await message.delete().catch(() => {});

      // 2. Nutzer stummschalten (1 Stunde)
      const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
      if (member && member.moderatable) {
        await member.timeout(
          this.config.antiPhishing.autoTimeoutHours * 3600 * 1000,
          "Anti-Phishing: Gefährlicher Scam-/Phishing-Link gepostet"
        );
      }

      // 3. Warnung im Kanal
      const warningEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🛡️ Phishing-Link blockiert")
        .setDescription(
          `Eine Nachricht von <@${message.author.id}> wurde gelöscht, da sie einen verdächtigen Scam- oder Phishing-Link enthielt. Der Nutzer wurde vorübergehend stummgeschaltet.`
        )
        .setTimestamp();

      const warnMsg = await (message.channel as any).send({ embeds: [warningEmbed] }).catch(() => null);
      if (warnMsg) {
        setTimeout(() => warnMsg.delete().catch(() => {}), 15000);
      }

      // 4. Loggen
      await auditLogService.log(
        {
          guildId: message.guild.id,
          category: "message",
          action: "PHISHING_BLOCKED",
          executor: {
            id: message.author.id,
            tag: message.author.tag,
            avatar: message.author.displayAvatarURL(),
          },
          target: {
            id: message.channel.id,
            name: "name" in message.channel ? (message.channel as any).name : "Kanal",
          },
          details: {
            content: message.content.slice(0, 500),
            action: `Nachricht gelöscht + ${this.config.antiPhishing.autoTimeoutHours}h Timeout`,
          },
        },
        client
      );

      return true;
    } catch (err) {
      console.error("[SecurityService] Fehler beim Abfangen von Phishing:", err);
      return false;
    }
  }

  // --- ANTI-RAID PRÜFUNG ---
  public async trackMemberJoin(guild: Guild, member: GuildMember, client: Client) {
    if (!this.config.antiRaid.enabled) return;

    const now = Date.now();
    const tenSecAgo = now - 10000;
    this.recentJoins.push(now);
    this.recentJoins = this.recentJoins.filter((t) => t > tenSecAgo);

    if (this.recentJoins.length >= this.config.antiRaid.maxJoinsIn10s) {
      console.warn(`🚨 [ANTI-RAID] Möglicher Raid erkannt! ${this.recentJoins.length} Joins in 10s.`);

      await auditLogService.log(
        {
          guildId: guild.id,
          category: "server",
          action: "ANTI_RAID_TRIGGERED",
          executor: {
            id: client.user?.id || "bot",
            tag: client.user?.tag || "GLG-Security",
          },
          target: {
            id: guild.id,
            name: guild.name,
          },
          details: {
            joinsCount: this.recentJoins.length,
            timeframe: "10 Sekunden",
            warning: "Ungewöhnlich viele Server-Beitritte registriert.",
          },
        },
        client
      );
    }
  }
}

export const securityService = new SecurityService();
