import { ChannelType, Client, Guild, PermissionFlagsBits, VoiceChannel } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";
import { liveStreamService } from "./liveStreamService";
import { gameServerService } from "./gameServerService";

/**
 * Live-Statistik-Kanäle: gesperrte Sprachkanäle ganz oben, deren Name einen Zähler zeigt
 * (z. B. "👥・Mitglieder: 1.250"). Discord erlaubt nur 2 Umbenennungen pro 10 Minuten und Kanal,
 * deshalb wird alle 10 Minuten aktualisiert und nur, wenn sich der Wert geändert hat.
 */
export type CounterId = "members" | "humans" | "online" | "voice" | "live" | "boosts" | "gameservers";

export const COUNTERS: Record<CounterId, { label: string; template: string; description: string }> = {
  members: { label: "Mitglieder (alle)", template: "👥・Mitglieder: {count}", description: "Alle Mitglieder inkl. Bots" },
  humans: { label: "Mitglieder (ohne Bots)", template: "🧑・Menschen: {count}", description: "Mitglieder ohne Bots" },
  online: { label: "Online", template: "🟢・Online: {count}", description: "Mitglieder mit Status online, abwesend oder bitte nicht stören" },
  voice: { label: "Im Voice", template: "🔊・Im Voice: {count}", description: "Mitglieder in Sprachkanälen (ohne AFK-Kanal)" },
  live: { label: "Gerade live", template: "🔴・Gerade live: {count}", description: "Mitglieder, die gerade streamen" },
  boosts: { label: "Server-Boosts", template: "🚀・Boosts: {count}", description: "Anzahl der Server-Boosts" },
  gameservers: { label: "Game-Server online", template: "🎮・Game-Server: {count}", description: "Wie viele eingetragene Game-Server online sind (z. B. 2/3)" },
};

interface CounterConfig {
  enabled: boolean;
  template: string;
  channelId?: string;
  lastName?: string;
}

export interface StatsChannelsConfig {
  categoryId?: string;
  counters: Partial<Record<CounterId, CounterConfig>>;
}

const store = new GuildStore<StatsChannelsConfig>("stats_channels.json", () => ({ counters: {} }));

const UPDATE_MS = 10 * 60 * 1000;

class StatsChannelsService {
  private interval: NodeJS.Timeout | null = null;

  public getConfig(guildId: string): StatsChannelsConfig {
    return store.get(guildId);
  }

  public getBackupConfig(guildId: string): StatsChannelsConfig {
    const config = store.get(guildId);
    return {
      categoryId: config.categoryId,
      counters: Object.fromEntries(Object.entries(config.counters).map(([id, counter]) => [id, {
        enabled: counter?.enabled || false,
        template: counter?.template || "{count}",
        channelId: counter?.channelId,
      }])),
    };
  }

  public setBackupConfig(guildId: string, config: StatsChannelsConfig) {
    store.set(guildId, config);
  }

  /** Anzeige-Wert eines Zählers (Zahl, bei Game-Servern "online/gesamt"). */
  public display(guild: Guild, id: CounterId): string {
    if (id === "gameservers") {
      const { online, total } = gameServerService.onlineCount(guild.id);
      return `${online}/${total}`;
    }
    return this.count(guild, id).toLocaleString("de-DE");
  }

  /** Aktueller Wert eines Zählers. */
  public count(guild: Guild, id: CounterId): number {
    switch (id) {
      case "members":
        return guild.memberCount;
      case "humans":
        return guild.members.cache.filter((m) => !m.user.bot).size;
      case "online":
        return guild.members.cache.filter((m) => !m.user.bot && !!m.presence && m.presence.status !== "offline").size;
      case "voice":
        return guild.members.cache.filter((m) => !!m.voice.channelId && m.voice.channelId !== guild.afkChannelId).size;
      case "live":
        return liveStreamService.getActiveEntries(guild.id).length;
      case "boosts":
        return guild.premiumSubscriptionCount || 0;
      case "gameservers":
        return gameServerService.onlineCount(guild.id).online;
    }
  }

  public render(template: string, value: string): string {
    const name = (template || "{count}").replace(/{count}/g, value);
    return name.slice(0, 100);
  }

