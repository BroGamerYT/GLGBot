import { z } from "zod";
import { auditLogService } from "./auditLogService";
import { birthdayService } from "./birthdayService";
import { blacklistService } from "./blacklistService";
import { clipService } from "./clipService";
import { customCommandService, CustomCommand } from "./customCommandService";
import { economyService, ShopItem } from "./economyService";
import { gameNewsService, NewsFeed } from "./gameNewsService";
import { freeGamesService } from "./freeGamesService";
import { gameServerService, GameServer } from "./gameServerService";
import { liveStreamService } from "./liveStreamService";
import { moduleService } from "./moduleService";
import { releaseService } from "./releaseService";
import { rolePanelService } from "./rolePanelService";
import { statsService } from "./statsService";
import { statsChannelsService, CounterId } from "./statsChannelsService";
import { streamNotificationService, StreamNotification } from "./streamNotificationService";
import { tempVoiceService } from "./tempVoiceService";
import { ticketService } from "./ticketService";
import { welcomeService } from "./welcomeService";
import { NEWS_INCLUDES } from "../config/newsCatalog";

const id = z.string().min(1).max(32);
const optionalId = id.optional();

const statsSchema = z.object({
  maxLevel: z.number().int().min(1).max(1000),
  baseXp: z.number().min(0).max(1_000_000),
  exponent: z.number().min(0).max(10),
  messageXpMin: z.number().min(0).max(1_000_000),
  messageXpMax: z.number().min(0).max(1_000_000),
  messageCooldownSeconds: z.number().int().min(0).max(86_400),
  voiceXpPerMinute: z.number().min(0).max(1_000_000),
  warnPenaltyXp: z.number().min(0).max(1_000_000),
  timeoutPenaltyXp: z.number().min(0).max(1_000_000),
  prisonPenaltyXp: z.number().min(0).max(1_000_000),
  badNamePenaltyXp: z.number().min(0).max(1_000_000),
  blacklistPenaltyXp: z.number().min(0).max(1_000_000),
  kickPenaltyXp: z.number().min(0).max(1_000_000),
  banPenaltyXp: z.number().min(0).max(1_000_000),
  levelUpChannelId: optionalId,
  levelUpNotifications: z.boolean(),
  levelUpMessage: z.string().max(2000).optional(),
  roleRewards: z.record(z.string().regex(/^\d{1,4}$/), id).optional(),
}).strict();

const economyConfigSchema = z.object({
  currencyName: z.string().min(1).max(32),
  currencySymbol: z.string().min(1).max(8),
  messageCoinsMin: z.number().min(0).max(1_000_000),
  messageCoinsMax: z.number().min(0).max(1_000_000),
  messageCooldownSeconds: z.number().int().min(0).max(86_400),
  voiceCoinsPerMinute: z.number().min(0).max(1_000_000),
  dailyBaseCoins: z.number().min(0).max(1_000_000),
  dailyStreakBonusCoins: z.number().min(0).max(1_000_000),
  payFeePercent: z.number().min(0).max(10),
  xpPerCoin: z.number().min(1).max(1_000_000),
  enableXpExchange: z.boolean(),
}).strict();

const shopItemSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  price: z.number().int().min(0).max(1_000_000_000),
  type: z.enum(["role", "color", "badge", "custom_voice", "custom"]),
  roleId: optionalId,
  colorHex: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  badgeIcon: z.string().max(16).optional(),
  stock: z.number().int().min(-1).max(1_000_000).optional(),
  requiredLevel: z.number().int().min(0).max(1000).optional(),
  enabled: z.boolean(),
}).strict();

const releaseSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platforms: z.array(z.enum(["PC", "PS5", "Xbox", "Switch", "Game Pass"])).max(5),
  genre: z.string().max(100),
  category: z.enum(["game", "major_update", "dlc"]).optional(),
  isTripleA: z.boolean().optional(),
  isServerGame: z.boolean().optional(),
  description: z.string().max(4000).optional(),
  coverUrl: z.string().url().max(2000).optional(),
  storeUrl: z.string().url().max(2000).optional(),
  trailerUrl: z.string().url().max(2000).optional(),
  isCurated: z.boolean().optional(),
  addedBy: z.string().max(100).optional(),
  createdAt: z.number().finite(),
}).strict();

const newsFeedSchema = z.object({
  id: z.string().min(1).max(100),
  // bewusst tolerant: unbekannte Typen werden beim Sichern/Wiederherstellen herausgefiltert,
  // damit ein einzelner veralteter Feed nie das ganze Backup sprengt
  type: z.string().min(1).max(50),
  appId: z.string().regex(/^\d{1,10}$/).optional(),
  name: z.string().min(1).max(100),
  channelId: id,
  roleId: optionalId,
  enabled: z.boolean(),
  onlyPatchnotes: z.boolean().optional(),
  snapshots: z.boolean().optional(),
  createdAt: z.string().datetime(),
}).strict();

const gameServerSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(60),
  type: z.enum(["minecraft", "source", "tcp"]),
  host: z.string().regex(/^[a-z0-9.-]{1,253}$/),
  port: z.number().int().min(1).max(65535),
  displayAddress: z.string().max(253).optional(),
}).strict();

const streamNotificationSchema = z.object({
  id: z.string().min(1).max(100),
  platform: z.enum(["twitch", "youtube", "kick"]),
  channelName: z.string().min(1).max(100),
  displayName: z.string().max(100).optional(),
  profileImageUrl: z.string().url().max(2000).optional(),
  youtubeChannelId: z.string().max(100).optional(),
  discordChannelId: id,
  pingRoleId: optionalId,
  linkedDiscordUserId: optionalId,
  customMessage: z.string().max(2000).optional(),
  silent: z.boolean().optional(),
}).strict();

const customCommandSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().regex(/^[a-z0-9_-]{1,32}$/),
  description: z.string().max(100),
  content: z.string().max(2000),
  embed: z.object({
    title: z.string().max(256).optional(),
    description: z.string().max(4000).optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    imageUrl: z.string().url().max(2000).optional(),
  }).strict().optional(),
  ephemeral: z.boolean(),
  textTrigger: z.boolean(),
  uses: z.number().int().min(0),
  createdBy: z.string().max(100).optional(),
  updatedAt: z.number().finite(),
}).strict();

const statsCounterSchema = z.object({
  enabled: z.boolean(),
  template: z.string().min(1).max(100),
  channelId: optionalId,
}).strict();

