import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  MessageFlags,
} from "discord.js";
import { NEWS_CATALOG, NEWS_INCLUDES, NewsSourceType, steamImage } from "../config/newsCatalog";
import { moduleService } from "./moduleService";

/**
 * Game-News (ähnlich PatchBot): Spiel-Updates & Treiber-Releases in Discord-Kanäle posten.
 *
 * Quellen:
 *  - Steam:     offizielle Steam-News-Schnittstelle (Ankündigungen & Patchnotes jedes Steam-Spiels)
 *  - Minecraft: offizielles Versions-Manifest von Mojang
 *  - NVIDIA:    offizielle Treibersuche von NVIDIA
 *  - AMD/Intel: werden von den Hersteller-Webseiten gelesen (Beta - kann bei Seitenänderungen ausfallen)
 */

export interface NewsFeed {
  id: string;
  type: NewsSourceType;
  appId?: string;
  name: string;
  channelId: string;
  roleId?: string;
  enabled: boolean;
  onlyPatchnotes?: boolean; // Steam: nur Beiträge mit Patchnotes-Tag
  snapshots?: boolean; // Minecraft: auch Snapshots melden
  createdAt: string;
}

export interface NewsHistoryEntry {
  at: string; // ISO-Zeitpunkt
  action: "added" | "removed" | "enabled" | "disabled";
  name: string;
  type: NewsSourceType;
  channelId: string;
  by?: string; // Name aus dem Dashboard-Login bzw. "Discord"
}