  /**
   * Speichert die Auswahl und legt fehlende Kanäle an (Kategorie ganz oben, Kanäle für alle sichtbar,
   * aber niemand kann beitreten). Abgewählte Zähler-Kanäle werden gelöscht.
   */
  public async apply(guild: Guild, wanted: Partial<Record<CounterId, { enabled: boolean; template?: string }>>) {
    const cfg = store.get(guild.id);
    await guild.channels.fetch();

    let category = cfg.categoryId ? guild.channels.cache.get(cfg.categoryId) : undefined;
    const anyEnabled = (Object.keys(COUNTERS) as CounterId[]).some((id) => wanted[id]?.enabled);

    const botId = guild.members.me?.id || guild.client.user?.id;

    if (anyEnabled && (!category || category.type !== ChannelType.GuildCategory)) {
      category = await guild.channels.create({
        name: "📊 Server-Statistik",
        type: ChannelType.GuildCategory,
        position: 0,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] },
          ...(botId ? [{ id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] }] : []),
        ],
        reason: "GLGBot: Statistik-Kanäle",
      });
      cfg.categoryId = category.id;
    }

    for (const id of Object.keys(COUNTERS) as CounterId[]) {
      const w = wanted[id];
      const current = cfg.counters[id];
      const template = (w?.template || current?.template || COUNTERS[id].template).slice(0, 90);
      if (w?.enabled) {
        let channel = current?.channelId ? guild.channels.cache.get(current.channelId) : undefined;
        const name = this.render(template, this.display(guild, id));
        if (!channel) {
          channel = await guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category?.id,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] },
              ...(botId ? [{ id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] }] : []),
            ],
            reason: `GLGBot: Statistik-Kanal (${COUNTERS[id].label})`,
          });
        } else if (channel.name !== name) {
          await (channel as VoiceChannel).setName(name).catch(() => null);
        }
        cfg.counters[id] = { enabled: true, template, channelId: channel.id, lastName: name };
      } else {
        if (current?.channelId) {
          await guild.channels.cache.get(current.channelId)?.delete("GLGBot: Statistik-Kanal abgewählt").catch(() => null);
        }
        cfg.counters[id] = { enabled: false, template };
      }
    }

    // Keine Zähler mehr -> leere Kategorie entfernen
    if (!anyEnabled && cfg.categoryId) {
      const cat = guild.channels.cache.get(cfg.categoryId);
      if (cat && cat.type === ChannelType.GuildCategory && cat.children.cache.size === 0) {
        await cat.delete("GLGBot: Statistik-Kanäle entfernt").catch(() => null);
      }
      cfg.categoryId = undefined;
    }

    store.set(guild.id, cfg);
    return cfg;
  }

  /** Zähler aktualisieren (nur bei geändertem Wert, max. alle 10 Minuten). */
  public async refresh(guild: Guild) {
    if (!moduleService.isEnabled(guild.id, "statsChannels")) return;
    const cfg = store.get(guild.id);
    let changed = false;
    // Für "Menschen"/"Online" die Mitgliederliste aktuell halten
    if (cfg.counters.humans?.enabled || cfg.counters.online?.enabled) {
      await guild.members.fetch({ withPresences: true }).catch(() => null);
    }
    for (const id of Object.keys(COUNTERS) as CounterId[]) {
      const c = cfg.counters[id];
      if (!c?.enabled || !c.channelId) continue;
      const channel = guild.channels.cache.get(c.channelId);
      if (!channel) continue;
      const name = this.render(c.template, this.display(guild, id));
      if (name !== channel.name) {
        await (channel as VoiceChannel).setName(name).catch((e) => console.warn(`[StatsChannels] ${guild.name}: ${e?.message || e}`));
        c.lastName = name;
        changed = true;
      }
    }
    if (changed) store.set(guild.id, cfg);
  }

  public start(client: Client) {
    if (this.interval) return;
    const run = () => {
      for (const guild of client.guilds.cache.values()) this.refresh(guild).catch(() => null);
    };
    setTimeout(run, 60_000);
    this.interval = setInterval(run, UPDATE_MS);
  }
}

export const statsChannelsService = new StatsChannelsService();
