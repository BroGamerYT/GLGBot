import fs from "fs";
import path from "path";
import { Guild, User, Client, ChannelType, GuildMember } from "discord.js";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { moduleService } from "./moduleService";
import { economyService } from "./economyService";

export interface TalkPartnerEntry {
  tag: string;
  minutes: number;
}

export interface UserStats {
  userId: string;
  guildId: string;
  tag: string;
  avatar?: string;
  xp: number;
  level: number;
  messagesCount: number;
  voiceMinutes: number;
  joinedAt?: string;
  lastMessageTimestamp?: number;
  talkPartners: Record<string, TalkPartnerEntry>;
}

export interface GuildStatsConfig {
  // Leveling Grenzen & Kurve
  maxLevel: number; // Standard: 25 ("es geht bis 25 level")
  baseXp: number; // Standard: 350
  exponent: number; // Standard: 1.65 (sorgt für progressiv steilere Anforderungen)

  // Text-Chat Belohnungen
  messageXpMin: number; // Standard: 15
  messageXpMax: number; // Standard: 25
  messageCooldownSeconds: number; // Standard: 60

  // Sprachkanal (Voice) Belohnungen
  voiceXpPerMinute: number; // Standard: 5

  // Strafen / Abzüge ("jedes negative effekt macht minus level")
  warnPenaltyXp: number; // Standard: 250
  timeoutPenaltyXp: number; // Standard: 500
  prisonPenaltyXp: number; // Standard: 1000
  badNamePenaltyXp: number; // Standard: 400
  blacklistPenaltyXp: number; // Standard: 300
  kickPenaltyXp: number; // Standard: 1500
  banPenaltyXp: number; // Standard: 5000

  // Benachrichtigungen
  levelUpChannelId?: string; // leer = im aktuellen Kanal oder stumm
  levelUpNotifications: boolean;
  levelUpMessage?: string;

  // Level-Rollen-Belohnungen (Automatische Meilensteine: Level -> Rollen-ID)
  roleRewards?: Record<number, string>;
}

export const DEFAULT_STATS_CONFIG: GuildStatsConfig = {
  maxLevel: 25,
  baseXp: 350,
  exponent: 1.65,

  messageXpMin: 15,
  messageXpMax: 25,
  messageCooldownSeconds: 60,

  voiceXpPerMinute: 5,

  warnPenaltyXp: 250,
  timeoutPenaltyXp: 500,
  prisonPenaltyXp: 1000,
  badNamePenaltyXp: 400,
  blacklistPenaltyXp: 300,
  kickPenaltyXp: 1500,
  banPenaltyXp: 5000,

  levelUpNotifications: true,
  roleRewards: {},
};

