import { Client, EmbedBuilder, Guild, PermissionFlagsBits, TextChannel } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";

/**
 * Geburtstage: Mitglieder tragen Tag & Monat ein (kein Jahr - Datenschutz).
 * Jeden Tag ab 00:01 Uhr (Zeitzone BOT_TIMEZONE, Standard Europe/Berlin) gratuliert der Bot
 * im eingestellten Kanal und vergibt optional für 24 Stunden die Geburtstags-Rolle.
 */
interface BirthdayData {
  channelId?: string;
  roleId?: string;
  message: string;
  users: Record<string, { day: number; month: number }>;
  /** Datum (YYYY-MM-DD), für das bereits gratuliert wurde */
  lastRun?: string;
  /** userId -> Zeitpunkt, an dem die Geburtstags-Rolle vergeben wurde */
  roleGiven: Record<string, number>;
}

export const DEFAULT_BIRTHDAY_MESSAGE = "🎉 Alles Gute zum Geburtstag, {user}! Das ganze Team von **{server}** wünscht dir einen tollen Tag! 🎂";

const store = new GuildStore<BirthdayData>("birthdays.json", () => ({
  message: DEFAULT_BIRTHDAY_MESSAGE,
  users: {},
  roleGiven: {},
}));

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function timeZone() {
  return process.env.BOT_TIMEZONE || "Europe/Berlin";
}

/** Heutiges Datum in der Bot-Zeitzone. */
export function todayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone(), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return { year, month, day, iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

class BirthdayService {
  private interval: NodeJS.Timeout | null = null;

  public getData(guildId: string) {
    return store.get(guildId);
  }

  public formatDate(day: number, month: number) {
    return `${day}. ${MONTHS[month - 1]}`;
  }

  /** Prüft Tag/Monat. Fehlermeldung oder null. */
  public validate(day: number, month: number): string | null {
    if (!Number.isInteger(month) || month < 1 || month > 12) return "Der Monat muss zwischen 1 und 12 liegen.";
    if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]) return `Der ${MONTHS[month - 1]} hat nur ${DAYS_IN_MONTH[month - 1]} Tage.`;
    return null;
  }

  public setBirthday(guildId: string, userId: string, day: number, month: number): string | null {
    const err = this.validate(day, month);
    if (err) return err;
    store.update(guildId, (d) => {
      d.users[userId] = { day, month };
    });
    return null;
  }

  public removeBirthday(guildId: string, userId: string): boolean {
    let removed = false;
    store.update(guildId, (d) => {
      removed = !!d.users[userId];
      delete d.users[userId];
    });
    return removed;
  }

  public setConfig(guildId: string, patch: { channelId?: string | null; roleId?: string | null; message?: string }) {
    return store.update(guildId, (d) => {
      if (patch.channelId !== undefined) d.channelId = patch.channelId || undefined;
      if (patch.roleId !== undefined) d.roleId = patch.roleId || undefined;
      if (patch.message !== undefined) d.message = patch.message.trim().slice(0, 1000) || DEFAULT_BIRTHDAY_MESSAGE;
    });
  }

  /** Nächste Geburtstage (sortiert ab heute). */
  public upcoming(guildId: string, limit = 10) {
    const { year, month, day } = todayParts();
    const today = Date.UTC(year, month - 1, day);
    return Object.entries(store.get(guildId).users)
      .map(([userId, b]) => {
        let y = year;
        let next = Date.UTC(y, b.month - 1, b.day);
        if (next < today) next = Date.UTC(++y, b.month - 1, b.day);
        return { userId, ...b, daysUntil: Math.round((next - today) / 86_400_000) };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);
  }

  /** Wer hat heute Geburtstag? (29. Februar wird in Nicht-Schaltjahren am 28. gefeiert) */
  public todaysBirthdays(guildId: string) {
    const { year, month, day } = todayParts();
    return Object.entries(store.get(guildId).users)
      .filter(([, b]) => (b.month === month && b.day === day) || (!isLeap(year) && b.month === 2 && b.day === 29 && month === 2 && day === 28))
      .map(([userId]) => userId);
  }

  /** Tägliche Prüfung: gratulieren + Rolle vergeben, abgelaufene Rollen entfernen. */
  public async run(guild: Guild, force = false) {
    if (!moduleService.isEnabled(guild.id, "birthdays")) return;
    const data = store.get(guild.id);
    const { iso } = todayParts();

    // Geburtstags-Rolle nach 24 Stunden wieder entfernen
    const now = Date.now();
    for (const [userId, givenAt] of Object.entries(data.roleGiven)) {
      if (now - givenAt < 24 * 60 * 60 * 1000) continue;
      if (data.roleId) {
        const member = await guild.members.fetch(userId).catch(() => null);
        await member?.roles.remove(data.roleId, "Geburtstag vorbei").catch(() => null);
      }
      delete data.roleGiven[userId];
    }

    if (data.lastRun === iso && !force) {
      store.set(guild.id, data);
      return;
    }

    const ids = this.todaysBirthdays(guild.id);
    const channel = data.channelId ? (guild.channels.cache.get(data.channelId) as TextChannel | undefined) : undefined;
    for (const userId of ids) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;
      try {
        if (channel?.isTextBased()) {
          const text = data.message.replace(/{user}/g, `<@${userId}>`).replace(/{server}/g, guild.name).replace(/{name}/g, member.displayName);
          await channel
            .send({
              content: `<@${userId}>`,
              embeds: [
                new EmbedBuilder()
                  .setColor(0xeb459e)
                  .setTitle("🎂 Herzlichen Glückwunsch!")
                  .setDescription(text)
                  .setThumbnail(member.displayAvatarURL({ size: 256 }))
                  .setTimestamp(),
              ],
              allowedMentions: { users: [userId] },
            })
            .catch((e) => console.warn(`[Birthday] ${guild.name}: ${e?.message || e}`));
        }
        if (data.roleId && guild.roles.cache.has(data.roleId)) {
          await member.roles.add(data.roleId, "Geburtstag").catch(() => null);
          data.roleGiven[userId] = now;
        }
      } catch (e: any) {
        console.warn(`[Birthday] ${guild.name} / ${userId}: ${e?.message || e}`);
      }
    }

    data.lastRun = iso;
    store.set(guild.id, data);
    if (ids.length > 0) console.log(`🎂 [Birthday] ${ids.length} Geburtstag(e) auf ${guild.name} gefeiert.`);
  }

  /** Legt die Geburtstags-Rolle an (falls noch nicht vorhanden). */
  public async ensureRole(guild: Guild) {
    const data = store.get(guild.id);
    const existing = data.roleId ? guild.roles.cache.get(data.roleId) : guild.roles.cache.find((r) => /geburtstag/i.test(r.name));
    if (existing) {
      this.setConfig(guild.id, { roleId: existing.id });
      return existing;
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error("Dem Bot fehlt „Rollen verwalten“.");
    const role = await guild.roles.create({ name: "🎉 Geburtstagskind", color: 0xeb459e, hoist: true, reason: "GLGBot: Geburtstage" });
    this.setConfig(guild.id, { roleId: role.id });
    return role;
  }

  /** Alle 10 Minuten prüfen (gratuliert einmal pro Tag ab 00:01 Uhr). */
  public start(client: Client) {
    if (this.interval) return;
    const tick = () => {
      for (const guild of client.guilds.cache.values()) this.run(guild).catch((e) => console.error("[Birthday]", e));
    };
    setTimeout(tick, 45_000);
    this.interval = setInterval(tick, 10 * 60 * 1000);
  }
}

export const birthdayService = new BirthdayService();
