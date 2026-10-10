import fs from "fs";
import path from "path";
import {
  Guild,
  GuildMember,
  Role,
  TextChannel,
  ChannelType,
  PermissionsBitField,
  User,
  Client,
  EmbedBuilder,
} from "discord.js";
import { moderationService } from "./moderationService";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";

export interface PrisonEntry {
  userId: string;
  guildId: string;
  tag: string;
  nickname?: string;
  avatar?: string;
  reason: string;
  imprisonedAt: string;
  imprisonedBy: string;
  imprisonedById: string;
  previousRoleIds: string[];
}

interface PrisonStorage {
  [guildId: string]: Record<string, PrisonEntry>;
}

const DATA_DIR = path.join(__dirname, "../../data");
const PRISON_FILE = path.join(DATA_DIR, "prison.json");

class PrisonService {
  private prisoners: PrisonStorage = {};

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
      if (fs.existsSync(PRISON_FILE)) {
        this.prisoners = readJsonFile(PRISON_FILE, this.prisoners);
      }
    } catch (e) {
      console.error("[PrisonService] Fehler beim Laden der Gefängnis-Daten:", e);
      this.prisoners = {};
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(PRISON_FILE, this.prisoners);
    } catch (e) {
      console.error("[PrisonService] Fehler beim Speichern der Gefängnis-Daten:", e);
    }
  }

  public async ensurePrisonRole(guild: Guild): Promise<Role> {
    const existing = guild.roles.cache.find((r) => r.name === "🔒・Gefängnis" || r.name === "Gefängnis");
    if (existing) return existing;

    return await guild.roles.create({
      name: "🔒・Gefängnis",
      color: 0xed4245,
      hoist: true,
      mentionable: false,
      reason: "Automatisches Anlegen der Gefängnis-Rolle für Moderationssystem",
    });
  }

  public async ensurePrisonChannel(guild: Guild, prisonRole: Role): Promise<TextChannel> {
    const existing = guild.channels.cache.find(
      (c) => (c.name === "🔒・gefängnis" || c.name === "gefängnis") && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (existing) return existing;

    return await guild.channels.create({
      name: "🔒・gefängnis",
      type: ChannelType.GuildText,
      topic: "Isolierter Gefängnis-Kanal für inhaftierte Mitglieder.",
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: prisonRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me?.id || "",
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
      reason: "Automatisches Anlegen des Gefängnis-Kanals",
    });
  }

  /**
   * Sperrt alle Kategorien und eigenständigen Kanäle für die Gefängnis-Rolle (außer dem Gefängnis-Kanal).
   * Kanäle, die mit ihrer Kategorie synchronisiert sind, erben die Sperre automatisch.
   * Wird bei jeder Inhaftierung ausgeführt, damit auch neu erstellte Kanäle gesperrt werden.
   */
  public async applyPrisonLockdown(guild: Guild, prisonRole: Role, prisonChannelId: string) {
    const DENY = {
      ViewChannel: false,
      SendMessages: false,
      SendMessagesInThreads: false,
      AddReactions: false,
      Connect: false,
      Speak: false,
    };
    for (const ch of guild.channels.cache.values()) {
      if (ch.id === prisonChannelId || ch.isThread() || !("permissionOverwrites" in ch)) continue;
      const isCategory = ch.type === ChannelType.GuildCategory;
      const synced = !isCategory && ch.parent && (ch as any).permissionsLocked;
      if (synced) continue; // erbt von der Kategorie
      const existing = ch.permissionOverwrites.cache.get(prisonRole.id);
      if (existing && existing.deny.has(PermissionsBitField.Flags.ViewChannel)) continue;
      await ch.permissionOverwrites.edit(prisonRole, DENY, { reason: "Gefängnis: Kanal für Inhaftierte sperren" }).catch(() => null);
    }
  }

  public isImprisoned(guildId: string, userId: string): boolean {
    return Boolean(this.prisoners[guildId]?.[userId]);
  }

  public getPrisonEntry(guildId: string, userId: string): PrisonEntry | undefined {
    return this.prisoners[guildId]?.[userId];
  }

  public getPrisonList(guildId: string): PrisonEntry[] {
    const guildData = this.prisoners[guildId] || {};
    return Object.values(guildData).sort(
      (a, b) => new Date(b.imprisonedAt).getTime() - new Date(a.imprisonedAt).getTime()
    );
  }

  public async imprison(
    guild: Guild,
    member: GuildMember,
    reason: string,
    moderator: { id: string; tag: string; avatar?: string },
    client?: Client
  ): Promise<{ ok: boolean; error?: string; xpPenalty: number }> {
    if (this.isImprisoned(guild.id, member.id)) {
      return { ok: false, error: "Mitglied ist bereits im Gefängnis.", xpPenalty: 0 };
    }

    try {
      const prisonRole = await this.ensurePrisonRole(guild);
      const prisonChannel = await this.ensurePrisonChannel(guild, prisonRole);

      // Speichere die aktuellen Rollen (außer @everyone, Bot-Rollen und Rollen ÜBER dem Bot -
      // die kann der Bot nicht entfernen, sonst schlägt das ganze Rollen-Update fehl)
      const rolesToRemove = member.roles.cache.filter(
        (r) => !r.managed && r.id !== guild.roles.everyone.id && r.id !== prisonRole.id && r.editable
      );
      const previousRoleIds = rolesToRemove.map((r) => r.id);

      // Rollen entfernen & Gefängnis-Rolle zuweisen
      try {
        if (rolesToRemove.size > 0) {
          await member.roles.remove(rolesToRemove, `Inhaftiert: ${reason}`);
        }
        await member.roles.add(prisonRole, `Inhaftiert: ${reason}`);
      } catch (e: any) {
        console.error("[PrisonService] Fehler beim Rollen-Update:", e);
        return {
          ok: false,
          error: "Die Rollen konnten nicht geändert werden. Die Bot-Rolle muss in den Server-Einstellungen über allen Rollen des Mitglieds und über der Gefängnis-Rolle stehen.",
          xpPenalty: 0,
        };
      }

      // Alle anderen Kanäle für die Gefängnis-Rolle sperren & aus dem Voice werfen
      await this.applyPrisonLockdown(guild, prisonRole, prisonChannel.id).catch((e) =>
        console.error("[PrisonService] Sperre der Kanäle fehlgeschlagen:", e)
      );
      if (member.voice.channel) {
        await member.voice.disconnect(`Inhaftiert: ${reason}`).catch(() => null);
      }

      // Speichere Gefängnis-Eintrag
      if (!this.prisoners[guild.id]) {
        this.prisoners[guild.id] = {};
      }

      const entry: PrisonEntry = {
        userId: member.id,
        guildId: guild.id,
        tag: member.user.tag || member.user.username,
        nickname: member.nickname || undefined,
        avatar: member.user.displayAvatarURL(),
        reason: reason || "Verstoß gegen Serverregeln",
        imprisonedAt: new Date().toISOString(),
        imprisonedBy: moderator.tag,
        imprisonedById: moderator.id,
        previousRoleIds,
      };

      this.prisoners[guild.id][member.id] = entry;
      this.saveData();

      // Erstelle Mod-Case (zieht automatisch 1.000 XP ab und berechnet Minus-Level)
      const modUser = (await client?.users.fetch(moderator.id).catch(() => null)) || member.user;
      await moderationService.createCase(guild, modUser, member.user, "PRISON", reason, { client });

      // Nachricht im Gefängnis-Kanal
      const prisonEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Mitglied inhaftiert")
        .setDescription(
          `**${member.user.tag}** (<@${member.id}>) wurde von **${moderator.tag}** ins Gefängnis überstellt.\n\n` +
            `**Grund:** ${reason}\n` +
            `📉 **Strafe:** -1.000 XP & Entzug regulärer Kanäle`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await prisonChannel.send({ embeds: [prisonEmbed] }).catch(() => null);

      return { ok: true, xpPenalty: 1000 };
    } catch (e: any) {
      console.error("[PrisonService] Fehler beim Inhaftieren:", e);
      return { ok: false, error: e?.message || "Konnte Mitglied nicht inhaftieren.", xpPenalty: 0 };
    }
  }

  public async unprison(
    guild: Guild,
    member: GuildMember,
    moderator: { id: string; tag: string; avatar?: string },
    client?: Client
  ): Promise<{ ok: boolean; error?: string }> {
    const entry = this.getPrisonEntry(guild.id, member.id);
    if (!entry) {
      return { ok: false, error: "Mitglied ist nicht im Gefängnis registriert." };
    }

    try {
      const prisonRole = guild.roles.cache.find((r) => r.name === "🔒・Gefängnis" || r.name === "Gefängnis");
      if (prisonRole && member.roles.cache.has(prisonRole.id)) {
        await member.roles.remove(prisonRole, "Aus Gefängnis entlassen");
      }

      // Alte Rollen wiederherstellen
      if (entry.previousRoleIds && entry.previousRoleIds.length > 0) {
        const rolesToRestore = entry.previousRoleIds
          .map((id) => guild.roles.cache.get(id))
          .filter((r): r is Role => Boolean(r));

        if (rolesToRestore.length > 0) {
          await member.roles.add(rolesToRestore, "Rollen nach Gefängnis-Entlassung wiederhergestellt").catch(() => null);
        }
      }

      delete this.prisoners[guild.id][member.id];
      this.saveData();

      // Erstelle Mod-Case für Entlassung
      const modUser = (await client?.users.fetch(moderator.id).catch(() => null)) || member.user;
      await moderationService.createCase(
        guild,
        modUser,
        member.user,
        "UNPRISON",
        "Regulär aus dem Gefängnis entlassen",
        { client }
      );

      // Nachricht im Gefängnis-Kanal falls vorhanden
      const prisonChannel = guild.channels.cache.find(
        (c) => (c.name === "🔒・gefängnis" || c.name === "gefängnis") && c.type === ChannelType.GuildText
      ) as TextChannel | undefined;

      if (prisonChannel) {
        const releaseEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🔓 Mitglied entlassen")
          .setDescription(
            `**${member.user.tag}** (<@${member.id}>) wurde von **${moderator.tag}** aus dem Gefängnis entlassen. Die vorherigen Rollen wurden wiederhergestellt.`
          )
          .setTimestamp();

        await prisonChannel.send({ embeds: [releaseEmbed] }).catch(() => null);
      }

      return { ok: true };
    } catch (e: any) {
      console.error("[PrisonService] Fehler beim Entlassen:", e);
      return { ok: false, error: e?.message || "Fehler beim Entlassen." };
    }
  }
}

export const prisonService = new PrisonService();
