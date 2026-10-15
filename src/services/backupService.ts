import fs from "fs";
import path from "path";
import crypto from "crypto";
import { gunzipSync, gzipSync } from "zlib";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  Guild,
  Role,
  GuildChannel,
  CategoryChannel,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  OverwriteType,
  Client,
  AttachmentBuilder,
  Message,
} from "discord.js";
import { z } from "zod";
import { writeJsonAtomic } from "../utils/jsonFile";
import {
  captureGuildBotSettings,
  guildBotSettingsSchema,
  GuildBotSettingsSnapshot,
  restoreGuildBotSettings,
} from "./backupConfigService";

const BACKUP_SCHEMA_VERSION = 1;
const VALID_CHANNEL_TYPES = new Set(
  Object.values(ChannelType).filter((value): value is number => typeof value === "number")
);

export interface BackupRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  managed: boolean;
  isEveryone: boolean;
}

export interface BackupOverwrite {
  targetId: string;
  targetName: string;
  targetType: "role" | "member";
  allow: string;
  deny: string;
}

export interface BackupCategory {
  id: string;
  name: string;
  position: number;
  overwrites: BackupOverwrite[];
}

export interface BackupChannel {
  id: string;
  name: string;
  type: ChannelType;
  position: number;
  categoryId?: string;
  categoryName?: string;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  rateLimitPerUser?: number;
  overwrites: BackupOverwrite[];
}

export interface ArchivedAttachment {
  name: string;
  contentType?: string;
  size: number;
  data?: string;
  unavailableReason?: string;
}

export interface ArchivedMessage {
  authorId: string;
  authorTag: string;
  createdAt: string;
  content: string;
  pinned: boolean;
  embeds: unknown[];
  reactions: { emoji: string; count: number }[];
  attachments: ArchivedAttachment[];
}

export interface ArchivedChannel {
  channelId: string;
  channelName: string;
  messages: ArchivedMessage[];
}

export interface GuildBackup {
  schemaVersion: number;
  checksum?: string;
  id: string;
  guildId: string;
  sourceGuildId?: string;
  guildName: string;
  createdAt: string;
  creatorTag?: string;
  summary: {
    roleCount: number;
    categoryCount: number;
    channelCount: number;
    chatChannelCount?: number;
    chatMessageCount?: number;
  };
  roles: BackupRole[];
  categories: BackupCategory[];
  channels: BackupChannel[];
  botConfig?: GuildBotSettingsSnapshot;
  chatArchive?: ArchivedChannel[];
}

export interface BackupMeta {
  id: string;
  guildId: string;
  guildName: string;
  createdAt: string;
  creatorTag?: string;
  summary: {
    roleCount: number;
    categoryCount: number;
    channelCount: number;
    chatChannelCount?: number;
    chatMessageCount?: number;
  };
  fileSize: number;
}

export interface BackupRestorePreview {
  backupId: string;
  sourceGuild: string;
  targetGuild: string;
  crossServer: boolean;
  roles: { create: string[]; update: string[]; skip: string[] };
  categories: { create: string[]; update: string[] };
  channels: { create: string[]; update: string[] };
  ambiguousMappings: string[];
  mappingCandidates: Array<{
    sourceId: string;
    sourceName: string;
    kind: "role" | "category" | "channel";
    candidates: Array<{ id: string; name: string }>;
  }>;
  memberOverwritesToSkip: number;
  chatArchiveMessages: number;
  warnings: string[];
}

const BACKUPS_DIR = path.join(__dirname, "../../data/backups");
const MAX_BACKUP_BYTES = 15 * 1024 * 1024;
const MAX_ARCHIVE_MESSAGES = 2000;
const MAX_ARCHIVE_ATTACHMENT_BYTES = 1024 * 1024;
const MAX_ARCHIVE_TOTAL_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_DISCORD_EXPORT_BYTES = 10 * 1024 * 1024;
const ENCRYPTED_BACKUP_MAGIC = Buffer.from("GLGBKUP1", "ascii");
// Nur echte Backup-IDs erlauben (verhindert z. B. "../role_panel_config" -> fremde Dateien lesen/löschen)
const isValidBackupId = (id: string) => /^backup_\d+_[a-f0-9]+$/.test(String(id));

const backupRoleSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  color: z.number().int().min(0).max(0xffffff),
  hoist: z.boolean(),
  position: z.number().int().min(0),
  permissions: z.string().regex(/^\d+$/),
  mentionable: z.boolean(),
  managed: z.boolean(),
  isEveryone: z.boolean(),
}).strict();

const backupOverwriteSchema = z.object({
  targetId: z.string().min(1).max(32),
  targetName: z.string().min(1).max(100),
  targetType: z.enum(["role", "member"]),
  allow: z.string().regex(/^\d+$/),
  deny: z.string().regex(/^\d+$/),
}).strict();

const backupCategorySchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  position: z.number().int().min(0),
  overwrites: z.array(backupOverwriteSchema).max(1000),
}).strict();

const backupChannelSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  type: z.number().int().refine((value) => VALID_CHANNEL_TYPES.has(value), "Unbekannter Kanaltyp"),
  position: z.number().int().min(0),
  categoryId: z.string().min(1).max(32).optional(),
  categoryName: z.string().max(100).optional(),
  topic: z.string().max(1024).nullable().optional(),
  nsfw: z.boolean().optional(),
  bitrate: z.number().int().min(0).optional(),
  userLimit: z.number().int().min(0).optional(),
  rateLimitPerUser: z.number().int().min(0).optional(),
  overwrites: z.array(backupOverwriteSchema).max(1000),
}).strict();

const archivedAttachmentSchema = z.object({
  name: z.string().min(1).max(100),
  contentType: z.string().regex(/^[\w.+-]+\/[\w.+-]+$/).max(128).optional(),
  size: z.number().int().min(0).max(100_000_000),
  data: z.string().max(1_400_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
  unavailableReason: z.string().max(200).optional(),
}).strict();

const archivedMessageSchema = z.object({
  authorId: z.string().min(1).max(32),
  authorTag: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  content: z.string().max(4000),
  pinned: z.boolean(),
  embeds: z.array(z.json()).max(10),
  reactions: z.array(z.object({ emoji: z.string().max(100), count: z.number().int().min(0) }).strict()).max(50),
  attachments: z.array(archivedAttachmentSchema).max(10),
}).strict();

const archivedChannelSchema = z.object({
  channelId: z.string().min(1).max(32),
  channelName: z.string().min(1).max(100),
  messages: z.array(archivedMessageSchema).max(MAX_ARCHIVE_MESSAGES),
}).strict();

const backupDocumentSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  id: z.string().min(1).max(100),
  guildId: z.string().min(1).max(32),
  sourceGuildId: z.string().min(1).max(32).optional(),
  guildName: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  creatorTag: z.string().max(100).optional(),
  summary: z.object({
    roleCount: z.number().int().min(0),
    categoryCount: z.number().int().min(0),
    channelCount: z.number().int().min(0),
    chatChannelCount: z.number().int().min(0).optional(),
    chatMessageCount: z.number().int().min(0).optional(),
  }).strict(),
  roles: z.array(backupRoleSchema).max(1000),
  categories: z.array(backupCategorySchema).max(1000),
  channels: z.array(backupChannelSchema).max(2000),
  botConfig: guildBotSettingsSchema.optional(),
  chatArchive: z.array(archivedChannelSchema).max(10).optional(),
}).strict();

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? "null" : stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function calculateChecksum(backup: Record<string, unknown>): string {
  const { checksum: _checksum, ...content } = backup;
  return crypto.createHash("sha256").update(stableStringify(content)).digest("hex");
}