export interface LevelProgress {
  level: number;
  currentXp: number;
  requiredXp: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const STATS_FILE = path.join(DATA_DIR, "user_stats.json");
const CONFIG_FILE = path.join(DATA_DIR, "stats_config.json");

class StatsService {
  private stats: Record<string, Record<string, UserStats>> = {};
  private config: Record<string, GuildStatsConfig> = {};
  private saveTimeout: NodeJS.Timeout | null = null;
  private trackerInterval: NodeJS.Timeout | null = null;

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
      if (fs.existsSync(STATS_FILE)) {
        this.stats = readJsonFile(STATS_FILE, this.stats);
      }
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = readJsonFile(CONFIG_FILE, this.config);
      }
    } catch (e) {
      console.error("[StatsService] Fehler beim Laden der Statistikdaten:", e);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        this.ensureDataDir();
        writeJsonAtomic(STATS_FILE, this.stats);
        writeJsonAtomic(CONFIG_FILE, this.config);
      } catch (e) {
        console.error("[StatsService] Fehler beim Speichern der Statistiken:", e);
      }
    }, 2000);
  }

  public getConfig(guildId: string): GuildStatsConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = { ...DEFAULT_STATS_CONFIG };
    } else {
      // Fehlende Felder mit Defaults ergänzen
      this.config[guildId] = { ...DEFAULT_STATS_CONFIG, ...this.config[guildId] };
    }
    return this.config[guildId];
  }

  public setConfig(guildId: string, patch: Partial<GuildStatsConfig>): GuildStatsConfig {
    this.config[guildId] = { ...this.getConfig(guildId), ...patch };
    this.scheduleSave();
    return this.config[guildId];
  }

  // XP benötigt für ein Level (steigende Kurve bis Level 25)
  public getXpForLevel(level: number, cfg?: GuildStatsConfig): number {
    const baseXp = cfg?.baseXp ?? DEFAULT_STATS_CONFIG.baseXp;
    const exponent = cfg?.exponent ?? DEFAULT_STATS_CONFIG.exponent;
    return Math.floor(baseXp * Math.pow(level, exponent)) + 100;
  }

  // Level aus Gesamt-XP berechnen (maximal bis maxLevel, z. B. 25)
  public calculateLevelProgress(totalXp: number, cfg?: GuildStatsConfig): LevelProgress {
    const maxLevel = cfg?.maxLevel ?? DEFAULT_STATS_CONFIG.maxLevel;
    let level = 1;
    let xpRemaining = totalXp;

    while (level < maxLevel) {
      const needed = this.getXpForLevel(level, cfg);
      if (xpRemaining >= needed) {
        xpRemaining -= needed;
        level++;
      } else {
        break;
      }
    }

    const isMax = level >= maxLevel;
    const requiredXp = this.getXpForLevel(level, cfg);
    const progressPercent = isMax ? 100 : Math.min(100, Math.floor((xpRemaining / requiredXp) * 100));

    return {
      level,
      currentXp: isMax ? requiredXp : xpRemaining,
      requiredXp,
      progressPercent,
      isMaxLevel: isMax,
    };
  }

  public getOrCreateUser(guild: Guild, user: User): UserStats {
    if (!this.stats[guild.id]) {
      this.stats[guild.id] = {};
    }

    if (!this.stats[guild.id][user.id]) {
      const member = guild.members.cache.get(user.id);
      this.stats[guild.id][user.id] = {
        userId: user.id,
        guildId: guild.id,
        tag: user.tag || user.username,
        avatar: user.displayAvatarURL(),
        xp: 0,
        level: 1,
        messagesCount: 0,
        voiceMinutes: 0,
        joinedAt: member?.joinedAt?.toISOString() || new Date().toISOString(),
        talkPartners: {},
      };
    } else {
      // Aktualisiere Tag & Avatar
      this.stats[guild.id][user.id].tag = user.tag || user.username;
      this.stats[guild.id][user.id].avatar = user.displayAvatarURL();
    }

    return this.stats[guild.id][user.id];
  }

  // Text-Chat XP hinzufügen (dynamisch nach Config)
  public addMessageXp(guild: Guild, user: User): { leveledUp: boolean; oldLevel: number; newLevel: number; totalXp: number } | null {
    if (user.bot) return null;

    const cfg = this.getConfig(guild.id);
    const stats = this.getOrCreateUser(guild, user);
    const now = Date.now();

    // Cooldown aus Konfiguration
    const cooldownMs = (cfg.messageCooldownSeconds ?? 60) * 1000;
    const canEarnXp = !stats.lastMessageTimestamp || now - stats.lastMessageTimestamp >= cooldownMs;
    stats.messagesCount += 1;

    let leveledUp = false;
    const oldLevel = stats.level;

    if (canEarnXp) {
      stats.lastMessageTimestamp = now;
      const minXp = cfg.messageXpMin ?? 15;
      const maxXp = Math.max(minXp, cfg.messageXpMax ?? 25);
      const earnedXp = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
      stats.xp += earnedXp;

      const progress = this.calculateLevelProgress(stats.xp, cfg);
      if (progress.level > oldLevel) {
        leveledUp = true;
        stats.level = progress.level;
      }
    }

    this.scheduleSave();
    return {
      leveledUp,
      oldLevel,
      newLevel: stats.level,
      totalXp: stats.xp,
    };
  }

  // Belohnungs-XP hinzufügen (z. B. durch /daily, Events oder Quests)
  public async addCustomXp(
    guild: Guild,
    user: User,
    amount: number,
    reason?: string
  ): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; totalXp: number; addedRoles: string[] } | null> {
    if (user.bot || amount <= 0) return null;

    const cfg = this.getConfig(guild.id);
    const stats = this.getOrCreateUser(guild, user);
    const oldLevel = stats.level;
    stats.xp += amount;

    const progress = this.calculateLevelProgress(stats.xp, cfg);
    let leveledUp = false;
    let addedRoles: string[] = [];

    if (progress.level > oldLevel) {
      leveledUp = true;
      stats.level = progress.level;
      const syncRes = await this.syncUserRoleRewards(guild, user.id, progress.level);
      addedRoles = syncRes.added;
    }

    this.scheduleSave();
    return {
      leveledUp,
      oldLevel,
      newLevel: stats.level,
      totalXp: stats.xp,
      addedRoles,
    };
  }

  // Synchronisiert die Level-Rollen-Belohnungen eines Mitglieds
  public async syncUserRoleRewards(
    guild: Guild,
    memberOrUserId: GuildMember | string,
    currentLevel?: number
  ): Promise<{ added: string[]; roles: string[] }> {
    const cfg = this.getConfig(guild.id);
    const rewards = cfg.roleRewards || {};
    const rewardLevels = Object.keys(rewards)
      .map(Number)
      .filter((l) => !isNaN(l) && l > 0)
      .sort((a, b) => a - b);
    if (rewardLevels.length === 0) return { added: [], roles: [] };

    let member: GuildMember | null = null;
    if (typeof memberOrUserId === "string") {
      member = guild.members.cache.get(memberOrUserId) || (await guild.members.fetch(memberOrUserId).catch(() => null));
    } else {
      member = memberOrUserId;
    }
    if (!member) return { added: [], roles: [] };

    let lvl = currentLevel;
    if (lvl === undefined) {
      const profile = this.getUserProfile(guild.id, member.id);
      lvl = profile?.progress.level ?? 1;
    }

    const eligibleRoles = new Set<string>();
    for (const l of rewardLevels) {
      if (l <= lvl) {
        const roleId = rewards[l];
        if (roleId && guild.roles.cache.has(roleId)) {
          eligibleRoles.add(roleId);
        }
      }
    }

    const added: string[] = [];
    for (const roleId of eligibleRoles) {
      if (!member.roles.cache.has(roleId)) {
        try {
          await member.roles.add(roleId, `Level-Rollen-Belohnung (Level ${lvl})`);
          added.push(roleId);
        } catch (e) {
          console.error(`[StatsService] Konnte Belohnungs-Rolle ${roleId} an ${member.user.tag} nicht vergeben:`, e);
        }
      }
    }

    return { added, roles: Array.from(eligibleRoles) };
  }

  // Zieht XP ab (bei Verwarnung, Timeout, Gefängnis, Blacklist, schlechtem Namen)
  // Berechnet automatisch das neue Level (Minus-Level möglich!)
  public deductXp(
    guildId: string,
    userId: string,
    amount: number
  ): { oldLevel: number; newLevel: number; oldXp: number; newXp: number; lostLevels: number; deducted: number } | null {
    if (!this.stats[guildId] || !this.stats[guildId][userId]) {
      return null;
    }
    const cfg = this.getConfig(guildId);
    const user = this.stats[guildId][userId];
    const oldXp = user.xp;
    const oldLevel = user.level;

    user.xp = Math.max(0, user.xp - amount);
    const progress = this.calculateLevelProgress(user.xp, cfg);
    user.level = progress.level;

    this.scheduleSave();
    return {
      oldLevel,
      newLevel: user.level,
      oldXp,
      newXp: user.xp,
      lostLevels: Math.max(0, oldLevel - user.level),
      deducted: oldXp - user.xp,
    };
  }

  // Startet den minütlichen Voice- & Talk-Partner Tracker
  public startVoiceTracker(client: Client) {
    if (this.trackerInterval) return;

    this.trackerInterval = setInterval(() => {
      for (const guild of client.guilds.cache.values()) {
        const levelsEnabled = moduleService.isEnabled(guild.id, "levels");
        const economyEnabled = moduleService.isEnabled(guild.id, "economy");
        if (!levelsEnabled && !economyEnabled) continue; // Beide Module ausgeschaltet
        const afkChannelId = guild.afkChannelId;
        const cfg = this.getConfig(guild.id);

        // Finde alle aktiven Sprachkanäle
        const voiceChannels = guild.channels.cache.filter(
          (c) =>
            c.type === ChannelType.GuildVoice &&
            c.id !== afkChannelId &&
            "members" in c &&
            (c as any).members.size > 0
        );

        for (const channel of voiceChannels.values()) {
          const members = Array.from((channel as any).members.values()).filter(
            (m: any) => !m.user.bot && !m.voice.deaf
          ) as any[];

          if (members.length === 0) continue;

          // 1. Jedem aktiven Mitglied 1 Minute Voice + konfigurierte Voice-XP / Coins geben
          const voiceXp = cfg.voiceXpPerMinute ?? 5;
          for (const member of members) {
            if (levelsEnabled) {
              const stats = this.getOrCreateUser(guild, member.user);
              stats.voiceMinutes += 1;
              stats.xp += voiceXp;

              const progress = this.calculateLevelProgress(stats.xp, cfg);
              if (progress.level > stats.level) {
                stats.level = progress.level;
                this.syncUserRoleRewards(guild, member, progress.level).catch(() => null);
              }
            }

            if (economyEnabled) {
              economyService.addVoiceCoins(guild, member.user);
            }
          }

          // 2. Talk-Partner Tracking: Wenn mindestens 2 Mitglieder im Channel sind
          if (members.length >= 2) {
            for (let i = 0; i < members.length; i++) {
              for (let j = i + 1; j < members.length; j++) {
                const userA = members[i].user;
                const userB = members[j].user;

                const statsA = this.getOrCreateUser(guild, userA);
                const statsB = this.getOrCreateUser(guild, userB);

                if (!statsA.talkPartners[userB.id]) {
                  statsA.talkPartners[userB.id] = { tag: userB.tag || userB.username, minutes: 0 };
                }
                statsA.talkPartners[userB.id].minutes += 1;
                statsA.talkPartners[userB.id].tag = userB.tag || userB.username;

                if (!statsB.talkPartners[userA.id]) {
                  statsB.talkPartners[userA.id] = { tag: userA.tag || userA.username, minutes: 0 };
                }
                statsB.talkPartners[userA.id].minutes += 1;
                statsB.talkPartners[userA.id].tag = userA.tag || userA.username;
              }
            }
          }
        }
      }

      this.scheduleSave();
    }, 60000); // alle 60 Sekunden

    console.log("⏱️ [StatsService] Voice- & Talk-Partner Tracker gestartet (Intervall: 60s).");
  }

  // Holt Nutzer-Statistiken inklusive Ranglisten-Position
  public getUserProfile(guildId: string, userId: string): { stats: UserStats; rank: number; progress: LevelProgress } | null {
    const guildStats = this.stats[guildId] || {};
    const user = guildStats[userId];
    if (!user) return null;

    const cfg = this.getConfig(guildId);
    const all = Object.values(guildStats).sort((a, b) => b.xp - a.xp);
    const rank = all.findIndex((u) => u.userId === userId) + 1;
    const progress = this.calculateLevelProgress(user.xp, cfg);
    user.level = progress.level;

    return {
      stats: user,
      rank,
      progress,
    };
  }

  // Top 10 nach Level / XP
  public getTopLevels(guildId: string, limit = 10): (UserStats & { rank: number })[] {
    const guildStats = this.stats[guildId] || {};
    const cfg = this.getConfig(guildId);
    return Object.values(guildStats)
      .map((u) => {
        const prog = this.calculateLevelProgress(u.xp, cfg);
        u.level = prog.level;
        return u;
      })
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((u, idx) => ({ ...u, rank: idx + 1 }));
  }

  // Top 10 nach Voice-Zeit
  public getTopVoice(guildId: string, limit = 10): (UserStats & { rank: number })[] {
    const guildStats = this.stats[guildId] || {};
    return Object.values(guildStats)
      .sort((a, b) => b.voiceMinutes - a.voiceMinutes)
      .slice(0, limit)
      .map((u, idx) => ({ ...u, rank: idx + 1 }));
  }

  // Holt die Top Talk-Partner eines Nutzers
  public getTopTalkPartners(guildId: string, userId: string, limit = 10): { partnerId: string; tag: string; minutes: number }[] {
    const guildStats = this.stats[guildId] || {};
    const user = guildStats[userId];
    if (!user || !user.talkPartners) return [];

    return Object.entries(user.talkPartners)
      .map(([partnerId, data]) => ({
        partnerId,
        tag: data.tag,
        minutes: data.minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, limit);
  }

  // Serverweite Top Talk-Duos ("Wer labert am längsten miteinander")
  public getTopDuos(guildId: string, limit = 10): { user1: string; tag1: string; user2: string; tag2: string; minutes: number }[] {
    const guildStats = this.stats[guildId] || {};
    const duoMap = new Map<string, { user1: string; tag1: string; user2: string; tag2: string; minutes: number }>();

    for (const user of Object.values(guildStats)) {
      if (!user.talkPartners) continue;
      for (const [partnerId, data] of Object.entries(user.talkPartners)) {
        const pairKey = [user.userId, partnerId].sort().join("-");
        if (!duoMap.has(pairKey)) {
          duoMap.set(pairKey, {
            user1: user.userId,
            tag1: user.tag,
            user2: partnerId,
            tag2: data.tag,
            minutes: data.minutes,
          });
        }
      }
    }

    return Array.from(duoMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, limit);
  }

  // Formatierung von Minuten in lesbare Strings (z. B. "4 Std. 15 Min.")
  public formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours < 24) return `${hours} Std. ${rest} Min.`;
    const days = Math.floor(hours / 24);
    const restHours = hours % 24;
    return `${days} T. ${restHours} Std.`;
  }
}

export const statsService = new StatsService();
