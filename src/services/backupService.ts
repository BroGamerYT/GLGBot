import fs from "fs";
import path from "path";
import crypto from "crypto";
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
} from "discord.js";

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
  categoryName?: string;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  rateLimitPerUser?: number;
  overwrites: BackupOverwrite[];
}

export interface GuildBackup {
  id: string;
  guildId: string;
  guildName: string;
  createdAt: string;
  creatorTag?: string;
  summary: {
    roleCount: number;
    categoryCount: number;
    channelCount: number;
  };
  roles: BackupRole[];
  categories: BackupCategory[];
  channels: BackupChannel[];
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
  };
  fileSize: number;
}

const BACKUPS_DIR = path.join(__dirname, "../../data/backups");
// Nur echte Backup-IDs erlauben (verhindert z. B. "../role_panel_config" -> fremde Dateien lesen/löschen)
const isValidBackupId = (id: string) => /^backup_\d+_[a-f0-9]+$/.test(String(id));

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

  /**
   * Erstellt einen vollständigen Server-Snapshot
   */
  public async createBackup(guild: Guild, creatorTag?: string): Promise<GuildBackup> {
    this.ensureDir();

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
    const backup: GuildBackup = {
      id: backupId,
      guildId: guild.id,
      guildName: guild.name,
      createdAt: new Date().toISOString(),
      creatorTag: creatorTag || "System",
      summary: {
        roleCount: roles.length,
        categoryCount: categories.length,
        channelCount: channels.length,
      },
      roles,
      categories,
      channels,
    };

    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf-8");
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
        const data: GuildBackup = JSON.parse(fs.readFileSync(full, "utf-8"));
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
  public getBackup(backupId: string): GuildBackup | null {
    if (!isValidBackupId(backupId)) return null;
    const full = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (!fs.existsSync(full)) return null;
    try {
      return JSON.parse(fs.readFileSync(full, "utf-8"));
    } catch {
      return null;
    }
  }

  /**
   * Löscht ein Backup
   */
  public deleteBackup(backupId: string): boolean {
    if (!isValidBackupId(backupId)) return false;
    const full = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      return true;
    }
    return false;
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
    } = {}
  ): Promise<{
    rolesCreated: number;
    rolesUpdated: number;
    categoriesCreated: number;
    channelsCreated: number;
    errors: string[];
  }> {
    const backup = this.getBackup(backupId);
    if (!backup) throw new Error(`Backup "${backupId}" nicht gefunden.`);
    if (backup.guildId !== guild.id) throw new Error("Dieses Backup gehört zu einem anderen Server.");

    const result = {
      rolesCreated: 0,
      rolesUpdated: 0,
      categoriesCreated: 0,
      channelsCreated: 0,
      errors: [] as string[],
    };

    const roleMap = new Map<string, Role>(); // Name -> Rolle

    // --- 1. ROLLEN WIEDERHERSTELLEN ---
    if (!options.channelsOnly) {
      const existingRoles = Array.from(guild.roles.cache.values());
      existingRoles.forEach((r) => roleMap.set(r.name.toLowerCase(), r));

      // Umgekehrt sortiert (höchste zuerst oder normale zuerst)
      for (const rData of backup.roles) {
        if (rData.isEveryone) {
          // @everyone Berechtigungen aktualisieren
          try {
            await guild.roles.everyone.setPermissions(BigInt(rData.permissions));
          } catch (e: any) {
            result.errors.push(`@everyone Update fehlgeschlagen: ${e.message}`);
          }
          roleMap.set("@everyone", guild.roles.everyone);
          continue;
        }

        if (rData.managed) continue; // Bot-Rollen überspringen

        const existing = roleMap.get(rData.name.toLowerCase());
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
          roleMap.set(rData.name.toLowerCase(), existing);
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
            roleMap.set(rData.name.toLowerCase(), created);
            result.rolesCreated++;
          } catch (e: any) {
            result.errors.push(`Rolle ${rData.name} Erstellung: ${e.message}`);
          }
        }
      }
    } else {
      guild.roles.cache.forEach((r) => roleMap.set(r.name.toLowerCase(), r));
      roleMap.set("@everyone", guild.roles.everyone);
    }

    // --- 2. KATEGORIEN WIEDERHERSTELLEN ---
    const categoryMap = new Map<string, CategoryChannel>(); // Name -> CategoryChannel

    if (!options.rolesOnly) {
      guild.channels.cache.forEach((c) => {
        if (c.type === ChannelType.GuildCategory) {
          categoryMap.set(c.name.toLowerCase(), c as CategoryChannel);
        }
      });

      for (const catData of backup.categories) {
        let cat = categoryMap.get(catData.name.toLowerCase());
        if (!cat) {
          try {
            cat = await guild.channels.create({
              name: catData.name,
              type: ChannelType.GuildCategory,
              position: catData.position,
              reason: `Wiederhergestellt aus Backup ${backup.id}`,
            });
            categoryMap.set(catData.name.toLowerCase(), cat);
            result.categoriesCreated++;
          } catch (e: any) {
            result.errors.push(`Kategorie ${catData.name}: ${e.message}`);
            continue;
          }
        }

        // Overwrites anwenden
        for (const ov of catData.overwrites) {
          if (ov.targetType === "role") {
            const targetRole = ov.targetName === "@everyone" 
              ? guild.roles.everyone 
              : roleMap.get(ov.targetName.toLowerCase());
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
      const existingChannels = new Map<string, GuildChannel>();
      guild.channels.cache.forEach((c) => existingChannels.set(`${c.name.toLowerCase()}_${c.type}`, c as GuildChannel));

      for (const chData of backup.channels) {
        const key = `${chData.name.toLowerCase()}_${chData.type}`;
        let ch = existingChannels.get(key);

        const parentCategory = chData.categoryName ? categoryMap.get(chData.categoryName.toLowerCase()) : undefined;

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

        // Overwrites anwenden
        if (ch && "permissionOverwrites" in ch) {
          for (const ov of chData.overwrites) {
            if (ov.targetType === "role") {
              const targetRole = ov.targetName === "@everyone" 
                ? guild.roles.everyone 
                : roleMap.get(ov.targetName.toLowerCase());
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

    const runAutoBackup = async () => {
      console.log("📸 [BackupService] Führe automatischen Server-Snapshot durch...");
      for (const [, guild] of client.guilds.cache) {
        try {
          await this.createBackup(guild, "Auto-Scheduler (Täglich)");
        } catch (err: any) {
          console.error(`[BackupService] Fehler beim Auto-Backup für ${guild.name}:`, err.message);
        }
      }
    };

    // Nach 1 Minute ersten Check machen (falls noch kein Backup heute existiert)
    setTimeout(async () => {
      for (const [, guild] of client.guilds.cache) {
        const list = this.listBackups(guild.id);
        const today = new Date().toISOString().slice(0, 10);
        const hasBackupToday = list.some((b) => b.createdAt.startsWith(today));
        if (!hasBackupToday) {
          await runAutoBackup();
          break;
        }
      }
    }, 60 * 1000);

    // Alle 24 Stunden ausführen
    this.autoBackupInterval = setInterval(runAutoBackup, 24 * 60 * 60 * 1000);
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