export const guildBotSettingsSchema = z.object({
  modules: z.record(z.string().min(1).max(32), z.boolean()).optional(),
  stats: statsSchema.optional(),
  economy: z.object({ config: economyConfigSchema, shopItems: z.array(shopItemSchema).max(500) }).strict().optional(),
  tickets: z.object({ categoryId: optionalId, supportRoleId: optionalId, transcriptChannelId: optionalId }).strict().optional(),
  liveStream: z.object({
    liveRoleId: id,
    announcementChannelId: optionalId,
    categoryId: optionalId,
    channelType: z.enum(["voice", "text"]),
    autoRole: z.boolean().optional(),
    pingRoleId: optionalId,
    silent: z.boolean().optional(),
    customMessage: z.string().max(2000).optional(),
  }).strict().nullable().optional(),
  rolePanel: z.object({
    rulesRoleId: optionalId,
    streamAlertRoleId: optionalId,
    freeGamesRoleId: optionalId,
    freeGamesChannelId: optionalId,
    gameNewsRoleId: optionalId,
    gameNewsChannelId: optionalId,
    driverNewsRoleId: optionalId,
    driverNewsChannelId: optionalId,
    rulesChannelId: optionalId,
    permissionsChannelId: optionalId,
    serverLocked: z.boolean().optional(),
    headerMessages: z.record(id, id).optional(),
  }).strict().nullable().optional(),
  voice: z.object({ masterChannelId: id, categoryId: optionalId }).strict().nullable().optional(),
  welcome: z.object({
    channelId: optionalId,
    title: z.string().max(40),
    message: z.string().max(1500),
    subtitle: z.string().max(120),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    card: z.boolean(),
    autoRoleId: optionalId,
    backgroundImageUrl: z.string().url().max(2000).optional(),
  }).strict().optional(),
  auditLogs: z.object({
    logChannelId: optionalId,
    enabled: z.object({ messages: z.boolean(), members: z.boolean(), channels: z.boolean(), roles: z.boolean(), voice: z.boolean(), server: z.boolean() }).strict(),
    ignoredChannelIds: z.array(id).max(1000).optional(),
    ignoredUserIds: z.array(id).max(1000).optional(),
  }).strict().optional(),
  blacklist: z.object({
    words: z.array(z.string().min(1).max(200)).max(5000),
    autoDelete: z.boolean(),
    autoWarn: z.boolean(),
    xpPenalty: z.number().min(0).max(1_000_000),
    badNameCheck: z.boolean(),
    badNameXpPenalty: z.number().min(0).max(1_000_000),
  }).strict().optional(),
  releases: z.object({
    channelId: optionalId,
    pingRoleId: optionalId,
    weeklyPostEnabled: z.boolean(),
    weeklyPostDay: z.number().int().min(0).max(6),
    weeklyPostHour: z.number().int().min(0).max(23),
    lastWeeklyPostDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    customReleases: z.array(releaseSchema).max(500),
  }).strict().optional(),
  newsFeeds: z.array(newsFeedSchema).max(50).optional(),
  birthdayConfig: z.object({
    channelId: optionalId,
    roleId: optionalId,
    message: z.string().max(1000),
  }).strict().optional(),
  gameServers: z.array(gameServerSchema).max(10).optional(),
  freeGames: z.object({
    epic: z.boolean(), steam: z.boolean(), gog: z.boolean(), other: z.boolean(),
    upcoming: z.boolean(), keys: z.boolean(), silent: z.boolean().optional(),
  }).strict().optional(),
  clips: z.object({ channelId: optionalId, weekday: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23) }).strict().optional(),
  statsChannels: z.object({
    categoryId: optionalId,
    counters: z.partialRecord(z.enum(["members", "humans", "online", "voice", "live", "boosts", "gameservers"] satisfies [CounterId, ...CounterId[]]), statsCounterSchema),
  }).strict().optional(),
  streamNotifications: z.array(streamNotificationSchema).max(500).optional(),
  customCommands: z.array(customCommandSchema).max(25).optional(),
}).strict();

export type GuildBotSettingsSnapshot = z.infer<typeof guildBotSettingsSchema>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function remapIds(value: unknown, idMap: Map<string, string>, crossServer: boolean): unknown {
  if (typeof value === "string") {
    const mapped = idMap.get(value);
    if (mapped) return mapped;
    if (crossServer && /^\d{15,22}$/.test(value)) return undefined;
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => remapIds(item, idMap, crossServer)).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    const mapped: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const mappedKey = idMap.get(key) || (crossServer && /^\d{15,22}$/.test(key) ? undefined : key);
      if (mappedKey === undefined) continue;
      const next = remapIds(item, idMap, crossServer);
      if (next !== undefined) mapped[mappedKey] = next;
    }
    return mapped;
  }
  return value;
}

