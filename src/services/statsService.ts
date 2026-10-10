import fs from "fs";
import path from "path";
import { Guild, User, Client, ChannelType } from "discord.js";

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
  levelUpChannelId?: string; // empty = post in current channel or silent
  levelUpNotifications: boolean;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  requiredXp: number;
  progressPercent: number;
}

const DATA_DIR = path.join(__dirname, "../../data");
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
        this.stats = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
      }
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
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
        fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2), "utf-8");
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
      } catch (e) {
        console.error("[StatsService] Fehler beim Speichern der Statistiken:", e);
      }
    }, 2000);
  }

  public getConfig(guildId: string): GuildStatsConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {
        levelUpNotifications: true,
      };
    }
    return this.config[guildId];
  }

  public setConfig(guildId: string, patch: Partial<GuildStatsConfig>): GuildStatsConfig {
    this.config[guildId] = { ...this.getConfig(guildId), ...patch };
    this.scheduleSave();
    return this.config[guildId];
  }

  // XP benötigt für ein Level
  public getXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.4)) + 50;
  }

  // Level aus Gesamt-XP berechnen
  public calculateLevelProgress(totalXp: number): LevelProgress {
    let level = 1;
    let xpRemaining = totalXp;

    while (true) {
      const needed = this.getXpForLevel(level);
      if (xpRemaining >= needed) {
        xpRemaining -= needed;
        level++;
      } else {
        break;
      }
    }

    const requiredXp = this.getXpForLevel(level);
    const progressPercent = Math.min(100, Math.floor((xpRemaining / requiredXp) * 100));

    return {
      level,
      currentXp: xpRemaining,
      requiredXp,
      progressPercent,
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

  // Text-Chat XP hinzufügen (1x alle 60 Sek.)
  public addMessageXp(guild: Guild, user: User): { leveledUp: boolean; oldLevel: number; newLevel: number; totalXp: number } | null {
    if (user.bot) return null;

    const stats = this.getOrCreateUser(guild, user);
    const now = Date.now();

    // Cooldown: 60 Sekunden für XP-Gewinn
    const canEarnXp = !stats.lastMessageTimestamp || now - stats.lastMessageTimestamp >= 60000;
    stats.messagesCount += 1;

    let leveledUp = false;
    const oldLevel = stats.level;

    if (canEarnXp) {
      stats.lastMessageTimestamp = now;
      const earnedXp = Math.floor(Math.random() * 11) + 15; // 15-25 XP
      stats.xp += earnedXp;

      const progress = this.calculateLevelProgress(stats.xp);
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

  // Startet den minütlichen Voice- & Talk-Partner Tracker
  public startVoiceTracker(client: Client) {
    if (this.trackerInterval) return;

    this.trackerInterval = setInterval(() => {
      for (const guild of client.guilds.cache.values()) {
        const afkChannelId = guild.afkChannelId;

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

          // 1. Jedem aktiven Mitglied 1 Minute Voice + 10 XP geben
          for (const member of members) {
            const stats = this.getOrCreateUser(guild, member.user);
            stats.voiceMinutes += 1;
            stats.xp += 10;

            const progress = this.calculateLevelProgress(stats.xp);
            if (progress.level > stats.level) {
              stats.level = progress.level;
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

    const all = Object.values(guildStats).sort((a, b) => b.xp - a.xp);
    const rank = all.findIndex((u) => u.userId === userId) + 1;
    const progress = this.calculateLevelProgress(user.xp);

    return {
      stats: user,
      rank,
      progress,
    };
  }

  // Top 10 nach Level / XP
  public getTopLevels(guildId: string, limit = 10): (UserStats & { rank: number })[] {
    const guildStats = this.stats[guildId] || {};
    return Object.values(guildStats)
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
