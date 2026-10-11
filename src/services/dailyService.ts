import fs from "fs";
import path from "path";
import { Guild, User } from "discord.js";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { statsService } from "./statsService";

export interface DailyUserData {
  userId: string;
  guildId: string;
  lastClaimTimestamp: number;
  currentStreak: number;
  highestStreak: number;
  totalClaims: number;
  totalXpClaimed: number;
}

export interface DailyClaimResult {
  success: boolean;
  onCooldown?: boolean;
  cooldownRemainingMs?: number;
  currentStreak: number;
  streakBroken?: boolean;
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  nextClaimTimestamp: number;
  leveledUp?: boolean;
  newLevel?: number;
  addedRoles?: string[];
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const DAILY_FILE = path.join(DATA_DIR, "daily_rewards.json");

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const GRACE_WINDOW_MS = 36 * 60 * 60 * 1000; // 36 Stunden (nach 36h bricht die Streak ab)
const BASE_XP = 50;
const BONUS_XP_PER_DAY = 15;
const MAX_BONUS_XP = 150;

class DailyService {
  /** guildId -> Record<userId, DailyUserData> */
  private data: Record<string, Record<string, DailyUserData>> = {};

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
      if (fs.existsSync(DAILY_FILE)) {
        this.data = readJsonFile(DAILY_FILE, this.data);
      }
    } catch (e) {
      console.error("[DailyService] Fehler beim Laden von daily_rewards.json:", e);
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(DAILY_FILE, this.data);
    } catch (e) {
      console.error("[DailyService] Fehler beim Speichern von daily_rewards.json:", e);
    }
  }

  public getUserData(guildId: string, userId: string): DailyUserData | null {
    return this.data[guildId]?.[userId] || null;
  }

  public getStreak(guildId: string, userId: string): number {
    const user = this.getUserData(guildId, userId);
    if (!user) return 0;
    const now = Date.now();
    // Prüfe, ob die Streak verfallen ist (> 36h)
    if (now - user.lastClaimTimestamp > GRACE_WINDOW_MS) {
      return 0;
    }
    return user.currentStreak;
  }

  public async claim(guild: Guild, user: User): Promise<DailyClaimResult> {
    if (!this.data[guild.id]) {
      this.data[guild.id] = {};
    }

    const now = Date.now();
    let userData = this.data[guild.id][user.id];

    if (!userData) {
      userData = {
        userId: user.id,
        guildId: guild.id,
        lastClaimTimestamp: 0,
        currentStreak: 0,
        highestStreak: 0,
        totalClaims: 0,
        totalXpClaimed: 0,
      };
      this.data[guild.id][user.id] = userData;
    }

    // Prüfe Cooldown (24h)
    const timeSinceLastClaim = now - userData.lastClaimTimestamp;
    if (userData.lastClaimTimestamp > 0 && timeSinceLastClaim < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - timeSinceLastClaim;
      return {
        success: false,
        onCooldown: true,
        cooldownRemainingMs: remainingMs,
        currentStreak: userData.currentStreak,
        baseXp: BASE_XP,
        bonusXp: 0,
        totalXp: 0,
        nextClaimTimestamp: userData.lastClaimTimestamp + COOLDOWN_MS,
      };
    }

    let streakBroken = false;
    if (userData.lastClaimTimestamp > 0 && timeSinceLastClaim > GRACE_WINDOW_MS) {
      // Mehr als 36h vergangen -> Streak bricht ab
      streakBroken = true;
      userData.currentStreak = 1;
    } else {
      userData.currentStreak += 1;
    }

    if (userData.currentStreak > userData.highestStreak) {
      userData.highestStreak = userData.currentStreak;
    }

    // XP berechnen
    const streakDays = Math.max(0, userData.currentStreak - 1);
    const bonusXp = Math.min(MAX_BONUS_XP, streakDays * BONUS_XP_PER_DAY);
    const totalXp = BASE_XP + bonusXp;

    userData.lastClaimTimestamp = now;
    userData.totalClaims += 1;
    userData.totalXpClaimed += totalXp;

    this.saveData();

    // XP im StatsService gutschreiben
    const xpResult = await statsService.addCustomXp(guild, user, totalXp, "Tägliche Belohnung");

    return {
      success: true,
      currentStreak: userData.currentStreak,
      streakBroken,
      baseXp: BASE_XP,
      bonusXp,
      totalXp,
      nextClaimTimestamp: now + COOLDOWN_MS,
      leveledUp: xpResult?.leveledUp,
      newLevel: xpResult?.newLevel,
      addedRoles: xpResult?.addedRoles,
    };
  }

  public formatRemainingTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} Std. ${minutes} Min.`;
    }
    if (minutes > 0) {
      return `${minutes} Min. ${seconds} Sek.`;
    }
    return `${seconds} Sek.`;
  }
}

export const dailyService = new DailyService();