export function captureGuildBotSettings(guildId: string): GuildBotSettingsSnapshot {
  const liveStream = liveStreamService.getConfig(guildId);
  const voice = tempVoiceService.getConfig(guildId);
  const rolePanel = rolePanelService.getConfig(guildId);
  const economy = economyService.getBackupSettings(guildId);
  return guildBotSettingsSchema.parse({
    modules: moduleService.getStateSnapshot(guildId),
    stats: statsService.getBackupConfig(guildId) || undefined,
    economy: economy || undefined,
    tickets: ticketService.getBackupConfig(guildId) || undefined,
    liveStream: liveStream || null,
    rolePanel: rolePanel || null,
    voice: voice || null,
    welcome: welcomeService.getConfig(guildId),
    auditLogs: auditLogService.getBackupConfig(guildId) || undefined,
    blacklist: blacklistService.getBackupConfig(guildId) || undefined,
    releases: releaseService.getConfig(guildId),
    newsFeeds: gameNewsService.getBackupFeeds(guildId).filter((f) => (NEWS_INCLUDES as Record<string, unknown>)[f.type]),
    birthdayConfig: birthdayService.getBackupConfig(guildId),
    gameServers: gameServerService.getBackupServers(guildId),
    freeGames: freeGamesService.getSettings(guildId),
    clips: clipService.getBackupConfig(guildId),
    statsChannels: statsChannelsService.getBackupConfig(guildId),
    streamNotifications: streamNotificationService.getBackupNotifications(guildId),
    customCommands: customCommandService.getBackupCommands(guildId),
  });
}

export function restoreGuildBotSettings(
  guildId: string,
  snapshot: unknown,
  idMap: Map<string, string>,
  crossServer: boolean
) {
  const parsed = guildBotSettingsSchema.parse(snapshot);
  const config = guildBotSettingsSchema.parse(remapIds(parsed, idMap, crossServer));

  if (config.modules) moduleService.applyStateSnapshot(guildId, config.modules);
  if (config.stats) statsService.setConfig(guildId, config.stats);
  if (config.economy) {
    economyService.updateConfig(guildId, config.economy.config);
    economyService.replaceShopItems(guildId, config.economy.shopItems as ShopItem[]);
  }
  if (config.tickets) ticketService.setConfig(guildId, config.tickets);
  if (config.liveStream === null) liveStreamService.disableConfig(guildId);
  else if (config.liveStream) {
    liveStreamService.setConfig(
      guildId,
      config.liveStream.liveRoleId,
      config.liveStream.announcementChannelId || undefined,
      config.liveStream.categoryId || undefined,
      config.liveStream.channelType,
      config.liveStream.autoRole,
      config.liveStream.pingRoleId || undefined,
      config.liveStream.silent,
      config.liveStream.customMessage
    );
  }
  if (config.rolePanel) rolePanelService.updateConfig(guildId, config.rolePanel);
  if (config.voice === null) tempVoiceService.disableMasterChannel(guildId);
  else if (config.voice) tempVoiceService.setMasterChannel(guildId, config.voice.masterChannelId, config.voice.categoryId || undefined);
  if (config.welcome) welcomeService.setConfig(guildId, config.welcome);
  if (config.auditLogs) auditLogService.setConfig(guildId, config.auditLogs);
  if (config.blacklist) blacklistService.setConfig(guildId, config.blacklist);
  if (config.releases) releaseService.setConfig(guildId, config.releases);
  if (config.newsFeeds) {
    const known = (config.newsFeeds as NewsFeed[]).filter((f) => (NEWS_INCLUDES as Record<string, unknown>)[f.type]);
    gameNewsService.setBackupFeeds(guildId, known);
  }
  if (config.birthdayConfig) birthdayService.setConfig(guildId, config.birthdayConfig);
  if (config.gameServers) gameServerService.setBackupServers(guildId, config.gameServers as GameServer[]);
  if (config.freeGames) freeGamesService.updateSettings(guildId, config.freeGames);
  if (config.clips) clipService.setConfig(guildId, config.clips);
  if (config.statsChannels) statsChannelsService.setBackupConfig(guildId, config.statsChannels);
  if (config.streamNotifications) streamNotificationService.setBackupNotifications(guildId, config.streamNotifications as StreamNotification[]);
  if (config.customCommands) customCommandService.setBackupCommands(guildId, config.customCommands as CustomCommand[]);
}