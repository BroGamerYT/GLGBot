import fs from "fs";
import path from "path";
import { Guild, GuildMember, User } from "discord.js";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { moduleService } from "./moduleService";
import { statsService } from "./statsService";

export interface EconomyConfig {
  currencyName: string;
  currencySymbol: string;
  messageCoinsMin: number;
  messageCoinsMax: number;
  messageCooldownSeconds: number;
  voiceCoinsPerMinute: number;
  dailyBaseCoins: number;
  dailyStreakBonusCoins: number;
  payFeePercent: number; // 0 bis 10 Prozent Gebühr (Standard 0)
  xpPerCoin: number; // Wechselkurs: z.B. 10 XP = 1 Coin (Standard: 10)
  enableXpExchange: boolean; // Erlaubt Level-XP in Coins zu investieren
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  currencyName: "Coins",
  currencySymbol: "🪙",
  messageCoinsMin: 1,
  messageCoinsMax: 3,
  messageCooldownSeconds: 60,
  voiceCoinsPerMinute: 1,
  dailyBaseCoins: 100,
  dailyStreakBonusCoins: 15,
  payFeePercent: 0,
  xpPerCoin: 10,
  enableXpExchange: true,
};

export type ShopItemType = "role" | "color" | "badge" | "custom_voice" | "custom";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: ShopItemType;
  roleId?: string;
  colorHex?: string;
  badgeIcon?: string;
  stock?: number; // -1 = unendlich
  requiredLevel?: number; // 0 = keine Anforderung
  enabled: boolean;
}

export interface UserWallet {
  userId: string;
  tag?: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastMessageTimestamp?: number;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  type: ShopItemType;
  purchasedAt: string;
  pricePaid: number;
  roleId?: string;
  badgeIcon?: string;
}

export interface EconomyTransaction {
  id: string;
  timestamp: string;
  userId: string;
  userTag?: string;
  targetUserId?: string;
  targetUserTag?: string;
  type: "message" | "voice" | "daily" | "pay_sent" | "pay_received" | "shop_purchase" | "admin";
  amount: number;
  reason: string;
}

