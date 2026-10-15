import { Client, EmbedBuilder, Guild, Message, TextChannel } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";
import { todayParts } from "./birthdayService";

/**
 * Clip-Showcase: Im Clip-Kanal erkennt der Bot Clips (Twitch, YouTube, Medal, Streamable, Kick,
 * Videodateien) und hängt 🔥 und 😂 als Reaktionen an. Einmal pro Woche wird der Clip mit den
 * meisten 🔥 als „Clip der Woche“ gekürt und angepinnt.
 */
interface ClipEntry {
  messageId: string;
  authorId: string;
  url?: string;
  createdAt: number;
}

interface ClipData {
  channelId?: string;
  /** Wochentag der Kür (0 = Sonntag … 6 = Samstag) und Uhrzeit */
  weekday: number;
  hour: number;
  clips: ClipEntry[];
  lastAward?: string; // Datum (YYYY-MM-DD) der letzten Kür
  lastWinnerMessageId?: string;
  history: { date: string; authorId: string; messageId: string; votes: number; url?: string }[];
}

const store = new GuildStore<ClipData>("clips.json", () => ({ weekday: 0, hour: 20, clips: [], history: [] }));

const CLIP_PATTERNS = [
  /https?:\/\/(?:www\.)?clips\.twitch\.tv\/\S+/i,
  /https?:\/\/(?:www\.)?twitch\.tv\/\S+\/clip\/\S+/i,
  /https?:\/\/(?:www\.)?youtube\.com\/(?:shorts\/|watch\?v=)\S+/i,
  /https?:\/\/youtu\.be\/\S+/i,
  /https?:\/\/(?:www\.)?medal\.tv\/\S+/i,
  /https?:\/\/(?:www\.)?streamable\.com\/\S+/i,
  /https?:\/\/(?:www\.)?kick\.com\/\S+\/clips?\/\S+/i,
  /https?:\/\/(?:www\.)?outplayed\.tv\/\S+/i,
];
const FIRE = "🔥";
const LAUGH = "😂";