export interface NewsItem {
  id: string; // eindeutig innerhalb der Quelle
  title: string;
  url: string;
  text?: string;
  imageUrl?: string;
  date?: number; // Unix-Sekunden
  isPatchnotes?: boolean;
  isSnapshot?: boolean;
  downloadUrl?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDS_FILE = path.join(DATA_DIR, "game_news.json");
const STATE_FILE = path.join(DATA_DIR, "game_news_state.json");
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const MAX_POSTS_PER_FEED_AND_RUN = 3;
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const SOURCE_STYLE: Record<NewsSourceType, { emoji: string; color: number; label: string }> = {
  steam: { emoji: "🎮", color: 0x1b2838, label: "Steam-News" },
  minecraft: { emoji: "⛏️", color: 0x62b47a, label: "Minecraft" },
  nvidia: { emoji: "🟩", color: 0x76b900, label: "NVIDIA" },
  "amd-gpu": { emoji: "🟥", color: 0xed1c24, label: "AMD" },
  "amd-chipset": { emoji: "🟥", color: 0xed1c24, label: "AMD" },
  "intel-gpu": { emoji: "🟦", color: 0x0071c5, label: "Intel" },
};

function readJson<T>(file: string, fallback: T): T {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(file + ".tmp", file);
}

async function get(url: string, browser = false) {
  return fetch(url, {
    headers: { "User-Agent": browser ? BROWSER_UA : "GLGBot (Discord-Bot)", "Accept-Language": "de-DE,de;q=0.9,en;q=0.8" },
    signal: AbortSignal.timeout(15000),
  });
}

/** Steam-BBCode/HTML in kurzen Klartext umwandeln. */
function cleanSteamText(raw: string, max = 350) {
  const text = raw
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, " ")
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(/\[\*\]/g, "• ")
    .replace(/\[\/?[a-z0-9]+(=[^\]]*)?\]/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function steamImageFromContents(raw: string): string | undefined {
  const clan = raw.match(/\{STEAM_CLAN_IMAGE\}\/([^\s\[\]"']+\.(?:png|jpe?g|gif|webp))/i);
  if (clan) return `https://clan.akamai.steamstatic.com/images/${clan[1]}`;
  const img = raw.match(/(?:\[img\]|<img[^>]+src=["'])(https?:\/\/[^\s\[\]"']+\.(?:png|jpe?g|gif|webp))/i);
  return img ? img[1] : undefined;
}

class GameNewsService {
  private data: { guilds: Record<string, { feeds: NewsFeed[]; history?: NewsHistoryEntry[] }> } = readJson(FEEDS_FILE, { guilds: {} });

  /** Verlauf: was wurde wann von wem hinzugefügt / entfernt (max. 100 Einträge). */
  public getHistory(guildId: string): NewsHistoryEntry[] {
    return this.data.guilds[guildId]?.history || [];
  }

  private log(guildId: string, feed: NewsFeed, action: NewsHistoryEntry["action"], by?: string) {
    const g = (this.data.guilds[guildId] ||= { feeds: [] });
    g.history = [
      { at: new Date().toISOString(), action, name: feed.name, type: feed.type, channelId: feed.channelId, by: by || undefined },
      ...(g.history || []),
    ].slice(0, 100);
  }
  private state: Record<string, { seen: string[]; initialized: boolean }> = readJson(STATE_FILE, {});
  private interval: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private client: Client | null = null;

  // ------------------------------------------------------------------
  //  Feeds verwalten
  // ------------------------------------------------------------------
  public getFeeds(guildId: string): NewsFeed[] {
    return this.data.guilds[guildId]?.feeds || [];
  }

  private saveFeeds() {
    writeJson(FEEDS_FILE, this.data);
  }

  private saveState() {
    writeJson(STATE_FILE, this.state);
  }

  public addFeed(guild: Guild, input: Partial<NewsFeed> & { type: NewsSourceType; channelId: string; name: string }, by?: string): NewsFeed | string {
    const channel = guild.channels.cache.get(input.channelId);
    if (!channel || !channel.isTextBased()) return "Bitte einen gültigen Textkanal auswählen.";
    if (input.type === "steam" && !/^\d{1,10}$/.test(input.appId || "")) return "Ungültige Steam-App-ID.";
    if (input.roleId && !guild.roles.cache.has(input.roleId)) return "Die Ping-Rolle existiert nicht.";

    const feeds = (this.data.guilds[guild.id] ||= { feeds: [] }).feeds;
    const duplicate = feeds.find(
      (f) => f.type === input.type && (f.appId || "") === (input.appId || "") && f.channelId === input.channelId
    );
    if (duplicate) return "Diese Quelle wird in diesem Kanal bereits gemeldet.";
    if (feeds.length >= 50) return "Maximal 50 News-Quellen pro Server.";

    const feed: NewsFeed = {
      id: crypto.randomBytes(6).toString("hex"),
      type: input.type,
      appId: input.appId,
      name: String(input.name).slice(0, 100),
      channelId: input.channelId,
      roleId: input.roleId || undefined,
      enabled: true,
      onlyPatchnotes: input.type === "steam" ? Boolean(input.onlyPatchnotes) : undefined,
      snapshots: input.type === "minecraft" ? Boolean(input.snapshots) : undefined,
      createdAt: new Date().toISOString(),
    };
    feeds.push(feed);
    this.log(guild.id, feed, "added", by);
    this.saveFeeds();
    // Bestehende Beiträge still als "gesehen" markieren -> ab jetzt nur Neues
    this.seedFeed(feed).catch(() => null);
    return feed;
  }

  public updateFeed(guild: Guild, id: string, patch: Partial<NewsFeed>, by?: string): NewsFeed | string {
    const feed = this.getFeeds(guild.id).find((f) => f.id === id);
    if (!feed) return "Quelle nicht gefunden.";
    if (patch.channelId !== undefined) {
      const ch = guild.channels.cache.get(patch.channelId);
      if (!ch || !ch.isTextBased()) return "Bitte einen gültigen Textkanal auswählen.";
      feed.channelId = patch.channelId;
    }
    if (patch.roleId !== undefined) {
      if (patch.roleId && !guild.roles.cache.has(patch.roleId)) return "Die Ping-Rolle existiert nicht.";
      feed.roleId = patch.roleId || undefined;
    }
    if (typeof patch.enabled === "boolean" && patch.enabled !== feed.enabled) {
      feed.enabled = patch.enabled;
      this.log(guild.id, feed, patch.enabled ? "enabled" : "disabled", by);
    }
    if (typeof patch.onlyPatchnotes === "boolean" && feed.type === "steam") feed.onlyPatchnotes = patch.onlyPatchnotes;
    const filterChanged =
      (typeof patch.snapshots === "boolean" && feed.type === "minecraft" && patch.snapshots !== feed.snapshots) ||
      (typeof patch.onlyPatchnotes === "boolean" && feed.type === "steam" && patch.onlyPatchnotes !== feed.onlyPatchnotes);
    if (typeof patch.snapshots === "boolean" && feed.type === "minecraft") feed.snapshots = patch.snapshots;
    this.saveFeeds();
    // Filter geändert -> neu einlesen, damit keine alten Beiträge nachträglich gepostet werden
    if (filterChanged) this.seedFeed(feed).catch(() => null);
    return feed;
  }

  /** Treiber-Quellen (NVIDIA/AMD/Intel) aus dem Game-News-Kanal in den Treiber-Kanal verschieben. */
  public moveDriverFeeds(guildId: string, fromChannelId: string, toChannelId: string, roleId?: string, by?: string): number {
    const DRIVER = ["nvidia", "amd-gpu", "amd-chipset", "intel-gpu"];
    let moved = 0;
    for (const f of this.getFeeds(guildId)) {
      if (DRIVER.includes(f.type) && f.channelId === fromChannelId && fromChannelId !== toChannelId) {
        this.log(guildId, f, "removed", by);
        f.channelId = toChannelId;
        if (roleId) f.roleId = roleId;
        this.log(guildId, f, "added", by);
        moved++;
      }
    }
    if (moved) this.saveFeeds();
    return moved;
  }

  public deleteFeed(guildId: string, id: string, by?: string): boolean {
    const g = this.data.guilds[guildId];
    if (!g) return false;
    const before = g.feeds.length;
    const removed = g.feeds.find((f) => f.id === id);
    if (removed) this.log(guildId, removed, "removed", by);
    g.feeds = g.feeds.filter((f) => f.id !== id);
    delete this.state[id];
    this.saveFeeds();
    this.saveState();
    return g.feeds.length !== before;
  }

  /** Steam-Spiel per Link oder ID nachschlagen (Name + Bild). */
  public async lookupSteam(input: string): Promise<{ appId: string; name: string; image: string } | string> {
    const m = String(input).trim().match(/(?:store\.steampowered\.com\/app\/|steamcommunity\.com\/app\/|^)(\d{1,10})(?:\D|$)/);
    if (!m) return "Bitte einen Steam-Store-Link (store.steampowered.com/app/…) oder eine App-ID eingeben.";
    const appId = m[1];
    try {
      const res = await get(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=german&cc=de`);
      const json: any = await res.json();
      const entry = json?.[appId];
      if (!entry?.success || !entry.data?.name) return `Kein Steam-Spiel mit der ID ${appId} gefunden.`;
      return { appId, name: entry.data.name, image: entry.data.header_image || steamImage(appId) };
    } catch {
      return "Steam ist gerade nicht erreichbar - bitte später erneut versuchen.";
    }
  }

  // ------------------------------------------------------------------
  //  Quellen abfragen
  // ------------------------------------------------------------------
  public async fetchItems(feed: Pick<NewsFeed, "type" | "appId" | "snapshots">): Promise<NewsItem[] | null> {
    try {
      switch (feed.type) {
        case "steam": {
          const res = await get(
            `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${feed.appId}&count=10&maxlength=0&feeds=steam_community_announcements&format=json`
          );
          if (!res.ok) return null;
          const json: any = await res.json();
          const items: any[] = json?.appnews?.newsitems || [];
          return items.map((n) => ({
            id: String(n.gid),
            title: String(n.title || "Neuigkeiten"),
            url: n.url || `https://store.steampowered.com/news/app/${feed.appId}`,
            text: cleanSteamText(String(n.contents || "")),
            imageUrl: steamImageFromContents(String(n.contents || "")) || steamImage(feed.appId!),
            date: n.date,
            isPatchnotes: (Array.isArray(n.tags) && n.tags.includes("patchnotes")) || /patch|update|hotfix/i.test(n.title || ""),
          }));
        }

        case "minecraft": {
          const res = await get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
          if (!res.ok) return null;
          const json: any = await res.json();
          return (json?.versions || [])
            .filter((v: any) => v.type === "release" || (feed.snapshots && v.type === "snapshot"))
            .slice(0, 10)
            .map((v: any) => ({
              id: v.id,
              title: v.type === "release" ? `Minecraft ${v.id} ist da!` : `Neuer Snapshot: ${v.id}`,
              url: `https://minecraft.wiki/w/Java_Edition_${encodeURIComponent(v.id)}`,
              text: v.type === "release" ? "Eine neue Version der Minecraft Java Edition ist erschienen." : "Ein neuer Test-Snapshot der Minecraft Java Edition ist erschienen.",
              date: Math.floor(new Date(v.releaseTime).getTime() / 1000),
              isSnapshot: v.type === "snapshot",
            }));
        }

        case "nvidia": {
          const res = await get(
            "https://gfwsl.geforce.com/services_toolkit/services/com/nvidia/services/AjaxDriverService.php?func=DriverManualLookup&psid=120&pfid=929&osID=57&languageCode=1031&isWHQL=1&dch=1&upCRD=0&sort1=0&numberOfResults=3"
          );
          if (!res.ok) return null;
          const json: any = await res.json();
          return (json?.IDS || [])
            .map((x: any) => x?.downloadInfo)
            .filter((d: any) => d && d.Version)
            .map((d: any) => {
              const name = decodeURIComponent(String(d.Name || "GeForce Game Ready Driver")).replace(/\+/g, " ");
              const date = Date.parse(String(d.ReleaseDateTime || "").replace(/^\w{3}\s/, ""));
              return {
                id: String(d.Version),
                title: `${name} ${d.Version}`,
                url: d.DetailsURL || "https://www.nvidia.com/de-de/geforce/drivers/",
                text: "Ein neuer GeForce-Treiber ist verfügbar.",
                date: Number.isFinite(date) ? Math.floor(date / 1000) : undefined,
                downloadUrl: d.DownloadURL,
              };
            });
        }

        case "amd-gpu": {
          const res = await get("https://www.amd.com/en/support/download/drivers.html", true);
          if (!res.ok) return null;
          const html = await res.text();
          const v = html.match(/amd-software-adrenalin-edition-(\d+\.\d+\.\d+)-/i)?.[1];
          if (!v) return null;
          return [{
            id: v,
            title: `AMD Software: Adrenalin Edition ${v}`,
            url: `https://www.amd.com/en/resources/support-articles/release-notes/RN-RAD-WIN-${v.replace(/\./g, "-")}.html`,
            text: "Ein neuer Radeon-Grafiktreiber ist verfügbar.",
            downloadUrl: "https://www.amd.com/en/support/download/drivers.html",
          }];
        }

        case "amd-chipset": {
          const res = await get("https://www.amd.com/en/support/downloads/drivers.html/chipsets/am5/x870e.html", true);
          if (!res.ok) return null;
          const html = await res.text();
          const v = html.match(/AMD_Chipset_Software_(\d+\.\d+\.\d+\.\d+)\.exe/i)?.[1];
          if (!v) return null;
          return [{
            id: v,
            title: `AMD Ryzen Chipsatz-Treiber ${v}`,
            url: `https://www.amd.com/en/resources/support-articles/release-notes/RN-RYZEN-CHIPSET-${v.replace(/\./g, "-")}.html`,
            text: "Ein neuer Chipsatz-Treiber für AMD Ryzen (AM4 & AM5) ist verfügbar.",
            downloadUrl: `https://drivers.amd.com/drivers/AMD_Chipset_Software_${v}.exe`,
          }];
        }

        case "intel-gpu": {
          const page = "https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-windows.html";
          const res = await get(page, true);
          if (!res.ok) return null;
          const html = await res.text();
          const v = html.match(/\b(3\d\.0\.\d{3}\.\d{4})\b/)?.[1];
          if (!v) return null;
          return [{
            id: v,
            title: `Intel Arc Grafiktreiber ${v}`,
            url: page,
            text: "Ein neuer Treiber für Intel Arc & Iris Xe Grafik ist verfügbar.",
          }];
        }
      }
    } catch (e) {
      console.error(`[GameNews] Abruf fehlgeschlagen (${feed.type}${feed.appId ? " " + feed.appId : ""}):`, (e as Error)?.message || e);
      return null;
    }
    return null;
  }

  private filterItems(feed: NewsFeed, items: NewsItem[]) {
    return items.filter((i) => {
      if (feed.type === "steam" && feed.onlyPatchnotes && !i.isPatchnotes) return false;
      if (feed.type === "minecraft" && !feed.snapshots && i.isSnapshot) return false;
      return true;
    });
  }

  private async seedFeed(feed: NewsFeed) {
    const items = await this.fetchItems(feed);
    if (!items) return; // beim nächsten Check erneut versuchen
    this.state[feed.id] = { seen: items.map((i) => i.id).slice(0, 50), initialized: true };
    this.saveState();
  }

  // ------------------------------------------------------------------
  //  Darstellung
  // ------------------------------------------------------------------
  public buildMessage(feed: NewsFeed, item: NewsItem) {
    const style = SOURCE_STYLE[feed.type];
    const embed = new EmbedBuilder()
      .setColor(style.color)
      .setAuthor({ name: `${style.emoji}  ${feed.name}` })
      .setTitle(item.title.slice(0, 256))
      .setURL(item.url)
      .setFooter({ text: `GLGBot Game-News · ${style.label}` });
    if (item.text) embed.setDescription(item.text.slice(0, 1000));
    if (item.imageUrl) embed.setImage(item.imageUrl);
    if (item.date) embed.setTimestamp(item.date * 1000);
    else embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(feed.type === "steam" || feed.type === "minecraft" ? "Weiterlesen" : "Details & Download")
        .setEmoji("📰")
        .setURL(item.url)
    );
    const base = (process.env.DASHBOARD_URL || "").replace(/\/+$/, "");
    if (feed.type === "steam" && feed.appId && /^https:\/\//.test(base)) {
      row.addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("In Steam öffnen").setEmoji("🎮").setURL(`${base}/go/steam/${feed.appId}`)
      );
    }
    if (item.downloadUrl && item.downloadUrl !== item.url) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Download").setEmoji("⬇️").setURL(item.downloadUrl));
    }
    return { embeds: [embed], components: [row] };
  }