function sealBackup(backup: Omit<GuildBackup, "checksum">): GuildBackup {
  const content = backup as unknown as Record<string, unknown>;
  return { ...backup, checksum: calculateChecksum(content) };
}

function parseBackupDocument(value: unknown): GuildBackup {
  const raw = JSON.stringify(value);
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BACKUP_BYTES) {
    throw new Error(`Backup überschreitet das Größenlimit von ${Math.floor(MAX_BACKUP_BYTES / (1024 * 1024))} MB.`);
  }
  const parsed = backupDocumentSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Ungültiges Backup-Format: ${parsed.error.issues[0]?.message || "Daten fehlerhaft."}`);
  }

  const backup = parsed.data;
  if (backup.schemaVersion !== undefined && backup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`Nicht unterstützte Backup-Version: ${backup.schemaVersion}.`);
  }
  if (backup.checksum && backup.checksum !== calculateChecksum(value as Record<string, unknown>)) {
    throw new Error("Backup-Prüfsumme stimmt nicht; die Datei ist beschädigt oder wurde verändert.");
  }
  if (
    backup.summary.roleCount !== backup.roles.length ||
    backup.summary.categoryCount !== backup.categories.length ||
    backup.summary.channelCount !== backup.channels.length
  ) {
    throw new Error("Backup-Zusammenfassung stimmt nicht mit den enthaltenen Daten überein.");
  }
  const archivedMessages = (backup.chatArchive || []).reduce((count, channel) => count + channel.messages.length, 0);
  if (archivedMessages > MAX_ARCHIVE_MESSAGES) throw new Error("Chat-Archiv überschreitet das Nachrichtenlimit.");
  if (backup.summary.chatChannelCount !== undefined && backup.summary.chatChannelCount !== (backup.chatArchive || []).length) {
    throw new Error("Backup-Zusammenfassung stimmt nicht mit den Chat-Kanälen überein.");
  }
  if (backup.summary.chatMessageCount !== undefined && backup.summary.chatMessageCount !== archivedMessages) {
    throw new Error("Backup-Zusammenfassung stimmt nicht mit den archivierten Nachrichten überein.");
  }
  const attachmentBytes = (backup.chatArchive || []).flatMap((channel) => channel.messages)
    .flatMap((message) => message.attachments)
    .reduce((total, attachment) => total + (attachment.data ? Buffer.from(attachment.data, "base64").length : 0), 0);
  if (attachmentBytes > MAX_ARCHIVE_TOTAL_ATTACHMENT_BYTES) throw new Error("Chat-Archiv überschreitet das Anhang-Limit.");
  for (const channel of backup.chatArchive || []) {
    for (const message of channel.messages) {
      for (const attachment of message.attachments) {
        if (attachment.data && Buffer.from(attachment.data, "base64").length !== attachment.size) {
          throw new Error(`Anhang "${attachment.name}" hat eine ungültige Größenangabe.`);
        }
      }
    }
  }

  return { ...backup, schemaVersion: BACKUP_SCHEMA_VERSION };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function deriveBackupKey(secret: string, salt: Buffer): Buffer {
  if (secret.length < 32) throw new Error("BACKUP_ENCRYPTION_KEY muss mindestens 32 Zeichen lang sein.");
  return crypto.scryptSync(secret, salt, 32);
}

export function encryptBackupFile(backup: GuildBackup, secret: string): Buffer {
  const serialized = Buffer.from(JSON.stringify(backup), "utf8");
  if (serialized.length > MAX_BACKUP_BYTES) throw new Error("Backup ist zu groß für den verschlüsselten Export.");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveBackupKey(secret, salt), iv);
  const encrypted = Buffer.concat([cipher.update(gzipSync(serialized)), cipher.final()]);
  return Buffer.concat([ENCRYPTED_BACKUP_MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBackupFile(file: Buffer, secrets: string | string[]): unknown {
  const headerLength = ENCRYPTED_BACKUP_MAGIC.length + 16 + 12 + 16;
  if (file.length <= headerLength || file.length > MAX_BACKUP_BYTES) throw new Error("Ungültige oder zu große verschlüsselte Backup-Datei.");
  if (!file.subarray(0, ENCRYPTED_BACKUP_MAGIC.length).equals(ENCRYPTED_BACKUP_MAGIC)) {
    throw new Error("Unbekanntes Format der verschlüsselten Backup-Datei.");
  }
  let offset = ENCRYPTED_BACKUP_MAGIC.length;
  const salt = file.subarray(offset, offset += 16);
  const iv = file.subarray(offset, offset += 12);
  const tag = file.subarray(offset, offset += 16);
  const candidates = (Array.isArray(secrets) ? secrets : [secrets]).filter(Boolean).slice(0, 6);
  if (candidates.length === 0) throw new Error("Kein Entschlüsselungsschlüssel konfiguriert.");
  for (const secret of candidates) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", deriveBackupKey(secret, salt), iv);
      decipher.setAuthTag(tag);
      const compressed = Buffer.concat([decipher.update(file.subarray(offset)), decipher.final()]);
      const serialized = gunzipSync(compressed, { maxOutputLength: MAX_BACKUP_BYTES });
      return JSON.parse(serialized.toString("utf8"));
    } catch {
      // Try the next configured key during the rotation window.
    }
  }
  throw new Error("Backup konnte mit keinem aktuellen oder vorherigen Schlüssel entschlüsselt werden.");
}

function renderChatArchive(channel: ArchivedChannel): string {
  const messages = channel.messages.map((message) => {
    const attachments = message.attachments.map((attachment) =>
      `<li>${attachment.data ? `<a download="${escapeHtml(attachment.name)}" href="data:${escapeHtml(attachment.contentType || "application/octet-stream")};base64,${attachment.data}">${escapeHtml(attachment.name)}</a>` : escapeHtml(attachment.name)} (${attachment.size} Bytes${attachment.data ? "" : `; nicht archiviert: ${escapeHtml(attachment.unavailableReason || "nicht verfügbar")}`})</li>`
    ).join("");
    const embeds = message.embeds.map((embed) => `<pre>${escapeHtml(JSON.stringify(embed, null, 2))}</pre>`).join("");
    const reactions = message.reactions.map((reaction) => `${escapeHtml(reaction.emoji)} ${reaction.count}`).join(" · ");
    return `<article><header><strong>${escapeHtml(message.authorTag)}</strong> (${escapeHtml(message.authorId)}) · <time>${escapeHtml(message.createdAt)}</time>${message.pinned ? " · Angepinnt" : ""}</header><p>${escapeHtml(message.content).replace(/\n/g, "<br>")}</p>${embeds}${attachments ? `<ul>${attachments}</ul>` : ""}${reactions ? `<footer>Reaktionen: ${reactions}</footer>` : ""}</article>`;
  }).join("\n");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Archiv #${escapeHtml(channel.channelName)}</title><style>body{font:15px system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 16px;background:#f5f6f8;color:#20242a}h1{border-bottom:1px solid #ccd0d5;padding-bottom:12px}article{background:#fff;border:1px solid #d8dbe0;border-radius:6px;padding:14px 16px;margin:12px 0;overflow-wrap:anywhere}header,footer{font-size:12px;color:#5d6570}p{white-space:pre-wrap;line-height:1.5}pre{white-space:pre-wrap;background:#f2f3f5;padding:10px}</style><h1>Archiv: #${escapeHtml(channel.channelName)}</h1><p>Archivierte Kopie. Nachrichten werden nicht als ihre ursprünglichen Autoren wiederhergestellt.</p>${messages}</html>`;
}

