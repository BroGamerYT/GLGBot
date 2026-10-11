import crypto from "crypto";
import { Client, EmbedBuilder, Guild, MessageFlags, TextChannel } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";

/**
 * Geplante Ankündigungen: Nachricht (optional als Embed) zu einem festen Zeitpunkt senden,
 * auf Wunsch täglich oder wöchentlich wiederholen.
 */
export type Repeat = "none" | "daily" | "weekly";

export interface Announcement {
  id: string;
  channelId: string;
  content: string;
  embed?: { title?: string; description?: string; color?: string; imageUrl?: string };
  ping: "none" | "everyone" | "here" | string; // string = Rollen-ID
  silent: boolean;
  sendAt: number; // nächster Sendezeitpunkt (ms)
  repeat: Repeat;
  createdBy?: string;
  createdAt: number;
  lastSentAt?: number;
  sentCount: number;
  lastError?: string;
  /** Einmalige Ankündigung konnte nicht gesendet werden - wartet auf Prüfung im Dashboard */
  failed?: boolean;
}

const store = new GuildStore<Announcement[]>("announcements.json", () => []);
const MAX_PER_GUILD = 50;

function isHttpUrl(v?: string) {
  return !!v && /^https?:\/\/\S+$/i.test(v);
}

class AnnouncementService {
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  public list(guildId: string): Announcement[] {
    return [...store.get(guildId)].sort((a, b) => a.sendAt - b.sendAt);
  }

  /** Prüft & speichert eine Ankündigung. Rückgabe: Fehler oder die gespeicherte Ankündigung. */
  public save(guild: Guild, input: any, by?: string): { error: string } | { item: Announcement } {
    const content = String(input?.content || "").trim().slice(0, 2000);
    const embed = input?.embed && typeof input.embed === "object"
      ? {
          title: String(input.embed.title || "").trim().slice(0, 256) || undefined,
          description: String(input.embed.description || "").trim().slice(0, 4000) || undefined,
          color: /^#?[0-9a-f]{6}$/i.test(String(input.embed.color || "")) ? String(input.embed.color).replace(/^#?/, "#") : undefined,
          imageUrl: isHttpUrl(input.embed.imageUrl) ? String(input.embed.imageUrl) : undefined,
        }
      : undefined;
    const hasEmbed = !!(embed && (embed.title || embed.description || embed.imageUrl));
    if (!content && !hasEmbed) return { error: "Bitte einen Text oder ein Embed angeben." };

    const channelId = String(input?.channelId || "");
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return { error: "Bitte einen gültigen Textkanal wählen." };

    const sendAt = Number(input?.sendAt);
    if (!Number.isFinite(sendAt)) return { error: "Ungültiger Zeitpunkt." };
    if (sendAt < Date.now() - 60_000) return { error: "Der Zeitpunkt liegt in der Vergangenheit." };

    const repeat: Repeat = ["none", "daily", "weekly"].includes(input?.repeat) ? input.repeat : "none";
    let ping = String(input?.ping || "none");
    if (!["none", "everyone", "here"].includes(ping) && !guild.roles.cache.has(ping)) ping = "none";

    const list = store.get(guild.id);
    const id = typeof input?.id === "string" && list.some((a) => a.id === input.id) ? input.id : null;
    if (!id && list.length >= MAX_PER_GUILD) return { error: `Maximal ${MAX_PER_GUILD} geplante Ankündigungen pro Server.` };

    const item: Announcement = {
      ...(id ? list.find((a) => a.id === id)! : { id: crypto.randomBytes(6).toString("hex"), createdAt: Date.now(), sentCount: 0, createdBy: by }),
      channelId,
      content,
      embed: hasEmbed ? embed : undefined,
      ping,
      silent: !!input?.silent,
      sendAt,
      repeat,
      lastError: undefined,
      failed: false,
    };
    store.set(guild.id, id ? list.map((a) => (a.id === id ? item : a)) : [...list, item]);
    return { item };
  }

  public remove(guildId: string, id: string): boolean {
    const list = store.get(guildId);
    const next = list.filter((a) => a.id !== id);
    if (next.length === list.length) return false;
    store.set(guildId, next);
    return true;
  }

  /** Sendet eine Ankündigung sofort (ohne den Zeitplan zu ändern, außer bei einmaligen). */
  public async send(guild: Guild, a: Announcement) {
    const channel = guild.channels.cache.get(a.channelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased()) throw new Error("Kanal nicht gefunden.");

    const pingText = a.ping === "everyone" ? "@everyone" : a.ping === "here" ? "@here" : a.ping !== "none" ? `<@&${a.ping}>` : "";
    const content = [pingText, a.content].filter(Boolean).join(" ").slice(0, 2000) || undefined;
    const embeds = a.embed
      ? [
          (() => {
            const e = new EmbedBuilder().setColor((a.embed!.color ? parseInt(a.embed!.color.slice(1), 16) : 0x5865f2) as number);
            if (a.embed!.title) e.setTitle(a.embed!.title);
            if (a.embed!.description) e.setDescription(a.embed!.description);
            if (a.embed!.imageUrl) e.setImage(a.embed!.imageUrl);
            return e;
          })(),
        ]
      : [];

    await channel.send({
      content,
      embeds,
      flags: a.silent ? [MessageFlags.SuppressNotifications] : undefined,
      allowedMentions:
        a.ping === "everyone" || a.ping === "here"
          ? { parse: ["everyone"] }
          : a.ping !== "none"
            ? { roles: [a.ping] }
            : { parse: [] },
    });
  }

  /** Nächster Zeitpunkt nach dem Senden (verpasste Wiederholungen werden übersprungen). */
  private nextTime(a: Announcement): number | null {
    if (a.repeat === "none") return null;
    const step = a.repeat === "daily" ? 86_400_000 : 7 * 86_400_000;
    let t = a.sendAt + step;
    while (t <= Date.now()) t += step;
    return t;
  }

  public async tick(client: Client) {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      for (const guildId of store.guildIds()) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild || !moduleService.isEnabled(guildId, "announcements")) continue;
        const list = store.get(guildId);
        let changed = false;
        const keep: Announcement[] = [];
        for (const a of list) {
          if (a.failed || a.sendAt > now) {
            keep.push(a);
            continue;
          }
          changed = true;
          try {
            await this.send(guild, a);
            a.lastSentAt = now;
            a.sentCount++;
            a.lastError = undefined;
            console.log(`📢 [Ankündigung] ${guild.name}: ${a.id} gesendet.`);
          } catch (e: any) {
            a.lastError = e?.message || String(e);
            console.warn(`[Ankündigung] ${guild.name}: ${a.lastError}`);
          }
          const next = this.nextTime(a);
          if (next) keep.push({ ...a, sendAt: next });
          else if (a.lastError) keep.push({ ...a, failed: true }); // fehlgeschlagen: zur Kontrolle im Dashboard behalten
        }
        if (changed) store.set(guildId, keep);
      }
    } finally {
      this.running = false;
    }
  }

  public start(client: Client) {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(client).catch((e) => console.error("[Ankündigung]", e)), 30_000);
  }
}

export const announcementService = new AnnouncementService();