  // ------------------------------------------------------------------
  //  Posten
  // ------------------------------------------------------------------
  private async send(guild: Guild, feed: NewsFeed, item: NewsItem, ping: boolean) {
    const channel = guild.channels.cache.get(feed.channelId);
    if (!channel || !channel.isTextBased() || !("send" in channel)) throw new Error("Kanal nicht gefunden");
    const payload = this.buildMessage(feed, item);
    await (channel as any).send({
      content: ping && feed.roleId ? `<@&${feed.roleId}>` : undefined,
      ...payload,
      allowedMentions: { roles: ping && feed.roleId ? [feed.roleId] : [] },
      flags: ping ? undefined : MessageFlags.SuppressNotifications,
    });
  }

  /** Neuesten Beitrag sofort posten (Test-Button im Dashboard, ohne Ping). */
  public async postLatest(guild: Guild, id: string): Promise<string | null> {
    const feed = this.getFeeds(guild.id).find((f) => f.id === id);
    if (!feed) return "Quelle nicht gefunden.";
    const items = await this.fetchItems(feed);
    if (!items) return "Die Quelle ist gerade nicht erreichbar.";
    const latest = this.filterItems(feed, items)[0];
    if (!latest) return "Es gibt noch keinen passenden Beitrag.";
    try {
      await this.send(guild, feed, latest, false);
      return null;
    } catch (e: any) {
      return `Konnte nicht posten: ${e?.message || e}`;
    }
  }