class BackupService {
  private autoBackupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDir();
  }

  private ensureDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }

  private async captureChatArchive(
    guild: Guild,
    channelIds: string[],
    messagesPerChannel: number
  ): Promise<ArchivedChannel[]> {
    if (!Array.isArray(channelIds) || channelIds.some((channelId) => typeof channelId !== "string")) {
      throw new Error("Ungültige Kanal-Auswahl für das Chat-Archiv.");
    }
    const uniqueIds = Array.from(new Set(channelIds));
    if (uniqueIds.length === 0 || uniqueIds.length > 10) throw new Error("Wähle zwischen 1 und 10 Textkanäle für das Chat-Archiv aus.");
    if (!Number.isInteger(messagesPerChannel) || messagesPerChannel < 100 || messagesPerChannel > 1000) {
      throw new Error("Die Nachrichtenanzahl muss zwischen 100 und 1.000 pro Kanal liegen.");
    }
    if (uniqueIds.length * messagesPerChannel > MAX_ARCHIVE_MESSAGES) {
      throw new Error(`Das Archiv ist auf insgesamt ${MAX_ARCHIVE_MESSAGES} Nachrichten begrenzt. Wähle weniger Kanäle oder ein niedrigeres Limit.`);
    }

    let totalAttachmentBytes = 0;
    const archives: ArchivedChannel[] = [];
    for (const channelId of uniqueIds) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
        throw new Error(`Kanal ${channelId} ist kein Text- oder Ankündigungskanal dieses Servers.`);
      }

      const pinnedIds = new Set<string>();
      let beforePin: Date | undefined;
      for (let page = 0; page < 10; page++) {
        const pins = await channel.messages.fetchPins({ limit: 100, before: beforePin });
        for (const pin of pins.items) pinnedIds.add(pin.message.id);
        if (!pins.hasMore || pins.items.length === 0) break;
        const oldest = pins.items[pins.items.length - 1]?.pinnedAt;
        if (!oldest || (beforePin && oldest.getTime() >= beforePin.getTime())) break;
        beforePin = oldest;
      }

      const fetched = new Map<string, Message<true>>();
      let beforeMessage: string | undefined;
      while (fetched.size < messagesPerChannel) {
        const batch = await channel.messages.fetch({
          limit: Math.min(100, messagesPerChannel - fetched.size),
          ...(beforeMessage ? { before: beforeMessage } : {}),
          cache: false,
        });
        if (batch.size === 0) break;
        for (const message of batch.values()) fetched.set(message.id, message);
        const oldest = Array.from(batch.values()).at(-1);
        if (!oldest || batch.size < 100) break;
        beforeMessage = oldest.id;
      }

      const messages: ArchivedMessage[] = [];
      for (const message of Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp)) {
        const attachments: ArchivedAttachment[] = [];
        for (const attachment of message.attachments.values()) {
          const name = path.basename(attachment.name || "attachment").replace(/[^\w .()\-]/g, "_").slice(0, 100) || "attachment";
          const archived: ArchivedAttachment = {
            name,
            contentType: attachment.contentType || undefined,
            size: attachment.size,
          };
          if (attachment.size > MAX_ARCHIVE_ATTACHMENT_BYTES) {
            archived.unavailableReason = "Einzeldatei überschreitet 1 MB.";
          } else if (totalAttachmentBytes + attachment.size > MAX_ARCHIVE_TOTAL_ATTACHMENT_BYTES) {
            archived.unavailableReason = "Gesamtlimit für Anhänge erreicht.";
          } else {
            try {
              const url = new URL(attachment.url);
              if (url.protocol !== "https:" || !["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) {
                throw new Error("Kein erlaubter Discord-CDN-Host.");
              }
              const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "manual" });
              if (!response.ok || !response.body) throw new Error(`Download fehlgeschlagen (${response.status}).`);
              const reader = response.body.getReader();
              const chunks: Buffer[] = [];
              let size = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > MAX_ARCHIVE_ATTACHMENT_BYTES || totalAttachmentBytes + size > MAX_ARCHIVE_TOTAL_ATTACHMENT_BYTES) {
                  await reader.cancel();
                  throw new Error("Anhang überschreitet das Archivlimit.");
                }
                chunks.push(Buffer.from(value));
              }
              const data = Buffer.concat(chunks);
              totalAttachmentBytes += data.length;
              archived.data = data.toString("base64");
            } catch (error: any) {
              archived.unavailableReason = String(error?.message || "Download fehlgeschlagen.").slice(0, 200);
            }
          }
          attachments.push(archived);
        }

        messages.push({
          authorId: message.author.id,
          authorTag: message.author.tag,
          createdAt: message.createdAt.toISOString(),
          content: message.content,
          pinned: pinnedIds.has(message.id) || message.pinned,
          embeds: message.embeds.map((embed) => embed.toJSON()),
          reactions: message.reactions.cache.map((reaction) => ({
            emoji: reaction.emoji.toString(),
            count: reaction.count || 0,
          })),
          attachments,
        });
      }
      archives.push({ channelId: channel.id, channelName: channel.name, messages });
    }
    return archives;
  }

  /**
   * Erstellt einen vollständigen Server-Snapshot
   */
  public async createBackup(
    guild: Guild,
    creatorTag?: string,
    options: { chatChannelIds?: string[]; messagesPerChannel?: number } = {}
  ): Promise<GuildBackup> {
    this.ensureDir();
    const chatArchive = options.chatChannelIds?.length
      ? await this.captureChatArchive(guild, options.chatChannelIds, options.messagesPerChannel ?? 100)
      : undefined;

    // 1. Rollen sichern
    const roles: BackupRole[] = [];
    const sortedRoles = Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position);

    for (const r of sortedRoles) {
      roles.push({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        managed: r.managed,
        isEveryone: r.id === guild.id,
      });
    }

    // Rollen-Name-Lookup für Permission-Overwrites
    const roleNameMap = new Map<string, string>();
    guild.roles.cache.forEach((r) => roleNameMap.set(r.id, r.name));

    // 2. Kategorien sichern
    const categories: BackupCategory[] = [];
    const categoryChannels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    for (const [, cat] of categoryChannels) {
      const overwrites: BackupOverwrite[] = [];
      cat.permissionOverwrites.cache.forEach((ov) => {
        const isRole = ov.type === OverwriteType.Role;
        overwrites.push({
          targetId: ov.id,
          targetName: isRole ? roleNameMap.get(ov.id) || "@everyone" : ov.id,
          targetType: isRole ? "role" : "member",
          allow: ov.allow.bitfield.toString(),
          deny: ov.deny.bitfield.toString(),
        });
      });

      categories.push({
        id: cat.id,
        name: cat.name,
        position: cat.position,
        overwrites,
      });
    }

    // 3. Kanäle sichern (Text, Voice, Announcement etc.)
    const channels: BackupChannel[] = [];
    const nonCategoryChannels = Array.from(guild.channels.cache.values())
      .filter((c) => !c.isThread() && c.type !== ChannelType.GuildCategory)
      .sort((a, b) => ("rawPosition" in a && "rawPosition" in b ? (a as any).rawPosition - (b as any).rawPosition : 0));

    for (const ch of nonCategoryChannels) {
      const overwrites: BackupOverwrite[] = [];
      if ("permissionOverwrites" in ch) {
        (ch as any).permissionOverwrites.cache.forEach((ov: any) => {
          const isRole = ov.type === OverwriteType.Role;
          overwrites.push({
            targetId: ov.id,
            targetName: isRole ? roleNameMap.get(ov.id) || "@everyone" : ov.id,
            targetType: isRole ? "role" : "member",
            allow: ov.allow.bitfield.toString(),
            deny: ov.deny.bitfield.toString(),
          });
        });
      }

      const parentName = ch.parentId ? guild.channels.cache.get(ch.parentId)?.name : undefined;
      const pos = "position" in ch ? (ch as any).position : 0;

      channels.push({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: pos,
        categoryId: ch.parentId || undefined,
        categoryName: parentName,
        topic: "topic" in ch ? (ch as any).topic : null,
        nsfw: "nsfw" in ch ? (ch as any).nsfw : false,
        bitrate: "bitrate" in ch ? (ch as any).bitrate : undefined,
        userLimit: "userLimit" in ch ? (ch as any).userLimit : undefined,
        rateLimitPerUser: "rateLimitPerUser" in ch ? (ch as any).rateLimitPerUser : undefined,
        overwrites,
      });
    }

    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const backup = sealBackup({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      id: backupId,
      guildId: guild.id,
      guildName: guild.name,
      createdAt: new Date().toISOString(),
      creatorTag: (creatorTag || "System").slice(0, 100),
      summary: {
        roleCount: roles.length,
        categoryCount: categories.length,
        channelCount: channels.length,
        chatChannelCount: chatArchive?.length,
        chatMessageCount: chatArchive?.reduce((count, channel) => count + channel.messages.length, 0),
      },
      roles,
      categories,
      channels,
      botConfig: captureGuildBotSettings(guild.id),
      chatArchive,
    });

    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (Buffer.byteLength(JSON.stringify(backup), "utf8") > MAX_BACKUP_BYTES) {
      throw new Error(`Backup überschreitet das Größenlimit von ${Math.floor(MAX_BACKUP_BYTES / (1024 * 1024))} MB.`);
    }
    writeJsonAtomic(filePath, backup);
    console.log(`[BackupService] Backup ${backupId} erfolgreich erstellt (${roles.length} Rollen, ${channels.length} Kanäle)`);

    // Alte Backups bereinigen (max. 20 pro Guild behalten)
    this.pruneOldBackups(guild.id, 20);

    return backup;
  }

  /**
   * Listet alle vorhandenen Backups für eine Guild auf
   */
  public listBackups(guildId: string): BackupMeta[] {
    this.ensureDir();
    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json"));
    const list: BackupMeta[] = [];

    for (const f of files) {
      try {
        const full = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(full);
        const data = parseBackupDocument(JSON.parse(fs.readFileSync(full, "utf-8")));
        if (data.guildId === guildId) {
          list.push({
            id: data.id,
            guildId: data.guildId,
            guildName: data.guildName,
            createdAt: data.createdAt,
            creatorTag: data.creatorTag,
            summary: data.summary,
            fileSize: stat.size,
          });
        }
      } catch (e) {
        // Ignoriere fehlerhafte Dateien
      }
    }

    // Neueste zuerst
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Lädt ein spezifisches Backup
   */
  public getBackup(backupId: string, expectedGuildId?: string): GuildBackup | null {
    if (!isValidBackupId(backupId)) return null;
    const full = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (!fs.existsSync(full)) return null;
    try {
      const backup = parseBackupDocument(JSON.parse(fs.readFileSync(full, "utf-8")));
      return backup.id === backupId && (!expectedGuildId || backup.guildId === expectedGuildId) ? backup : null;
    } catch {
      return null;
    }
  }

  /**
   * Löscht ein Backup
   */
  public deleteBackup(backupId: string, expectedGuildId?: string): boolean {
    if (!isValidBackupId(backupId)) return false;
    if (expectedGuildId && !this.getBackup(backupId, expectedGuildId)) return false;
    const full = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      return true;
    }
    return false;
  }

  public async previewRestore(
    guild: Guild,
    backupId: string,
    options: { rolesOnly?: boolean; channelsOnly?: boolean; allowCrossServer?: boolean; wipeFirst?: boolean; restoreChatArchive?: boolean; idMappings?: Record<string, string> } = {}
  ): Promise<BackupRestorePreview> {
    const backup = this.getBackup(backupId, guild.id);
    if (!backup) throw new Error(`Backup "${backupId}" nicht gefunden oder beschädigt.`);
    const sourceGuildId = backup.sourceGuildId || backup.guildId;
    if (sourceGuildId !== guild.id && !options.allowCrossServer) {
      throw new Error("Dieses Backup stammt von einem anderen Server. Aktiviere zuerst den Cross-Server-Transfer.");
    }
    if (options.rolesOnly && options.channelsOnly) {
      throw new Error("Es kann nicht gleichzeitig 'Nur Rollen' und 'Nur Kanäle' gewählt werden.");
    }

    await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);

    const crossServer = sourceGuildId !== guild.id;
    const preview: BackupRestorePreview = {
      backupId,
      sourceGuild: backup.guildName,
      targetGuild: guild.name,
      crossServer,
      roles: { create: [], update: [], skip: [] },
      categories: { create: [], update: [] },
      channels: { create: [], update: [] },
      ambiguousMappings: [],
      mappingCandidates: [],
      memberOverwritesToSkip: 0,
      chatArchiveMessages: (backup.chatArchive || []).reduce((count, channel) => count + channel.messages.length, 0),
      warnings: [],
    };

    if (!options.channelsOnly) {
      const duplicateSourceNames = new Set(
        backup.roles
          .filter((role) => !role.isEveryone && !role.managed)
          .map((role) => role.name.toLocaleLowerCase())
          .filter((name, index, names) => names.indexOf(name) !== index)
      );

      for (const role of backup.roles) {
        if (role.managed) {
          preview.roles.skip.push(`${role.name} (verwaltete Rolle)`);
          continue;
        }
        if (role.isEveryone) {
          preview.roles.update.push("@everyone");
          continue;
        }

        const directMatch = !crossServer ? guild.roles.cache.get(role.id) : undefined;
        const matches = directMatch
          ? [directMatch]
          : Array.from(guild.roles.cache.values()).filter((candidate) => candidate.id !== guild.id && !candidate.managed && candidate.name.toLocaleLowerCase() === role.name.toLocaleLowerCase());
        const mapped = options.idMappings?.[role.id] ? guild.roles.cache.get(options.idMappings[role.id]) : undefined;
        if (options.idMappings?.[role.id] && (!mapped || mapped.id === guild.id || mapped.managed)) throw new Error(`Ungültige Zielrolle für "${role.name}".`);

        if (mapped) {
          preview.roles.update.push(role.name);
        } else if (!directMatch && duplicateSourceNames.has(role.name.toLocaleLowerCase())) {
          preview.ambiguousMappings.push(`Rolle "${role.name}": gleicher Name mehrfach im Quell-Backup.`);
          preview.mappingCandidates.push({ sourceId: role.id, sourceName: role.name, kind: "role", candidates: Array.from(guild.roles.cache.values()).filter((candidate) => candidate.id !== guild.id && !candidate.managed).map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length > 1) {
          preview.ambiguousMappings.push(`Rolle "${role.name}": ${matches.length} mögliche Zielrollen.`);
          preview.mappingCandidates.push({ sourceId: role.id, sourceName: role.name, kind: "role", candidates: matches.map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length === 1) {
          preview.roles.update.push(role.name);
        } else {
          preview.roles.create.push(role.name);
        }
      }
    }

    if (!options.rolesOnly) {
      const sourceCategoryNames = backup.categories.map((category) => category.name.toLocaleLowerCase());
      const duplicateSourceCategoryNames = new Set(
        sourceCategoryNames.filter((name, index) => sourceCategoryNames.indexOf(name) !== index)
      );

      for (const category of backup.categories) {
        const directMatch = !crossServer ? guild.channels.cache.get(category.id) : undefined;
        const matches = directMatch?.type === ChannelType.GuildCategory
          ? [directMatch]
          : Array.from(guild.channels.cache.values()).filter((candidate) => candidate.type === ChannelType.GuildCategory && candidate.name.toLocaleLowerCase() === category.name.toLocaleLowerCase());
        const mapped = options.idMappings?.[category.id] ? guild.channels.cache.get(options.idMappings[category.id]) : undefined;
        if (options.idMappings?.[category.id] && mapped?.type !== ChannelType.GuildCategory) throw new Error(`Ungültige Zielkategorie für "${category.name}".`);
        if (mapped) {
          preview.categories.update.push(category.name);
        } else if (!directMatch && duplicateSourceCategoryNames.has(category.name.toLocaleLowerCase())) {
          preview.ambiguousMappings.push(`Kategorie "${category.name}": gleicher Name mehrfach im Quell-Backup.`);
          preview.mappingCandidates.push({ sourceId: category.id, sourceName: category.name, kind: "category", candidates: Array.from(guild.channels.cache.values()).filter((candidate) => candidate.type === ChannelType.GuildCategory).map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length > 1) {
          preview.ambiguousMappings.push(`Kategorie "${category.name}": ${matches.length} mögliche Zielkategorien.`);
          preview.mappingCandidates.push({ sourceId: category.id, sourceName: category.name, kind: "category", candidates: matches.map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length === 1) {
          preview.categories.update.push(category.name);
        } else {
          preview.categories.create.push(category.name);
        }
      }

      const sourceChannelKeys = backup.channels.map((channel) => `${channel.type}:${channel.name.toLocaleLowerCase()}`);
      const duplicateSourceChannelKeys = new Set(
        sourceChannelKeys.filter((key, index) => sourceChannelKeys.indexOf(key) !== index)
      );
      for (const channel of backup.channels) {
        const key = `${channel.type}:${channel.name.toLocaleLowerCase()}`;
        const directMatch = !crossServer ? guild.channels.cache.get(channel.id) : undefined;
        const matches = directMatch?.type === channel.type
          ? [directMatch]
          : Array.from(guild.channels.cache.values()).filter((candidate) => candidate.type === channel.type && candidate.name.toLocaleLowerCase() === channel.name.toLocaleLowerCase());
        const mapped = options.idMappings?.[channel.id] ? guild.channels.cache.get(options.idMappings[channel.id]) : undefined;
        if (options.idMappings?.[channel.id] && mapped?.type !== channel.type) throw new Error(`Ungültiger Zielkanal für "${channel.name}".`);
        if (mapped) {
          preview.channels.update.push(channel.name);
        } else if (!directMatch && duplicateSourceChannelKeys.has(key)) {
          preview.ambiguousMappings.push(`Kanal "${channel.name}": gleicher Name und Typ mehrfach im Quell-Backup.`);
          preview.mappingCandidates.push({ sourceId: channel.id, sourceName: channel.name, kind: "channel", candidates: Array.from(guild.channels.cache.values()).filter((candidate) => candidate.type === channel.type).map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length > 1) {
          preview.ambiguousMappings.push(`Kanal "${channel.name}": ${matches.length} mögliche Zielkanäle.`);
          preview.mappingCandidates.push({ sourceId: channel.id, sourceName: channel.name, kind: "channel", candidates: matches.map((candidate) => ({ id: candidate.id, name: candidate.name })) });
        } else if (matches.length === 1) {
          preview.channels.update.push(channel.name);
        } else {
          preview.channels.create.push(channel.name);
        }
        preview.memberOverwritesToSkip += channel.overwrites.filter((overwrite) => overwrite.targetType === "member").length;
      }
      preview.memberOverwritesToSkip += backup.categories.reduce(
        (count, category) => count + category.overwrites.filter((overwrite) => overwrite.targetType === "member").length,
        0
      );
    }

    if (crossServer) preview.warnings.push("Individuelle Mitglieder-Berechtigungen und Mitglieder-IDs werden nicht auf den Zielserver übertragen.");
    if (preview.chatArchiveMessages > 0) {
      preview.warnings.push(options.restoreChatArchive
        ? "Chat-Archive werden als HTML-Dateien in den zugeordneten Kanälen veröffentlicht. Prüfe die Sichtbarkeit dieser Kanäle."
        : `Dieses Backup enthält ${preview.chatArchiveMessages} archivierte Nachrichten; Chat-Archive werden nicht wiederhergestellt.`);
    }
    if (options.wipeFirst && !options.rolesOnly) preview.warnings.push("Wipe löscht alle bestehenden Kanäle. Vor dem Löschen wird automatisch ein zusätzlicher Snapshot erstellt.");
    if (preview.ambiguousMappings.length) preview.warnings.push("Mehrdeutige Zuordnungen müssen vor dem Restore bereinigt werden.");
    return preview;
  }

  /**
   * Importiert ein externes Backup (z. B. aus einer hochgeladenen JSON-Datei)
   */
  public importBackup(guildId: string, backupData: unknown, creatorTag?: string): GuildBackup {
    this.ensureDir();
    const source = parseBackupDocument(backupData);

    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const imported = sealBackup({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      id: backupId,
      guildId,
      sourceGuildId: source.sourceGuildId || source.guildId,
      guildName: source.guildName ? `Import: ${source.guildName}`.slice(0, 100) : "Importiertes Backup",
      createdAt: new Date().toISOString(),
      creatorTag: (creatorTag || "JSON-Upload").slice(0, 100),
      summary: {
        roleCount: source.roles.length,
        categoryCount: source.categories.length,
        channelCount: source.channels.length,
        chatChannelCount: source.chatArchive?.length,
        chatMessageCount: source.chatArchive?.reduce((count, channel) => count + channel.messages.length, 0),
      },
      roles: source.roles,
      categories: source.categories,
      channels: source.channels,
      botConfig: source.botConfig,
      chatArchive: source.chatArchive,
    });

    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    writeJsonAtomic(filePath, imported);
    console.log(`[BackupService] Backup ${backupId} erfolgreich importiert (${imported.summary.roleCount} Rollen, ${imported.summary.channelCount} Kanäle).`);

    this.pruneOldBackups(guildId, 20);
    return imported;
  }

  public importEncryptedBackup(guildId: string, encryptedFile: Buffer, secret: string, creatorTag?: string): GuildBackup {
    const previousKeys = (process.env.BACKUP_PREVIOUS_ENCRYPTION_KEYS || "")
      .split(";")
      .map((key) => key.trim())
      .filter(Boolean);
    const backupData = decryptBackupFile(encryptedFile, [secret, ...previousKeys]);
    return this.importBackup(guildId, backupData, creatorTag || "Verschlüsselter Import");
  }

  /**
   * Stellt Rollen, Kategorien und Kanäle aus einem Snapshot wieder her
   */
  public async restoreBackup(
    guild: Guild,
    backupId: string,
    options: {
      rolesOnly?: boolean;
      channelsOnly?: boolean;
      allowCrossServer?: boolean;
      stripMemberOverwrites?: boolean;
      preserveOwnerRank?: boolean;
      wipeFirst?: boolean;
      restoreChatArchive?: boolean;
      idMappings?: Record<string, string>;
    } = {}
  ): Promise<{
    rolesCreated: number;
    rolesUpdated: number;
    categoriesCreated: number;
    channelsCreated: number;
    preRestoreBackupId?: string;
    chatArchivesRestored: number;
    errors: string[];
  }> {
    const backup = this.getBackup(backupId, guild.id);
    if (!backup) throw new Error(`Backup "${backupId}" nicht gefunden.`);
    const sourceGuildId = backup.sourceGuildId || backup.guildId;
    if (sourceGuildId !== guild.id && !options.allowCrossServer) {
      throw new Error(
        `Dieses Backup stammt von einem anderen Server ("${backup.guildName}"). Aktiviere die Option 'Server-Übertragung (Cross-Server)', um es auf ${guild.name} zu übertragen.`
      );
    }
    const crossServer = sourceGuildId !== guild.id;
    const preview = await this.previewRestore(guild, backupId, options);
    if (preview.ambiguousMappings.length > 0) {
      throw new Error(`Mehrdeutige Zuordnungen verhindern den Restore: ${preview.ambiguousMappings.slice(0, 5).join("; ")}`);
    }

    const result = {
      rolesCreated: 0,
      rolesUpdated: 0,
      categoriesCreated: 0,
      channelsCreated: 0,
      preRestoreBackupId: undefined as string | undefined,
      chatArchivesRestored: 0,
      errors: [] as string[],
    };
    const entityIdMap = new Map<string, string>();

    // Wipe bestehende Kanäle falls gewünscht
    if (options.wipeFirst && !options.rolesOnly) {
      const safetyBackup = await this.createBackup(guild, `Vor Restore ${backup.id}`);
      result.preRestoreBackupId = safetyBackup.id;
      try {
        await guild.channels.fetch();
        for (const channel of guild.channels.cache.values()) {
          try {
            await channel.delete(`Backup-Wipe vor Wiederherstellung (${backup.id})`);
          } catch (e: any) {
            console.warn(`[BackupService] Konnte Kanal ${channel.name} nicht löschen:`, e.message);
          }
        }
      } catch (e: any) {
        throw new Error(`Wipe abgebrochen; Vorher-Snapshot ${safetyBackup.id} wurde erstellt: ${e.message}`);
      }
    }

    const roleMap = new Map<string, Role>(); // Quell-Rollen-ID -> Zielrolle

    // --- 1. ROLLEN WIEDERHERSTELLEN ---
    if (!options.channelsOnly) {
      // Umgekehrt sortiert (höchste zuerst oder normale zuerst)
      for (const rData of backup.roles) {
        if (rData.isEveryone) {
          // @everyone Berechtigungen aktualisieren
          try {
            await guild.roles.everyone.setPermissions(BigInt(rData.permissions));
          } catch (e: any) {
            result.errors.push(`@everyone Update fehlgeschlagen: ${e.message}`);
          }
          roleMap.set(rData.id, guild.roles.everyone);
          entityIdMap.set(rData.id, guild.id);
          continue;
        }

        if (rData.managed) continue; // Bot-Rollen überspringen

        const manualMatch = options.idMappings?.[rData.id] ? guild.roles.cache.get(options.idMappings[rData.id]) : undefined;
        const directMatch = !crossServer ? guild.roles.cache.get(rData.id) : undefined;
        const matches = manualMatch
          ? [manualMatch]
          : directMatch
            ? [directMatch]
          : Array.from(guild.roles.cache.values()).filter((candidate) => candidate.id !== guild.id && !candidate.managed && candidate.name.toLocaleLowerCase() === rData.name.toLocaleLowerCase());
        const existing = matches[0];
        if (existing) {
          try {
            await existing.edit({
              color: rData.color,
              hoist: rData.hoist,
              mentionable: rData.mentionable,
              permissions: BigInt(rData.permissions),
            });
            result.rolesUpdated++;
          } catch (e: any) {
            result.errors.push(`Rolle ${rData.name} Update: ${e.message}`);
          }
          roleMap.set(rData.id, existing);
          entityIdMap.set(rData.id, existing.id);
        } else {
          try {
            const created = await guild.roles.create({
              name: rData.name,
              color: rData.color,
              hoist: rData.hoist,
              mentionable: rData.mentionable,
              permissions: BigInt(rData.permissions),
              reason: `Wiederhergestellt aus Backup ${backup.id}`,
            });
            roleMap.set(rData.id, created);
            entityIdMap.set(rData.id, created.id);
            result.rolesCreated++;
          } catch (e: any) {
            result.errors.push(`Rolle ${rData.name} Erstellung: ${e.message}`);
          }
        }
      }
    } else {
      for (const roleData of backup.roles) {
        const role = (options.idMappings?.[roleData.id] ? guild.roles.cache.get(options.idMappings[roleData.id]) : undefined) || (!crossServer
          ? guild.roles.cache.get(roleData.id)
          : guild.roles.cache.find((candidate) => !candidate.managed && candidate.name.toLocaleLowerCase() === roleData.name.toLocaleLowerCase()));
        if (role) {
          roleMap.set(roleData.id, role);
          entityIdMap.set(roleData.id, role.id);
        }
      }
      roleMap.set(backup.guildId, guild.roles.everyone);
      entityIdMap.set(backup.guildId, guild.id);
    }

    // --- 2. KATEGORIEN WIEDERHERSTELLEN ---
    const categoryMap = new Map<string, CategoryChannel>(); // Quell-Kategorie-ID -> Zielkategorie
    const categoryNameMap = new Map<string, CategoryChannel>();

    if (!options.rolesOnly) {
      for (const catData of backup.categories) {
        const manualMatch = options.idMappings?.[catData.id] ? guild.channels.cache.get(options.idMappings[catData.id]) : undefined;
        const directMatch = !crossServer ? guild.channels.cache.get(catData.id) : undefined;
        const matches = manualMatch?.type === ChannelType.GuildCategory
          ? [manualMatch as CategoryChannel]
          : directMatch?.type === ChannelType.GuildCategory
            ? [directMatch as CategoryChannel]
          : Array.from(guild.channels.cache.values()).filter((candidate): candidate is CategoryChannel =>
              candidate.type === ChannelType.GuildCategory && candidate.name.toLocaleLowerCase() === catData.name.toLocaleLowerCase()
            );
        let cat = matches[0];
        if (!cat) {
          try {
            cat = await guild.channels.create({
              name: catData.name,
              type: ChannelType.GuildCategory,
              position: catData.position,
              reason: `Wiederhergestellt aus Backup ${backup.id}`,
            });
            result.categoriesCreated++;
          } catch (e: any) {
            result.errors.push(`Kategorie ${catData.name}: ${e.message}`);
            continue;
          }
        }
        categoryMap.set(catData.id, cat);
        categoryNameMap.set(catData.name.toLocaleLowerCase(), cat);
        entityIdMap.set(catData.id, cat.id);

        // Overwrites anwenden
        for (const ov of catData.overwrites) {
          if (ov.targetType === "member" && (crossServer || options.stripMemberOverwrites !== false)) {
            // Mitglieder-Berechtigungen vom vorherigen Server überspringen
            continue;
          }
          if (ov.targetType === "role") {
            const targetRole = roleMap.get(ov.targetId);
            if (targetRole) {
              try {
                await cat.permissionOverwrites.edit(targetRole, {
                  ...new PermissionsBitField(BigInt(ov.allow)).serialize(),
                  ...Object.fromEntries(
                    Object.entries(new PermissionsBitField(BigInt(ov.deny)).serialize())
                      .filter(([, v]) => v)
                      .map(([k]) => [k, false])
                  ),
                });
              } catch (e) {}
            }
          }
        }
      }

      // --- 3. KANÄLE WIEDERHERSTELLEN ---
      for (const chData of backup.channels) {
        const manualMatch = options.idMappings?.[chData.id] ? guild.channels.cache.get(options.idMappings[chData.id]) : undefined;
        const directMatch = !crossServer ? guild.channels.cache.get(chData.id) : undefined;
        const matches = manualMatch?.type === chData.type
          ? [manualMatch as GuildChannel]
          : directMatch?.type === chData.type
            ? [directMatch as GuildChannel]
          : Array.from(guild.channels.cache.values()).filter((candidate) =>
              candidate.type === chData.type && candidate.name.toLocaleLowerCase() === chData.name.toLocaleLowerCase()
            );
        let ch = matches[0] as GuildChannel | undefined;

        const parentCategory = chData.categoryId
          ? categoryMap.get(chData.categoryId)
          : chData.categoryName
            ? categoryNameMap.get(chData.categoryName.toLocaleLowerCase())
            : undefined;

        if (!ch) {
          try {
            ch = (await guild.channels.create({
              name: chData.name,
              type: chData.type as any,
              parent: parentCategory?.id,
              topic: chData.topic || undefined,
              nsfw: chData.nsfw || undefined,
              bitrate: chData.bitrate || undefined,
              userLimit: chData.userLimit || undefined,
              rateLimitPerUser: chData.rateLimitPerUser || undefined,
              reason: `Wiederhergestellt aus Backup ${backup.id}`,
            })) as GuildChannel;
            result.channelsCreated++;
          } catch (e: any) {
            result.errors.push(`Kanal #${chData.name}: ${e.message}`);
            continue;
          }
        }
        if (ch) entityIdMap.set(chData.id, ch.id);

        // Overwrites anwenden
        if (ch && "permissionOverwrites" in ch) {
          for (const ov of chData.overwrites) {
            if (ov.targetType === "member" && (crossServer || options.stripMemberOverwrites !== false)) {
              // Mitglieder-Berechtigungen vom vorherigen Server überspringen
              continue;
            }
            if (ov.targetType === "role") {
              const targetRole = roleMap.get(ov.targetId);
              if (targetRole) {
                try {
                  await (ch as any).permissionOverwrites.edit(targetRole, {
                    ...new PermissionsBitField(BigInt(ov.allow)).serialize(),
                    ...Object.fromEntries(
                      Object.entries(new PermissionsBitField(BigInt(ov.deny)).serialize())
                        .filter(([, v]) => v)
                        .map(([k]) => [k, false])
                    ),
                  });
                } catch (e) {}
              }
            }
          }
        }
      }
    }

    if (backup.botConfig && !options.rolesOnly && !options.channelsOnly) {
      try {
        restoreGuildBotSettings(guild.id, backup.botConfig, entityIdMap, crossServer);
      } catch (e: any) {
        result.errors.push(`Bot-Konfiguration konnte nicht wiederhergestellt werden: ${e.message || e}`);
      }
    }

    if (options.restoreChatArchive && backup.chatArchive?.length && !options.rolesOnly && !options.channelsOnly) {
      for (const archive of backup.chatArchive) {
        const targetId = entityIdMap.get(archive.channelId);
        const target = targetId ? guild.channels.cache.get(targetId) : undefined;
        if (!target?.isTextBased() || !("send" in target)) {
          result.errors.push(`Archiv #${archive.channelName}: kein zugeordneter Textkanal auf dem Zielserver.`);
          continue;
        }
        try {
          const safeName = archive.channelName.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "channel";
          const html = renderChatArchive(archive);
          await (target as any).send({
            content: `📦 Archivkopie von #${archive.channelName} (${archive.messages.length} Nachrichten). Inhalte stammen nicht erneut von den ursprünglichen Autoren.`,
            files: [new AttachmentBuilder(Buffer.from(html, "utf8"), { name: `archiv-${safeName}.html` })],
            allowedMentions: { parse: [] },
          });
          result.chatArchivesRestored++;
        } catch (e: any) {
          result.errors.push(`Archiv #${archive.channelName}: ${e.message || e}`);
        }
      }
    }

    // --- 4. OWNER-RANG SICHERN ("Owner bleibt höchster Rang") ---
    if (options.preserveOwnerRank !== false) {
      try {
        const ownerMember = await guild.members.fetch(guild.ownerId).catch(() => null);
        if (ownerMember) {
          // Finde die oberste Admin- oder Leitungs-Rolle aus dem Backup
          const topAdminRoleDef =
            backup.roles.find(
              (r) => !r.isEveryone && !r.managed && (BigInt(r.permissions) & PermissionFlagsBits.Administrator) !== BigInt(0)
            ) || backup.roles.find((r) => !r.isEveryone && !r.managed);

          if (topAdminRoleDef) {
            const topRole = roleMap.get(topAdminRoleDef.id);
            if (topRole && !ownerMember.roles.cache.has(topRole.id)) {
              const botTop = guild.members.me?.roles.highest.position ?? 0;
              if (topRole.position < botTop) {
                await ownerMember.roles.add(topRole, `Backup-Restore: Inhaber-Rang abgesichert (${backup.id})`);
                console.log(`[BackupService] Oberste Rolle @${topRole.name} dem Server-Inhaber (${ownerMember.user.tag}) zugewiesen.`);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("[BackupService] Konnte Owner-Rang nicht absichern:", err?.message || err);
      }
    }

    // Das Wiederherstellen setzt @everyone-Rechte zurück -> aktive Regel-Sperre danach erneut anwenden
    try {
      const { rolePanelService } = await import("./rolePanelService");
      if (rolePanelService.getConfig(guild.id)?.serverLocked) {
        const { rulesService } = await import("./rulesService");
        await rulesService.lockServer(guild);
        console.log(`[Backup] Regel-Sperre nach Wiederherstellung erneut aktiviert (${guild.name}).`);
      }
    } catch (e: any) {
      result.errors.push(`Regel-Sperre konnte nicht erneut aktiviert werden: ${e?.message || e}`);
    }

    return result;
  }

  /**
   * Automatischer täglicher Backup-Scheduler
   */
  public startAutoBackupSchedule(client: Client) {
    if (this.autoBackupInterval) return;

    console.log("⏰ [BackupService] Automatischer Snapshot-Scheduler gestartet (alle 24 Stunden).");
    if (!process.env.BACKUP_ENCRYPTION_KEY || (!process.env.BACKUP_DISCORD_CHANNELS && !process.env.BACKUP_S3_BUCKET)) {
      console.warn("[BackupService] Externer Export deaktiviert: BACKUP_ENCRYPTION_KEY und mindestens ein Exportziel konfigurieren.");
    }

    const runAutoBackup = async (guilds = Array.from(client.guilds.cache.values())) => {
      console.log("📸 [BackupService] Führe automatischen Server-Snapshot durch...");
      for (const guild of guilds) {
        try {
          const backup = await this.createBackup(guild, "Auto-Scheduler (Täglich)");
          if (process.env.BACKUP_ENCRYPTION_KEY && (process.env.BACKUP_DISCORD_CHANNELS || process.env.BACKUP_S3_BUCKET)) {
            const encrypted = encryptBackupFile(backup, process.env.BACKUP_ENCRYPTION_KEY);
            if (process.env.BACKUP_DISCORD_CHANNELS) {
              try {
                await this.exportEncryptedBackupToDiscord(client, guild, backup, encrypted);
              } catch (err: any) {
                console.error(`[BackupService] Discord-Export für ${guild.name} fehlgeschlagen:`, err.message);
              }
            }
            if (process.env.BACKUP_S3_BUCKET) {
              try {
                await this.exportEncryptedBackupToS3(guild, backup, encrypted);
              } catch (err: any) {
                console.error(`[BackupService] S3-Export für ${guild.name} fehlgeschlagen:`, err.message);
              }
            }
          }
        } catch (err: any) {
          console.error(`[BackupService] Fehler beim Auto-Backup für ${guild.name}:`, err.message);
        }
      }
    };

    // Nach 1 Minute ersten Check machen (falls noch kein Backup heute existiert)
    setTimeout(async () => {
      const missingBackups = [];
      for (const [, guild] of client.guilds.cache) {
        const list = this.listBackups(guild.id);
        const today = new Date().toISOString().slice(0, 10);
        const hasBackupToday = list.some((b) => b.createdAt.startsWith(today));
        if (!hasBackupToday) missingBackups.push(guild);
      }
      if (missingBackups.length) await runAutoBackup(missingBackups);
    }, 60 * 1000);

    // Alle 24 Stunden ausführen
    this.autoBackupInterval = setInterval(runAutoBackup, 24 * 60 * 60 * 1000);
  }

  private async exportEncryptedBackupToDiscord(client: Client, guild: Guild, backup: GuildBackup, encrypted: Buffer) {
    const channelEntry = (process.env.BACKUP_DISCORD_CHANNELS || "")
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .map((entry) => entry.split("="))
      .find(([guildId, channelId]) => guildId === guild.id && !!channelId);
    const channelId = channelEntry?.[1]?.trim();
    const secret = process.env.BACKUP_ENCRYPTION_KEY || "";
    if (!channelId) throw new Error(`Kein Exportkanal für Server ${guild.id} konfiguriert.`);

    const target = await client.channels.fetch(channelId);
    if (!target || !target.isTextBased() || !("send" in target) || !("guildId" in target) || target.guildId !== guild.id) {
      throw new Error("Der konfigurierte Exportkanal ist kein Textkanal dieses Servers.");
    }

    if (secret.length < 32) throw new Error("BACKUP_ENCRYPTION_KEY muss mindestens 32 Zeichen lang sein.");
    if (encrypted.length > MAX_DISCORD_EXPORT_BYTES) {
      throw new Error("Verschlüsseltes Backup ist größer als das Discord-Uploadlimit von 10 MB.");
    }
    const file = new AttachmentBuilder(encrypted, { name: `${backup.id}.glgbak` });
    const message = `🔐 Verschlüsselter Notfall-Snapshot für **${guild.name}**\nBackup-ID: \`${backup.id}\`\nErstellt: ${backup.createdAt}`;
    await (target as any).send({ content: message, files: [file], allowedMentions: { parse: [] } });
    try {
      await this.pruneDiscordExports(target, client.user?.id);
    } catch (err: any) {
      console.warn(`[BackupService] Discord-Aufbewahrung für ${guild.name} konnte nicht angewendet werden:`, err?.message || err);
    }

    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      try {
        await owner.send({
          content: `🔐 Der verschlüsselte Snapshot für **${guild.name}** wurde erstellt. Backup-ID: \`${backup.id}\``,
          files: [new AttachmentBuilder(encrypted, { name: `${backup.id}.glgbak` })],
        });
      } catch (err: any) {
        console.warn(`[BackupService] Snapshot ${backup.id} wurde hochgeladen, aber die DM an den Server-Inhaber schlug fehl:`, err?.message || err);
      }
    }
  }

  private externalRetentionCutoff(): number {
    const raw = process.env.BACKUP_EXTERNAL_RETENTION_DAYS || "90";
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new Error("BACKUP_EXTERNAL_RETENTION_DAYS muss zwischen 1 und 3.650 liegen.");
    }
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  private async pruneDiscordExports(channel: any, botUserId?: string) {
    if (!botUserId || !channel.messages?.fetch) return;
    const cutoff = this.externalRetentionCutoff();
    let before: string | undefined;
    for (let page = 0; page < 10; page++) {
      const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
      const messages = Array.from(batch.values()) as unknown as Message<true>[];
      if (messages.length === 0) break;
      for (const message of messages) {
        if (message.author.id !== botUserId || message.pinned || !message.attachments.some((file: any) => file.name?.endsWith(".glgbak"))) continue;
        const createdMatch = message.content.match(/Erstellt:\s*([^\s]+)/);
        const createdAt = createdMatch ? Date.parse(createdMatch[1]) : message.createdTimestamp;
        if (Number.isFinite(createdAt) && createdAt < cutoff) {
          await message.delete().catch((error: any) => console.warn("[BackupService] Alter Discord-Export konnte nicht gelöscht werden:", error?.message || error));
        }
      }
      if (messages.length < 100) break;
      before = messages[messages.length - 1]?.id;
      if (!before) break;
    }
  }

  private async exportEncryptedBackupToS3(guild: Guild, backup: GuildBackup, encrypted: Buffer) {
    const bucket = process.env.BACKUP_S3_BUCKET || "";
    const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY || "";
    const endpoint = process.env.BACKUP_S3_ENDPOINT || undefined;
    if (!bucket) throw new Error("BACKUP_S3_BUCKET ist nicht konfiguriert.");
    if (!!accessKeyId !== !!secretAccessKey) throw new Error("BACKUP_S3_ACCESS_KEY_ID und BACKUP_S3_SECRET_ACCESS_KEY müssen gemeinsam gesetzt sein.");
    if (endpoint && !/^https?:\/\//i.test(endpoint)) throw new Error("BACKUP_S3_ENDPOINT muss eine HTTP(S)-URL sein.");
    if (encrypted.length > MAX_BACKUP_BYTES) throw new Error("Verschlüsseltes Backup überschreitet das S3-Exportlimit.");

    const client = new S3Client({
      region: process.env.BACKUP_S3_REGION || "us-east-1",
      endpoint,
      forcePathStyle: !!endpoint,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
    try {
      const date = backup.createdAt.slice(0, 10);
      const key = `${guild.id}/${date}/${backup.id}.glgbak`;
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
        ServerSideEncryption: "AES256",
        Metadata: { "backup-id": backup.id, "guild-id": guild.id },
      }));
      try {
        await this.pruneS3Exports(client, bucket, guild.id);
      } catch (err: any) {
        console.warn(`[BackupService] S3-Aufbewahrung für ${guild.name} konnte nicht angewendet werden:`, err?.message || err);
      }
      const owner = await guild.fetchOwner().catch(() => null);
      if (owner) {
        await owner.send(`🔐 Verschlüsselter Snapshot für **${guild.name}** wurde im externen Backup-Speicher abgelegt. Backup-ID: \`${backup.id}\``)
          .catch((error) => console.warn(`[BackupService] DM zur S3-Sicherung ${backup.id} fehlgeschlagen:`, error?.message || error));
      }
    } finally {
      client.destroy();
    }
  }

  private async pruneS3Exports(client: S3Client, bucket: string, guildId: string) {
    const cutoff = this.externalRetentionCutoff();
    let continuationToken: string | undefined;
    do {
      const page = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${guildId}/`,
        ContinuationToken: continuationToken,
      }));
      const expired = (page.Contents || [])
        .filter((item) => item.Key?.endsWith(".glgbak") && item.LastModified && item.LastModified.getTime() < cutoff)
        .map((item) => ({ Key: item.Key! }));
      for (let index = 0; index < expired.length; index += 1000) {
        await client.send(new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: expired.slice(index, index + 1000), Quiet: true },
        }));
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  private pruneOldBackups(guildId: string, maxRetention: number = 20) {
    const backups = this.listBackups(guildId);
    if (backups.length > maxRetention) {
      const toDelete = backups.slice(maxRetention);
      for (const b of toDelete) {
        this.deleteBackup(b.id);
      }
      console.log(`[BackupService] ${toDelete.length} alte Backups bereinigt.`);
    }
  }
}

export const backupService = new BackupService();
