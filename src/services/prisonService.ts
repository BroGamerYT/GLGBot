import fs from "fs";
import path from "path";
import {
  Guild,
  GuildMember,
  Role,
  TextChannel,
  VoiceChannel,
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
  durationMinutes?: number | null;
  expiresAt?: string | null;
}

export function parseDurationToMinutes(input?: string | number | null): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === "number") {
    return input > 0 ? Math.floor(input) : null;
  }
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === "0" || trimmed === "unbegrenzt" || trimmed === "dauerhaft" || trimmed === "permanent") {
    return null;
  }

  const weekMatch = trimmed.match(/^(\d+)\s*(w|woche|wochen)$/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7 * 24 * 60;

  const dayMatch = trimmed.match(/^(\d+)\s*(d|t|tag|tage)$/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 24 * 60;

  const hourMatch = trimmed.match(/^(\d+)\s*(h|std|stunde|stunden)$/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

  const minMatch = trimmed.match(/^(\d+)\s*(m|min|minute|minuten)?$/);
  if (minMatch) return parseInt(minMatch[1], 10);

  return null;
}

export function formatDurationMinutes(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "Dauerhaft (unbegrenzt)";
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours} Std. ${remainingMins} Min.` : `${hours} Std.`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} Tag(e) ${remainingHours} Std.` : `${days} Tag(e)`;
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

  public async ensurePrisonVoiceChannel(guild: Guild, prisonRole: Role): Promise<VoiceChannel> {
    const existing = guild.channels.cache.find(
      (c) =>
        (c.name === "🔒・gefängnis-voice" ||
          c.name === "gefängnis-voice" ||
          c.name === "🔒・knast-voice" ||
          c.name === "knast-voice" ||
          c.name === "🔒・gefängnis-talk") &&
        c.type === ChannelType.GuildVoice
    ) as VoiceChannel | undefined;

    if (existing) return existing;

    return await guild.channels.create({
      name: "🔒・gefängnis-voice",
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        },
        {
          id: prisonRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: guild.members.me?.id || "",
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
      reason: "Automatisches Anlegen des Gefängnis-Sprachkanals",
    });
  }

  /**
   * Sperrt alle Kategorien und eigenständigen Kanäle für die Gefängnis-Rolle (außer Gefängnis-Text- und Voice-Kanal).
   * Kanäle, die mit ihrer Kategorie synchronisiert sind, erben die Sperre automatisch.
   * Wird bei jeder Inhaftierung ausgeführt, damit auch neu erstellte Kanäle gesperrt werden.
   */
  public async applyPrisonLockdown(
    guild: Guild,
    prisonRole: Role,
    prisonChannelId: string,
    prisonVoiceChannelId?: string
  ) {
    const DENY = {
      ViewChannel: false,
      SendMessages: false,
      SendMessagesInThreads: false,
      AddReactions: false,
      Connect: false,
      Speak: false,
    };
    for (const ch of guild.channels.cache.values()) {
      if (
        ch.id === prisonChannelId ||
        (prisonVoiceChannelId && ch.id === prisonVoiceChannelId) ||
        ch.isThread() ||
        !("permissionOverwrites" in ch)
      ) {
        continue;
      }
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
    client?: Client,
    durationMinutes?: number | null
  ): Promise<{ ok: boolean; error?: string; xpPenalty: number }> {
    if (this.isImprisoned(guild.id, member.id)) {
      return { ok: false, error: "Mitglied ist bereits im Gefängnis.", xpPenalty: 0 };
    }

    try {
      const prisonRole = await this.ensurePrisonRole(guild);
      const prisonChannel = await this.ensurePrisonChannel(guild, prisonRole);
      const prisonVoiceChannel = await this.ensurePrisonVoiceChannel(guild, prisonRole);

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

      // Alle anderen Kanäle für die Gefängnis-Rolle sperren
      await this.applyPrisonLockdown(guild, prisonRole, prisonChannel.id, prisonVoiceChannel.id).catch((e) =>
        console.error("[PrisonService] Sperre der Kanäle fehlgeschlagen:", e)
      );

      // Falls das Mitglied aktuell in einem Sprachkanal ist -> direkt in den Gefängnis-Voice verschieben!
      if (member.voice.channel) {
        await member.voice.setChannel(prisonVoiceChannel, `Inhaftiert: ${reason}`).catch(async () => {
          // Fallback falls Verschieben nicht klappt
          await member.voice.disconnect(`Inhaftiert: ${reason}`).catch(() => null);
        });
      }

      // Dauer berechnen (null = unbegrenzt)
      const now = new Date();
      const validDuration = typeof durationMinutes === "number" && durationMinutes > 0 ? Math.floor(durationMinutes) : null;
      const expiresAt = validDuration ? new Date(now.getTime() + validDuration * 60 * 1000).toISOString() : null;

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
        imprisonedAt: now.toISOString(),
        imprisonedBy: moderator.tag,
        imprisonedById: moderator.id,
        previousRoleIds,
        durationMinutes: validDuration,
        expiresAt,
      };

      this.prisoners[guild.id][member.id] = entry;
      this.saveData();

      // Erstelle Mod-Case (zieht automatisch 1.000 XP ab und berechnet Minus-Level)
      const modUser = (await client?.users.fetch(moderator.id).catch(() => null)) || member.user;
      const caseReason = validDuration
        ? `${reason} (Dauer: ${formatDurationMinutes(validDuration)})`
        : reason;
      await moderationService.createCase(guild, modUser, member.user, "PRISON", caseReason, { client });

      // Nachricht im Gefängnis-Kanal
      const durationField = validDuration
        ? `⏳ **Dauer:** ${formatDurationMinutes(validDuration)} (Ablauf: <t:${Math.floor(now.getTime() / 1000 + validDuration * 60)}:R>)`
        : `⏳ **Dauer:** Unbegrenzt (bis manuelle Entlassung)`;

      const prisonEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Mitglied inhaftiert")
        .setDescription(
          `**${member.user.tag}** (<@${member.id}>) wurde von **${moderator.tag}** ins Gefängnis überstellt.\n\n` +
            `**Grund:** ${reason}\n` +
            `${durationField}\n` +
            `📉 **Strafe:** -1.000 XP & Entzug regulärer Kanäle\n` +
            `🔊 **Voice-Knast:** <#${prisonVoiceChannel.id}>`
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
    client?: Client,
    customReason?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const entry = this.getPrisonEntry(guild.id, member.id);
    if (!entry) {
      return { ok: false, error: "Mitglied ist nicht im Gefängnis registriert." };
    }

    try {
      const prisonRole = guild.roles.cache.find((r) => r.name === "🔒・Gefängnis" || r.name === "Gefängnis");
      if (prisonRole && member.roles.cache.has(prisonRole.id)) {
        await member.roles.remove(prisonRole, customReason || "Aus Gefängnis entlassen").catch(() => null);
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

      // Falls Mitglied im Gefängnis-Voice ist -> trennen
      if (member.voice.channel) {
        const chName = member.voice.channel.name.toLowerCase();
        if (chName.includes("gefängnis") || chName.includes("knast")) {
          await member.voice.disconnect("Aus Gefängnis entlassen").catch(() => null);
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
        customReason || "Regulär aus dem Gefängnis entlassen",
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
            `**${member.user.tag}** (<@${member.id}>) wurde von **${moderator.tag}** aus dem Gefängnis entlassen.${
              customReason ? `\n*Hinweis:* ${customReason}` : ""
            }\nDie vorherigen Rollen wurden wiederhergestellt.`
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

  private schedulerInterval: NodeJS.Timeout | null = null;

  /**
   * Startet den automatischen Timer-Prüfer für zeitlich befristete Gefängnisstrafen.
   */
  public startScheduler(client: Client) {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(() => {
      this.checkExpiredPrisons(client).catch((e) =>
        console.error("[PrisonService] Fehler beim Timer-Abgleich:", e)
      );
    }, 30000);

    // Initial nach 5 Sekunden
    setTimeout(() => {
      this.checkExpiredPrisons(client).catch(() => null);
    }, 5000);
  }

  /**
   * Prüft alle inhaftierten Mitglieder und entlässt diejenigen, deren Strafe abgelaufen ist.
   */
  public async checkExpiredPrisons(client: Client) {
    const now = Date.now();
    for (const [guildId, entries] of Object.entries(this.prisoners)) {
      for (const [userId, entry] of Object.entries(entries)) {
        if (!entry.expiresAt) continue;

        const expiresTime = new Date(entry.expiresAt).getTime();
        if (expiresTime <= now) {
          try {
            const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
            if (!guild) continue;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
              delete this.prisoners[guildId][userId];
              this.saveData();
              continue;
            }

            console.log(
              `[PrisonService] Haftstrafe für ${member.user.tag} (${userId}) auf Server ${guild.name} abgelaufen. Automatische Freilassung.`
            );
            await this.unprison(
              guild,
              member,
              { id: client.user?.id || "system", tag: "Automatischer Timer" },
              client,
              "Haftdauer abgelaufen (Automatischer Timer)"
            );
          } catch (err) {
            console.error(`[PrisonService] Fehler beim automatischen Entlassen von ${userId}:`, err);
          }
        }
      }
    }
  }
}

export const prisonService = new PrisonService();