  public startAutoChecker(client: Client) {
    if (this.interval) return;
    this.client = client;
    console.log("📰 [GameNews] Automatischer Check gestartet (alle 15 Minuten)");
    setTimeout(() => this.runCheck(), 45_000);
    this.interval = setInterval(() => this.runCheck(), CHECK_INTERVAL_MS);
  }

  public runCheck(): Promise<void> {
    if (!this.running) {
      this.running = this.doCheck().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async doCheck() {
    if (!this.client) return;
    // Jede Quelle pro Durchlauf nur einmal abfragen, auch wenn sie in mehreren Kanälen gemeldet wird
    const cache = new Map<string, NewsItem[] | null>();

    for (const [guildId, { feeds }] of Object.entries(this.data.guilds)) {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) continue;
      if (!moduleService.isEnabled(guildId, "gameNews")) continue; // Modul ausgeschaltet

      for (const feed of feeds.filter((f) => f.enabled)) {
        try {
          const cacheKey = `${feed.type}:${feed.appId || ""}:${feed.snapshots ? "s" : ""}`;
          if (!cache.has(cacheKey)) cache.set(cacheKey, await this.fetchItems(feed));
          const items = cache.get(cacheKey);
          if (!items) continue; // Quelle nicht erreichbar -> nichts ändern

          const st = this.state[feed.id];
          if (!st?.initialized) {
            // Erster Abruf: alles Bestehende als gesehen merken, nichts posten
            this.state[feed.id] = { seen: items.map((i) => i.id).slice(0, 50), initialized: true };
            this.saveState();
            continue;
          }

          const fresh = items.filter((i) => !st.seen.includes(i.id));
          if (fresh.length === 0) continue;

          // Alle neuen als gesehen merken (auch gefilterte), VOR dem Senden -> nie doppelt
          st.seen = [...fresh.map((i) => i.id), ...st.seen].slice(0, 50);
          this.saveState();

          const toPost = this.filterItems(feed, fresh).slice(0, MAX_POSTS_PER_FEED_AND_RUN).reverse(); // älteste zuerst
          for (const [idx, item] of toPost.entries()) {
            await this.send(guild, feed, item, idx === 0).catch((e) =>
              console.error(`[GameNews] Konnte "${item.title}" nicht posten:`, e?.message || e)
            );
          }
          if (toPost.length) console.log(`📰 [GameNews] ${toPost.length} neue Beiträge für "${feed.name}" gepostet.`);
        } catch (e) {
          console.error(`[GameNews] Fehler bei "${feed.name}":`, e);
        }
      }
    }
  }

  public catalog() {
    return NEWS_CATALOG.map((c) => ({ ...c, image: c.type === "steam" && c.appId ? steamImage(c.appId) : undefined }));
  }

  public includes() {
    return NEWS_INCLUDES;
  }

  /** Die letzten Beiträge einer Quelle (Detailansicht im Dashboard). */
  public async preview(type: NewsSourceType, appId?: string, snapshots = false) {
    if (!NEWS_INCLUDES[type]) return "Unbekannte Quelle.";
    if (type === "steam" && !/^\d{1,10}$/.test(appId || "")) return "Ungültige Steam-App-ID.";
    const items = await this.fetchItems({ type, appId, snapshots });
    if (!items) return "Die Quelle ist gerade nicht erreichbar.";
    return items.slice(0, 5).map((i) => ({
      title: i.title,
      url: i.url,
      date: i.date,
      text: i.text ? i.text.slice(0, 160) : undefined,
      isPatchnotes: i.isPatchnotes,
      isSnapshot: i.isSnapshot,
    }));
  }
}

export const gameNewsService = new GameNewsService();