export interface GuildEconomyStore {
  config: EconomyConfig;
  wallets: Record<string, UserWallet>;
  shopItems: ShopItem[];
  inventory: Record<string, InventoryItem[]>;
  transactions: EconomyTransaction[];
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const ECONOMY_FILE = path.join(DATA_DIR, "economy.json");

class EconomyService {
  /** guildId -> GuildEconomyStore */
  private stores: Record<string, GuildEconomyStore> = {};
  private saveTimeout: NodeJS.Timeout | null = null;

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
      if (fs.existsSync(ECONOMY_FILE)) {
        this.stores = readJsonFile(ECONOMY_FILE, this.stores);
      }
    } catch (e) {
      console.error("[EconomyService] Fehler beim Laden von economy.json:", e);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        writeJsonAtomic(ECONOMY_FILE, this.stores);
      } catch (e) {
        console.error("[EconomyService] Fehler beim Speichern von economy.json:", e);
      }
    }, 2000);
  }

  private getOrCreateGuildStore(guildId: string): GuildEconomyStore {
    if (!this.stores[guildId]) {
      this.stores[guildId] = {
        config: { ...DEFAULT_ECONOMY_CONFIG },
        wallets: {},
        shopItems: [
          {
            id: "role_vip",
            name: "VIP Status",
            description: "Exklusive VIP-Rolle für aktive Community-Mitglieder.",
            price: 5000,
            type: "role",
            stock: -1,
            requiredLevel: 5,
            enabled: false,
          },
          {
            id: "badge_supporter",
            name: "Community Supporter Badge",
            description: "Ein edles Stern-Abzeichen auf deinem Profil.",
            price: 1500,
            type: "badge",
            badgeIcon: "⭐",
            stock: -1,
            requiredLevel: 0,
            enabled: true,
          },
          {
            id: "voice_custom_name",
            name: "Lobby-Namensrecht",
            description: "Erlaube dir einen individuellen dauerhaften Namen für deine VoiceMaster-Lobby.",
            price: 3000,
            type: "custom_voice",
            stock: -1,
            requiredLevel: 3,
            enabled: true,
          },
        ],
        inventory: {},
        transactions: [],
      };
      this.scheduleSave();
    }
    return this.stores[guildId];
  }

  public getConfig(guildId: string): EconomyConfig {
    const store = this.getOrCreateGuildStore(guildId);
    return { ...DEFAULT_ECONOMY_CONFIG, ...store.config };
  }

  public updateConfig(guildId: string, patch: Partial<EconomyConfig>): EconomyConfig {
    const store = this.getOrCreateGuildStore(guildId);
    store.config = { ...store.config, ...patch };
    this.scheduleSave();
    return store.config;
  }

  public getOrCreateWallet(guildId: string, userId: string, tag?: string): UserWallet {
    const store = this.getOrCreateGuildStore(guildId);
    if (!store.wallets[userId]) {
      store.wallets[userId] = {
        userId,
        tag: tag || "Unbekannt",
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        updatedAt: new Date().toISOString(),
      };
      this.scheduleSave();
    } else if (tag && store.wallets[userId].tag !== tag) {
      store.wallets[userId].tag = tag;
    }
    return store.wallets[userId];
  }

  public getBalance(guildId: string, userId: string): number {
    const store = this.getOrCreateGuildStore(guildId);
    return store.wallets[userId]?.balance ?? 0;
  }

  public getLeaderboard(guildId: string, limit = 10): (UserWallet & { rank: number })[] {
    const store = this.getOrCreateGuildStore(guildId);
    return Object.values(store.wallets)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
      .map((w, idx) => ({ ...w, rank: idx + 1 }));
  }

  public getUserRank(guildId: string, userId: string): number {
    const store = this.getOrCreateGuildStore(guildId);
    const sorted = Object.values(store.wallets).sort((a, b) => b.balance - a.balance);
    const idx = sorted.findIndex((w) => w.userId === userId);
    return idx >= 0 ? idx + 1 : sorted.length + 1;
  }

  public getShopItems(guildId: string, onlyEnabled = true): ShopItem[] {
    const store = this.getOrCreateGuildStore(guildId);
    if (!onlyEnabled) return store.shopItems;
    return store.shopItems.filter((i) => i.enabled);
  }

  public getShopItem(guildId: string, itemId: string): ShopItem | null {
    const store = this.getOrCreateGuildStore(guildId);
    return store.shopItems.find((i) => i.id === itemId) || null;
  }

  public addShopItem(guildId: string, item: Omit<ShopItem, "id">): ShopItem {
    const store = this.getOrCreateGuildStore(guildId);
    const id = "item_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    const newItem: ShopItem = { ...item, id };
    store.shopItems.push(newItem);
    this.scheduleSave();
    return newItem;
  }

  public updateShopItem(guildId: string, itemId: string, patch: Partial<ShopItem>): ShopItem | null {
    const store = this.getOrCreateGuildStore(guildId);
    const idx = store.shopItems.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;
    store.shopItems[idx] = { ...store.shopItems[idx], ...patch, id: itemId };
    this.scheduleSave();
    return store.shopItems[idx];
  }

  public deleteShopItem(guildId: string, itemId: string): boolean {
    const store = this.getOrCreateGuildStore(guildId);
    const prevLen = store.shopItems.length;
    store.shopItems = store.shopItems.filter((i) => i.id !== itemId);
    if (store.shopItems.length !== prevLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public getUserInventory(guildId: string, userId: string): InventoryItem[] {
    const store = this.getOrCreateGuildStore(guildId);
    return store.inventory[userId] || [];
  }

  public getTransactions(guildId: string, limit = 50): EconomyTransaction[] {
    const store = this.getOrCreateGuildStore(guildId);
    return [...(store.transactions || [])].reverse().slice(0, limit);
  }

  public getUserTransactions(guildId: string, userId: string, limit = 10): EconomyTransaction[] {
    const store = this.getOrCreateGuildStore(guildId);
    return (store.transactions || [])
      .filter((t) => t.userId === userId || t.targetUserId === userId)
      .slice(-limit)
      .reverse();
  }

  private logTransaction(
    guildId: string,
    tx: Omit<EconomyTransaction, "id" | "timestamp">
  ) {
    const store = this.getOrCreateGuildStore(guildId);
    if (!store.transactions) store.transactions = [];
    const fullTx: EconomyTransaction = {
      ...tx,
      id: "tx_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    store.transactions.push(fullTx);
    // Behalte maximal 200 Transaktionen im Speicher
    if (store.transactions.length > 200) {
      store.transactions = store.transactions.slice(-200);
    }
  }

  public addCoins(
    guildId: string,
    userId: string,
    amount: number,
    reason: string,
    type: EconomyTransaction["type"] = "admin",
    targetUserId?: string,
    userTag?: string,
    targetUserTag?: string
  ): UserWallet {
    const wallet = this.getOrCreateWallet(guildId, userId, userTag);
    const safeAmount = Math.max(0, Math.floor(amount));
    wallet.balance += safeAmount;
    wallet.totalEarned += safeAmount;
    wallet.updatedAt = new Date().toISOString();
    this.logTransaction(guildId, {
      userId,
      userTag: wallet.tag,
      targetUserId,
      targetUserTag,
      type,
      amount: safeAmount,
      reason,
    });
    this.scheduleSave();
    return wallet;
  }

  public removeCoins(
    guildId: string,
    userId: string,
    amount: number,
    reason: string,
    type: EconomyTransaction["type"] = "admin",
    targetUserId?: string,
    userTag?: string,
    targetUserTag?: string
  ): UserWallet {
    const wallet = this.getOrCreateWallet(guildId, userId, userTag);
    const safeAmount = Math.max(0, Math.floor(amount));
    wallet.balance = Math.max(0, wallet.balance - safeAmount);
    wallet.totalSpent += safeAmount;
    wallet.updatedAt = new Date().toISOString();
    this.logTransaction(guildId, {
      userId,
      userTag: wallet.tag,
      targetUserId,
      targetUserTag,
      type,
      amount: -safeAmount,
      reason,
    });
    this.scheduleSave();
    return wallet;
  }

  public setBalance(
    guildId: string,
    userId: string,
    newBalance: number,
    reason = "Admin Kontostand-Anpassung",
    userTag?: string
  ): UserWallet {
    const wallet = this.getOrCreateWallet(guildId, userId, userTag);
    const diff = Math.floor(newBalance) - wallet.balance;
    wallet.balance = Math.max(0, Math.floor(newBalance));
    wallet.updatedAt = new Date().toISOString();
    this.logTransaction(guildId, {
      userId,
      userTag: wallet.tag,
      type: "admin",
      amount: diff,
      reason: `${reason} (Neuer Saldo: ${wallet.balance})`,
    });
    this.scheduleSave();
    return wallet;
  }

  public transferCoins(
    guildId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    fromTag?: string,
    toTag?: string
  ): {
    success: boolean;
    error?: string;
    fee?: number;
    netAmount?: number;
    fromBalance?: number;
    toBalance?: number;
  } {
    if (fromUserId === toUserId) {
      return { success: false, error: "Du kannst dir selbst keine Coins überweisen." };
    }
    const cleanAmount = Math.floor(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: "Der Überweisungsbetrag muss mindestens 1 Coin betragen." };
    }

    const cfg = this.getConfig(guildId);
    const fromWallet = this.getOrCreateWallet(guildId, fromUserId, fromTag);
    if (fromWallet.balance < cleanAmount) {
      return {
        success: false,
        error: `Dein Guthaben reicht nicht aus. Du besitzt ${fromWallet.balance.toLocaleString("de-DE")} ${cfg.currencyName}.`,
      };
    }

    const feePercent = Math.max(0, Math.min(50, cfg.payFeePercent || 0));
    const fee = Math.floor((cleanAmount * feePercent) / 100);
    const netAmount = cleanAmount - fee;

    const toWallet = this.getOrCreateWallet(guildId, toUserId, toTag);

    fromWallet.balance -= cleanAmount;
    fromWallet.totalSpent += cleanAmount;
    fromWallet.updatedAt = new Date().toISOString();

    toWallet.balance += netAmount;
    toWallet.totalEarned += netAmount;
    toWallet.updatedAt = new Date().toISOString();

    this.logTransaction(guildId, {
      userId: fromUserId,
      userTag: fromWallet.tag,
      targetUserId: toUserId,
      targetUserTag: toWallet.tag,
      type: "pay_sent",
      amount: -cleanAmount,
      reason: `Überweisung an ${toWallet.tag || toUserId}${fee > 0 ? ` (Gebühr: ${fee})` : ""}`,
    });

    this.logTransaction(guildId, {
      userId: toUserId,
      userTag: toWallet.tag,
      targetUserId: fromUserId,
      targetUserTag: fromWallet.tag,
      type: "pay_received",
      amount: netAmount,
      reason: `Überweisung von ${fromWallet.tag || fromUserId}`,
    });

    this.scheduleSave();
    return {
      success: true,
      fee,
      netAmount,
      fromBalance: fromWallet.balance,
      toBalance: toWallet.balance,
    };
  }

  public async buyShopItem(
    guild: Guild,
    member: GuildMember,
    itemId: string
  ): Promise<{
    success: boolean;
    error?: string;
    item?: ShopItem;
    newBalance?: number;
  }> {
    const store = this.getOrCreateGuildStore(guild.id);
    const item = store.shopItems.find((i) => i.id === itemId);
    if (!item || !item.enabled) {
      return { success: false, error: "Dieser Shop-Artikel existiert nicht oder ist zurzeit deaktiviert." };
    }

    if (item.stock !== undefined && item.stock !== -1 && item.stock <= 0) {
      return { success: false, error: "Dieser Artikel ist leider ausverkauft!" };
    }

    // Level-Anforderung prüfen
    if (item.requiredLevel && item.requiredLevel > 0) {
      const profile = statsService.getUserProfile(guild.id, member.id);
      const userLevel = profile?.progress?.level ?? 0;
      if (userLevel < item.requiredLevel) {
        return {
          success: false,
          error: `Du benötigst mindestens **Level ${item.requiredLevel}**, um diesen Artikel zu kaufen (dein Level: ${userLevel}).`,
        };
      }
    }

    const wallet = this.getOrCreateWallet(guild.id, member.id, member.user.tag);
    if (wallet.balance < item.price) {
      const cfg = this.getConfig(guild.id);
      return {
        success: false,
        error: `Nicht genügend ${cfg.currencyName}! Der Artikel kostet **${item.price.toLocaleString("de-DE")} ${cfg.currencySymbol}**, du hast aber nur **${wallet.balance.toLocaleString("de-DE")} ${cfg.currencySymbol}**.`,
      };
    }

    // Wenn es eine Discord-Rolle oder Farbrolle ist, Rolle vergeben
    if ((item.type === "role" || item.type === "color") && item.roleId) {
      const role = guild.roles.cache.get(item.roleId);
      if (!role) {
        return { success: false, error: "Die verknüpfte Rolle existiert auf diesem Discord-Server nicht mehr." };
      }
      if (member.roles.cache.has(item.roleId)) {
        return { success: false, error: "Du besitzt diese Rolle bereits!" };
      }

      // Bei Farbrollen: Vorherige Farbrollen entfernen, damit die neue Farbe sofort sichtbar ist
      if (item.type === "color") {
        const colorRoleIds = store.shopItems
          .filter((i) => i.type === "color" && i.roleId)
          .map((i) => i.roleId!);
        for (const cId of colorRoleIds) {
          if (cId !== item.roleId && member.roles.cache.has(cId)) {
            await member.roles.remove(cId, "Farbwechsel im Belohnungs-Shop").catch(() => null);
          }
        }
      }

      try {
        await member.roles.add(role, `Kauf im GLGBot Belohnungs-Shop (${item.name})`);
      } catch (err: any) {
        return {
          success: false,
          error: `Fehler beim Zuweisen der Rolle: Der Bot hat möglicherweise keine ausreichenden Rechte für diese Rolle.`,
        };
      }
    }

    // Guthaben abziehen
    wallet.balance -= item.price;
    wallet.totalSpent += item.price;
    wallet.updatedAt = new Date().toISOString();

    if (item.stock !== undefined && item.stock > 0) {
      item.stock -= 1;
    }

    // Ins Inventar eintragen
    if (!store.inventory[member.id]) store.inventory[member.id] = [];
    const invItem: InventoryItem = {
      id: "inv_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      itemId: item.id,
      itemName: item.name,
      type: item.type,
      purchasedAt: new Date().toISOString(),
      pricePaid: item.price,
      roleId: item.roleId,
      badgeIcon: item.badgeIcon,
    };
    store.inventory[member.id].push(invItem);

    this.logTransaction(guild.id, {
      userId: member.id,
      userTag: member.user.tag,
      type: "shop_purchase",
      amount: -item.price,
      reason: `Shop-Kauf: ${item.name}`,
    });

    this.scheduleSave();
    return {
      success: true,
      item,
      newBalance: wallet.balance,
    };
  }

  public addMessageCoins(guild: Guild, user: User): number | null {
    if (!moduleService.isEnabled(guild.id, "economy")) return null;
    const cfg = this.getConfig(guild.id);
    const now = Date.now();
    const wallet = this.getOrCreateWallet(guild.id, user.id, user.tag);

    const cooldownMs = (cfg.messageCooldownSeconds ?? 60) * 1000;
    if (wallet.lastMessageTimestamp && now - wallet.lastMessageTimestamp < cooldownMs) {
      return null;
    }

    const min = cfg.messageCoinsMin ?? 1;
    const max = Math.max(min, cfg.messageCoinsMax ?? 3);
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;

    wallet.lastMessageTimestamp = now;
    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.updatedAt = new Date().toISOString();

    this.scheduleSave();
    return amount;
  }

  public addVoiceCoins(guild: Guild, user: User): number | null {
    if (!moduleService.isEnabled(guild.id, "economy")) return null;
    const cfg = this.getConfig(guild.id);
    const coinsPerMin = cfg.voiceCoinsPerMinute ?? 1;
    if (coinsPerMin <= 0) return null;

    const wallet = this.getOrCreateWallet(guild.id, user.id, user.tag);
    wallet.balance += coinsPerMin;
    wallet.totalEarned += coinsPerMin;
    wallet.updatedAt = new Date().toISOString();

    this.scheduleSave();
    return coinsPerMin;
  }

  /**
   * Tauscht Level-XP in Coins um (Marktwirtschaft / Börse).
   */
  public exchangeXpForCoins(
    guild: Guild,
    user: User,
    xpAmount: number
  ): {
    success: boolean;
    error?: string;
    coinsEarned?: number;
    newBalance?: number;
    newXp?: number;
    newLevel?: number;
    oldLevel?: number;
    rate?: number;
  } {
    if (!moduleService.isEnabled(guild.id, "economy")) {
      return { success: false, error: "Das Wirtschafts-Modul ist auf diesem Server deaktiviert." };
    }

    const cfg = this.getConfig(guild.id);
    if (!cfg.enableXpExchange) {
      return { success: false, error: "Der XP-Börsentausch ist auf diesem Server derzeit deaktiviert." };
    }

    const rate = Math.max(1, cfg.xpPerCoin || 10);
    const cleanXp = Math.floor(xpAmount);
    if (isNaN(cleanXp) || cleanXp < rate) {
      return {
        success: false,
        error: `Du musst mindestens ${rate} XP investieren, um 1 ${cfg.currencyName} zu erhalten.`,
      };
    }

    const stats = statsService.getOrCreateUser(guild, user);
    if (stats.xp < cleanXp) {
      return {
        success: false,
        error: `Nicht genügend Level-Punkte! Du hast aktuell ${stats.xp.toLocaleString("de-DE")} XP, möchtest aber ${cleanXp.toLocaleString("de-DE")} XP tauschen.`,
      };
    }

    const coinsEarned = Math.floor(cleanXp / rate);
    const actualXpDeducted = coinsEarned * rate;

    // XP abziehen & Level neu berechnen
    const deduction = statsService.deductXp(guild.id, user.id, actualXpDeducted);
    if (!deduction) {
      return { success: false, error: "Fehler beim Abziehen der XP." };
    }

    // Coins gutschreiben
    const wallet = this.addCoins(
      guild.id,
      user.id,
      coinsEarned,
      `Börsen-Umtausch: ${actualXpDeducted} XP in ${coinsEarned} ${cfg.currencyName} investiert (Kurs: 1 ${cfg.currencyName} = ${rate} XP)`,
      "admin",
      undefined,
      user.tag
    );

    return {
      success: true,
      coinsEarned,
      newBalance: wallet.balance,
      newXp: deduction.newXp,
      newLevel: deduction.newLevel,
      oldLevel: deduction.oldLevel,
      rate,
    };
  }

  /**
   * Erstellt auf dem Discord-Server 6 Standard-Farbrollen und fügt sie zum Shop hinzu.
   */
  public async setupColorRoles(guild: Guild): Promise<{ createdRoles: number; addedItems: number }> {
    const COLOR_PRESETS = [
      { name: "🎨 Neonrot", color: 0xff3366, hex: "#FF3366", price: 2000, desc: "Leuchtendes Neonrot für deinen Namen im Chat." },
      { name: "🎨 Cyber-Cyan", color: 0x00f0ff, hex: "#00F0FF", price: 2000, desc: "Futuristisches Cyanblau für deinen Namen im Chat." },
      { name: "🎨 Goldgelb", color: 0xffd700, hex: "#FFD700", price: 2500, desc: "Edles Goldgelb für deinen Namen im Chat." },
      { name: "🎨 Smaragdgrün", color: 0x10b981, hex: "#10B981", price: 2000, desc: "Sattes Smaragdgrün für deinen Namen im Chat." },
      { name: "🎨 Amethystviolett", color: 0xa855f7, hex: "#A855F7", price: 2000, desc: "Königliches Violett für deinen Namen im Chat." },
      { name: "🎨 Flammenorange", color: 0xf97316, hex: "#F97316", price: 2000, desc: "Feuriges Orange für deinen Namen im Chat." },
    ];

    let createdRoles = 0;
    let addedItems = 0;
    const store = this.getOrCreateGuildStore(guild.id);

    for (const preset of COLOR_PRESETS) {
      let role = guild.roles.cache.find((r) => r.name.toLowerCase() === preset.name.toLowerCase());
      if (!role) {
        try {
          role = await guild.roles.create({
            name: preset.name,
            color: preset.color,
            reason: "GLGBot Namensfarben-Setup für Belohnungs-Shop",
          });
          createdRoles++;
        } catch (e) {
          console.error(`[EconomyService] Konnte Farbrolle "${preset.name}" nicht erstellen:`, e);
          continue;
        }
      }

      const existing = store.shopItems.find(
        (i) => (role && i.roleId === role.id) || i.name.toLowerCase() === preset.name.toLowerCase()
      );
      if (!existing && role) {
        store.shopItems.push({
          id: "color_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
          name: preset.name,
          description: preset.desc,
          price: preset.price,
          type: "color",
          roleId: role.id,
          colorHex: preset.hex,
          badgeIcon: "🎨",
          stock: -1,
          requiredLevel: 0,
          enabled: true,
        });
        addedItems++;
      }
    }

    if (addedItems > 0) {
      this.scheduleSave();
    }

    return { createdRoles, addedItems };
  }

  public claimDailyCoins(guildId: string, userId: string, streak: number, userTag?: string): number {
    const cfg = this.getConfig(guildId);
    const base = cfg.dailyBaseCoins ?? 100;
    const bonusPerDay = cfg.dailyStreakBonusCoins ?? 15;
    const maxBonus = bonusPerDay * 10;
    const bonus = Math.min(maxBonus, Math.max(0, (streak - 1) * bonusPerDay));
    const totalCoins = base + bonus;

    this.addCoins(guildId, userId, totalCoins, `Daily Claim (Streak: ${streak})`, "daily", undefined, userTag);
    return totalCoins;
  }
}

export const economyService = new EconomyService();