function berlinHour() {
  return Number(new Intl.DateTimeFormat("de-DE", { timeZone: process.env.BOT_TIMEZONE || "Europe/Berlin", hour: "2-digit", hour12: false }).format(new Date()));
}
function berlinWeekday() {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: process.env.BOT_TIMEZONE || "Europe/Berlin", weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

class ClipService {
  private interval: NodeJS.Timeout | null = null;

  public getData(guildId: string) {
    return store.get(guildId);
  }

  public getBackupConfig(guildId: string) {
    const data = store.get(guildId);
    return { channelId: data.channelId, weekday: data.weekday, hour: data.hour };
  }

  public setConfig(guildId: string, patch: { channelId?: string | null; weekday?: number; hour?: number }) {
    return store.update(guildId, (d) => {
      if (patch.channelId !== undefined) d.channelId = patch.channelId || undefined;
      if (typeof patch.weekday === "number" && patch.weekday >= 0 && patch.weekday <= 6) d.weekday = Math.floor(patch.weekday);
      if (typeof patch.hour === "number" && patch.hour >= 0 && patch.hour <= 23) d.hour = Math.floor(patch.hour);
    });
  }

  /** Erkennt einen Clip in einer Nachricht (Link oder Videodatei). */
  public findClip(message: Message): string | null {
    for (const re of CLIP_PATTERNS) {
      const m = message.content.match(re);
      if (m) return m[0];
    }
    const video = message.attachments.find((a) => (a.contentType || "").startsWith("video/") || /\.(mp4|webm|mov)$/i.test(a.name || ""));
    return video ? video.url : null;
  }

  public async handleMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot || !moduleService.isEnabled(message.guild.id, "clips")) return false;
    const data = store.get(message.guild.id);
    if (!data.channelId || message.channelId !== data.channelId) return false;
    const url = this.findClip(message);
    if (!url) return false;
    await message.react(FIRE).catch(() => null);
    await message.react(LAUGH).catch(() => null);
    store.update(message.guild.id, (d) => {
      d.clips.push({ messageId: message.id, authorId: message.author.id, url: url.startsWith("https://cdn.discordapp.com") ? undefined : url, createdAt: Date.now() });
      // nur die letzten 14 Tage behalten
      const cutoff = Date.now() - 14 * 86_400_000;
      d.clips = d.clips.filter((c) => c.createdAt > cutoff).slice(-500);
    });
    return true;
  }

  /** Stimmen (🔥 ohne Bot) der Clips der letzten 7 Tage zählen. */
  public async ranking(guild: Guild, limit = 10) {
    const data = store.get(guild.id);
    const channel = data.channelId ? (guild.channels.cache.get(data.channelId) as TextChannel | undefined) : undefined;
    if (!channel) return [];
    const cutoff = Date.now() - 7 * 86_400_000;
    const won = new Set(data.history.map((h) => h.messageId));
    const recent = data.clips.filter((c) => c.createdAt > cutoff && !won.has(c.messageId));
    const results: { clip: ClipEntry; votes: number; laughs: number }[] = [];
    for (const clip of recent) {
      const msg = await channel.messages.fetch(clip.messageId).catch(() => null);
      if (!msg) continue;
      const fire = msg.reactions.cache.get(FIRE)?.count || 0;
      const laugh = msg.reactions.cache.get(LAUGH)?.count || 0;
      results.push({ clip, votes: Math.max(0, fire - 1), laughs: Math.max(0, laugh - 1) });
    }
    return results.sort((a, b) => b.votes - a.votes || b.laughs - a.laughs || a.clip.createdAt - b.clip.createdAt).slice(0, limit);
  }

  /** Kürt den Clip der Woche (force = sofort, z. B. aus dem Dashboard). */
  public async award(guild: Guild, force = false): Promise<string> {
    const data = store.get(guild.id);
    const channel = data.channelId ? (guild.channels.cache.get(data.channelId) as TextChannel | undefined) : undefined;
    if (!channel) throw new Error("Kein Clip-Kanal eingestellt.");
    const ranking = await this.ranking(guild, 3);
    const top = ranking[0];
    const { iso } = todayParts();
    if (!top || top.votes === 0) {
      store.update(guild.id, (d) => {
        d.lastAward = iso;
      });
      if (force) throw new Error("Diese Woche hat noch kein Clip eine 🔥-Stimme bekommen.");
      return "keine Stimmen";
    }

    // alten Gewinner abpinnen
    if (data.lastWinnerMessageId) {
      const old = await channel.messages.fetch(data.lastWinnerMessageId).catch(() => null);
      await old?.unpin().catch(() => null);
    }
    const winnerMsg = await channel.messages.fetch(top.clip.messageId).catch(() => null);
    await winnerMsg?.pin().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0xffac33)
      .setTitle("🏆 Clip der Woche")
      .setDescription(
        `Glückwunsch <@${top.clip.authorId}>! Dein Clip hat mit **${top.votes} ${FIRE}** gewonnen.\n` +
          (winnerMsg ? `👉 [Zum Clip](${winnerMsg.url})` : "") +
          (ranking.length > 1
            ? `\n\n**Plätze 2 & 3:**\n` +
              ranking
                .slice(1)
                .map((r, i) => `${i === 0 ? "🥈" : "🥉"} <@${r.clip.authorId}> · ${r.votes} ${FIRE}`)
                .join("\n")
            : "")
      )
      .setTimestamp();
    await channel.send({ embeds: [embed], allowedMentions: { users: [top.clip.authorId] } });

    store.update(guild.id, (d) => {
      d.lastAward = iso;
      d.lastWinnerMessageId = top.clip.messageId;
      d.history = [...d.history, { date: iso, authorId: top.clip.authorId, messageId: top.clip.messageId, votes: top.votes, url: top.clip.url }].slice(-20);
    });
    return `Gewinner: ${top.clip.authorId}`;
  }

  /** Stündlich prüfen, ob die Kür fällig ist (eingestellter Wochentag & Uhrzeit, einmal pro Tag). */
  public start(client: Client) {
    if (this.interval) return;
    const tick = () => {
      const wd = berlinWeekday();
      const hour = berlinHour();
      const { iso } = todayParts();
      for (const guildId of store.guildIds()) {
        const guild = client.guilds.cache.get(guildId);
        const d = store.get(guildId);
        if (!guild || !d.channelId || !moduleService.isEnabled(guildId, "clips")) continue;
        if (d.weekday === wd && hour >= d.hour && d.lastAward !== iso) {
          this.award(guild).catch((e) => console.warn(`[Clips] ${guild.name}: ${e?.message || e}`));
        }
      }
    };
    this.interval = setInterval(tick, 10 * 60 * 1000);
  }
}

export const clipService = new ClipService();
