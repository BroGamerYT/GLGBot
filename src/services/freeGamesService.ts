import fs from "fs";
import path from "path";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { rolePanelService } from "./rolePanelService";
import { moduleService } from "./moduleService";

/**
 * Gratis-Spiele-Tracker (ähnlich PatchBot).
 *
 * Quellen:
 *  - Epic Games Store: direkt über die offizielle Store-Schnittstelle (inkl. "Nächste Woche gratis")
 *  - Steam, GOG, Ubisoft, itch.io & Co.: über die GamerPower-API (https://www.gamerpower.com)
 *    -> GamerPower verlangt einen Link als Quellenangabe, der in jedem Post steht.
 */

export type Store = "epic" | "steam" | "gog" | "ubisoft" | "itch" | "prime" | "other";

export interface FreeGame {
  key: string; // eindeutige ID für "schon gepostet?"
  store: Store;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  originalPrice?: string; // z. B. "19,99 €" oder "$19.99"
  startDate?: string;
  endDate?: string;
  upcoming?: boolean; // erst demnächst gratis (nur Epic)
  keyGiveaway?: boolean; // Key-Verlosung auf Drittseite (Alienware Arena, IndieGala, …) - kein echtes Store-Angebot
  source: "epic" | "gamerpower";
}

export interface FreeGamesSettings {
  epic: boolean;
  steam: boolean;
  gog: boolean;
  other: boolean; // Ubisoft, itch.io, Prime Gaming, …
  upcoming: boolean; // Epic-Vorschau "Nächste Woche gratis"
  keys: boolean; // Key-Verlosungen auf Drittseiten (Konto dort nötig)
  silent?: boolean; // Lautloser Modus (@silent / ohne Ping-Ton)
}

const DEFAULT_SETTINGS: FreeGamesSettings = { epic: true, steam: true, gog: true, other: false, upcoming: false, keys: false, silent: false };

// Echte Store-Seiten - alles andere (Alienware Arena, IndieGala, Gleam …) gilt als Key-Verlosung
const STORE_HOSTS = [
  /(^|\.)store\.steampowered\.com$/,
  /(^|\.)steampowered\.com$/,
  /(^|\.)store\.epicgames\.com$/,
  /(^|\.)epicgames\.com$/,
  /(^|\.)gog\.com$/,
  /(^|\.)ubisoft\.com$/,
  /(^|\.)ubi\.com$/,
  /(^|\.)itch\.io$/,
  /(^|\.)gaming\.amazon\.com$/,
  /(^|\.)luna\.amazon\.com$/,
];
const KEY_SITE_PATTERN =
  /\bkeys?\b|alienware|indiegala|gleam|keyhub|givee|steamgifts|fanatical|gamehag|keydrop|raffle|verlosung|giveaway page/i;

const STORE_INFO: Record<Store, { name: string; emoji: string; color: number }> = {
  epic: { name: "Epic Games Store", emoji: "🟦", color: 0x0078f2 },
  steam: { name: "Steam", emoji: "🎮", color: 0x1b2838 },
  gog: { name: "GOG.com", emoji: "🟪", color: 0x86328a },
  ubisoft: { name: "Ubisoft Store", emoji: "🔷", color: 0x0070ff },
  itch: { name: "itch.io", emoji: "🟥", color: 0xfa5c5c },
  prime: { name: "Prime Gaming", emoji: "👑", color: 0x00a8e1 },
  other: { name: "PC", emoji: "🎁", color: 0x5865f2 },
};

const DATA_DIR = path.join(process.cwd(), "data");
const POSTED_FILE = path.join(DATA_DIR, "posted_free_games.json");
const SETTINGS_FILE = path.join(DATA_DIR, "free_games_config.json");
const TARGETS_FILE = path.join(DATA_DIR, "gamerpower_targets.json"); // Cache: GamerPower-ID -> echte Ziel-URL
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function readJson<T>(file: string, fallback: T): T {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shorten(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

/** "2026-10-15 23:59:00" (GamerPower, UTC) oder ISO -> Unix-Sekunden */
function toUnix(date?: string): number | null {
  if (!date || date === "N/A") return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date) ? date.replace(" ", "T") + "Z" : date;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

class FreeGamesService {
  private posted: Set<string>;
  private settings: Record<string, FreeGamesSettings>;
  private interval: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;

  constructor() {
    const list = readJson<string[]>(POSTED_FILE, []);
    this.posted = new Set(Array.isArray(list) ? list : []);
    this.settings = readJson(SETTINGS_FILE, {});
  }

  // ------------------------------------------------------------------
  //  Einstellungen
  // ------------------------------------------------------------------
  public getSettings(guildId: string): FreeGamesSettings {
    return { ...DEFAULT_SETTINGS, ...(this.settings[guildId] || {}) };
  }

  public updateSettings(guildId: string, patch: Partial<FreeGamesSettings>) {
    this.settings[guildId] = { ...this.getSettings(guildId), ...patch };
    writeJson(SETTINGS_FILE, this.settings);
    return this.settings[guildId];
  }

  private isEnabled(game: FreeGame, s: FreeGamesSettings) {
    if (game.upcoming && !s.upcoming) return false;
    if (game.keyGiveaway && !s.keys) return false;
    if (game.store === "epic") return s.epic;
    if (game.store === "steam") return s.steam;
    if (game.store === "gog") return s.gog;
    return s.other;
  }

  // ------------------------------------------------------------------
  //  Quellen
  // ------------------------------------------------------------------

  /** Epic Games Store: aktuelle + kommende Gratis-Spiele */
  public async fetchEpic(): Promise<FreeGame[] | null> {
    try {
      const res = await fetch(
        "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=de-DE&country=DE&allowCountries=DE",
        { headers: { "User-Agent": "Mozilla/5.0 GLGBot" } }
      );
      if (!res.ok) return null;
      const json: any = await res.json();
      const elements: any[] = json?.data?.Catalog?.searchStore?.elements || [];
      const now = Date.now();
      const games: FreeGame[] = [];

      for (const el of elements) {
        if (!el?.title || /mystery game/i.test(el.title)) continue;

        const current = (el.promotions?.promotionalOffers?.[0]?.promotionalOffers || []).find(
          (p: any) =>
            p.discountSetting?.discountPercentage === 0 &&
            new Date(p.startDate).getTime() <= now &&
            new Date(p.endDate).getTime() > now
        );
        const upcoming = (el.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers || []).find(
          (p: any) => p.discountSetting?.discountPercentage === 0
        );
        const promo = current || upcoming;
        if (!promo) continue;

        const slug =
          el.catalogNs?.mappings?.find((m: any) => m.pageType === "productHome")?.pageSlug ||
          el.catalogNs?.mappings?.[0]?.pageSlug ||
          el.offerMappings?.[0]?.pageSlug ||
          (el.productSlug ? String(el.productSlug).replace(/\/home$/, "") : "");

        const image =
          el.keyImages?.find((i: any) => i.type === "OfferImageWide")?.url ||
          el.keyImages?.find((i: any) => i.type === "DieselStoreFrontWide")?.url ||
          el.keyImages?.find((i: any) => i.type === "Thumbnail")?.url ||
          el.keyImages?.[0]?.url ||
          "";

        const price = el.price?.totalPrice?.fmtPrice?.originalPrice;

        games.push({
          key: `epic:${el.id || normalizeTitle(el.title)}:${promo.startDate}`,
          store: "epic",
          title: el.title,
          description: el.description || "",
          imageUrl: image,
          url: slug ? `https://store.epicgames.com/de/p/${slug}` : "https://store.epicgames.com/de/free-games",
          originalPrice: price && price !== "0" && !/^0[,.]00/.test(price) ? price : undefined,
          startDate: promo.startDate,
          endDate: promo.endDate,
          upcoming: !current,
          source: "epic",
        });
      }
      return games;
    } catch (e) {
      console.error("[FreeGames] Epic-Abfrage fehlgeschlagen:", e);
      return null;
    }
  }

  /** GamerPower: kostenlose Vollversionen für PC (Steam, GOG, Ubisoft, …) */
  public async fetchGamerPower(): Promise<FreeGame[] | null> {
    try {
      const res = await fetch("https://www.gamerpower.com/api/giveaways?platform=pc&type=game&sort-by=date", {
        headers: { "User-Agent": "GLGBot (Discord-Bot)" },
      });
      if (res.status === 201) return []; // keine aktiven Giveaways
      if (!res.ok) return null;
      const list: any[] = await res.json();
      if (!Array.isArray(list)) return null;

      const games = list
        .filter((g) => g && g.status === "Active" && g.type === "Game")
        .map((g): FreeGame => {
          const platforms = String(g.platforms || "").toLowerCase();
          const store: Store = platforms.includes("steam")
            ? "steam"
            : platforms.includes("epic")
              ? "epic"
              : platforms.includes("gog")
                ? "gog"
                : platforms.includes("ubisoft")
                  ? "ubisoft"
                  : platforms.includes("itch")
                    ? "itch"
                    : platforms.includes("prime") || platforms.includes("amazon")
                      ? "prime"
                      : "other";

          const title = String(g.title || "")
            .replace(/\s*\((steam|epic games( store)?|gog|ubisoft( connect)?|itch\.io|pc|prime gaming|drm-free)\)\s*/gi, " ")
            .replace(/\s*(key\s+)?(giveaway|free to keep)\s*$/i, "")
            .trim();

          return {
            key: `gp:${g.id}`,
            store,
            title,
            description: g.description || "",
            imageUrl: g.image || g.thumbnail || "",
            url: g.open_giveaway_url || g.gamerpower_url || "https://www.gamerpower.com",
            originalPrice: g.worth && g.worth !== "N/A" ? g.worth : undefined,
            startDate: g.published_date,
            endDate: g.end_date,
            keyGiveaway: KEY_SITE_PATTERN.test(`${g.title} ${g.instructions || ""}`),
            source: "gamerpower",
          };
        });

      // Wohin führt der Link wirklich? Echte Store-Seite -> direkt dorthin verlinken,
      // sonst (Alienware Arena & Co.) als Key-Verlosung markieren.
      for (const game of games) {
        const target = await this.resolveTarget(game.key, game.url);
        if (!target) continue;
        let host = "";
        try {
          host = new URL(target).hostname.toLowerCase();
        } catch {
          continue;
        }
        if (STORE_HOSTS.some((re) => re.test(host))) {
          game.url = target;
          game.keyGiveaway = false;
          if (/steampowered/.test(host)) game.store = "steam";
          else if (/epicgames/.test(host)) game.store = "epic";
          else if (/gog\.com/.test(host)) game.store = "gog";
        } else if (!/gamerpower\.com$/.test(host)) {
          game.keyGiveaway = true;
        }
      }
      return games;
    } catch (e) {
      console.error("[FreeGames] GamerPower-Abfrage fehlgeschlagen:", e);
      return null;
    }
  }

  /** Folgt dem GamerPower-Link einmal und merkt sich das echte Ziel (Cache in data/). */
  private targets: Record<string, string> = readJson(TARGETS_FILE, {});
  private async resolveTarget(key: string, openUrl: string): Promise<string | null> {
    if (key in this.targets) return this.targets[key] || null;
    if (!/^https?:\/\/(www\.)?gamerpower\.com\//.test(openUrl)) return openUrl;
    let target = "";
    try {
      const res = await fetch(openUrl, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 GLGBot" },
        signal: AbortSignal.timeout(8000),
      });
      const location = res.headers.get("location");
      if (location && res.status >= 300 && res.status < 400) {
        target = new URL(location, openUrl).toString();
      } else if (res.ok) {
        const html = await res.text();
        const m = [...html.matchAll(/(?:url=|location(?:\.href)?\s*=\s*["']|href=["'])(https?:\/\/[^"'\s>]+)/gi)]
          .map((x) => x[1])
          .find((u) => !/gamerpower\.com/i.test(u));
        target = m || "";
      }
    } catch {
      return null; // beim nächsten Mal erneut versuchen
    }
    this.targets[key] = target;
    writeJson(TARGETS_FILE, this.targets);
    return target || null;
  }

  /** Alle aktuellen (und kommenden) Gratis-Spiele, ohne Duplikate. */
  public async fetchAll(): Promise<FreeGame[]> {
    const [epic, gp] = await Promise.all([this.fetchEpic(), this.fetchGamerPower()]);
    const result: FreeGame[] = [...(epic || [])];
    const epicTitles = new Set(result.map((g) => normalizeTitle(g.title)));

    for (const g of gp || []) {
      // Epic-Spiele kommen direkt von Epic (bessere Daten) - GamerPower nur als Ersatz, falls Epic nicht erreichbar
      if (g.store === "epic" && epic !== null) continue;
      if (epicTitles.has(normalizeTitle(g.title))) continue;
      result.push(g);
    }
    // Aktuelle zuerst, dann Vorschau
    return result.sort((a, b) => Number(Boolean(a.upcoming)) - Number(Boolean(b.upcoming)));
  }

  // ------------------------------------------------------------------
  //  Darstellung (PatchBot-Stil)
  // ------------------------------------------------------------------
  public buildMessage(game: FreeGame) {
    const info = STORE_INFO[game.store];
    const end = toUnix(game.endDate);
    const start = toUnix(game.startDate);

    const embed = new EmbedBuilder()
      .setColor(game.upcoming ? 0x4f545c : info.color)
      .setAuthor({ name: `${info.emoji}  ${info.name}${game.upcoming ? " · Bald kostenlos" : " · Kostenlos"}` })
      .setTitle(game.upcoming ? `🔜 ${game.title}` : game.title)
      .setURL(game.url);

    const desc = shorten(game.description, 280);
    const attribution = game.source === "gamerpower" ? "\n\n*Daten von [GamerPower](https://www.gamerpower.com)*" : "";
    const fullDesc = ((desc || "") + attribution).trim();
    if (fullDesc) embed.setDescription(fullDesc);

    const priceText = game.originalPrice ? `~~${game.originalPrice}~~ → **Kostenlos**` : "**Kostenlos**";
    embed.addFields({ name: "💰 Preis", value: priceText, inline: true });

    if (game.upcoming && start) {
      embed.addFields({ name: "📅 Gratis ab", value: `<t:${start}:f>\n(<t:${start}:R>)`, inline: true });
    } else if (end) {
      embed.addFields({ name: "⏳ Gratis bis", value: `<t:${end}:f>\n(<t:${end}:R>)`, inline: true });
    }

    if (game.imageUrl && /^https?:\/\//.test(game.imageUrl)) embed.setImage(game.imageUrl);
    embed.setFooter({ text: "GLGBot Free-Games" }).setTimestamp();

    return { embeds: [embed], components: [this.buildButtons(game)] };
  }

  /** Link zur Weiterleitungsseite im Dashboard, die Steam bzw. den Epic Launcher direkt öffnet. */
  public appLink(game: FreeGame): { url: string; label: string } | null {
    const base = (process.env.DASHBOARD_URL || "").replace(/\/+$/, "");
    if (!/^https:\/\//.test(base)) return null;
    const steam = game.url.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (steam) return { url: `${base}/go/steam/${steam[1]}`, label: "In Steam öffnen" };
    const epic = game.url.match(/store\.epicgames\.com\/(?:[a-z-]+\/)?p\/([a-z0-9-]+)/i);
    if (epic) return { url: `${base}/go/epic/${epic[1]}`, label: "Im Epic Launcher öffnen" };
    return null;
  }

  public buildButtons(game: FreeGame, withTitle = false) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const app = this.appLink(game);
    const short = game.title.length > 40 ? game.title.slice(0, 39) + "…" : game.title;
    if (app) {
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(withTitle ? `${short} · ${app.label}` : app.label)
          .setEmoji("🎮")
          .setURL(app.url),
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Im Browser").setEmoji("🌐").setURL(game.url)
      );
    } else {
      const label = game.upcoming ? "Im Store ansehen" : "Kostenlos sichern";
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(withTitle ? `${short} · ${label}` : label)
          .setEmoji(game.upcoming ? "👀" : "🎁")
          .setURL(game.url)
      );
    }
    return row;
  }

  // ------------------------------------------------------------------
  //  Posten
  // ------------------------------------------------------------------

  /**
   * Postet alle noch nicht geposteten Gratis-Spiele in den Free-Games-Kanal.
   * Die Rolle wird nur EINMAL pro Durchlauf gepingt (beim ersten neuen Spiel).
   * @param repostAll true = auch bereits gepostete Spiele erneut posten (ohne Ping)
   */
  public async postFreeGames(guild: Guild, repostAll = false): Promise<{ count: number; channelId?: string; error?: string }> {
    const cfg = rolePanelService.getConfig(guild.id);
    if (!cfg?.freeGamesChannelId) return { count: 0, error: "no_channel" };

    const channel = guild.channels.cache.get(cfg.freeGamesChannelId);
    if (!channel || !channel.isTextBased()) return { count: 0, error: "no_channel" };

    const settings = this.getSettings(guild.id);
    const games = (await this.fetchAll()).filter((g) => this.isEnabled(g, settings));
    const isPosted = (g: FreeGame) =>
      this.posted.has(`${guild.id}:${g.key}`) ||
      // Altes Format (vor dem Umbau) - verhindert, dass das aktuelle Epic-Spiel nochmal kommt
      (g.store === "epic" && this.posted.has(`${guild.id}_${g.title}_${g.endDate || "promo"}`));

    // Allererster Durchlauf mit GamerPower auf diesem Server: nur Aktionen der letzten 3 Tage posten,
    // ältere still als "bekannt" markieren -> keine Flut von 20 Posts beim ersten Start
    const firstGpRun = ![...this.posted].some((k) => k.startsWith(`${guild.id}:gp:`));
    if (firstGpRun && !repostAll) {
      const cutoff = Date.now() / 1000 - 3 * 24 * 3600;
      for (const g of games) {
        const published = toUnix(g.startDate);
        if (g.source === "gamerpower" && published !== null && published < cutoff) this.posted.add(`${guild.id}:${g.key}`);
      }
      // Marker, damit das nur einmal passiert
      this.posted.add(`${guild.id}:gp:init`);
      writeJson(POSTED_FILE, [...this.posted]);
    }

    const toPost = games.filter((g) => repostAll || !isPosted(g));

    // Bis zu 5 Spiele pro Nachricht (Discord: max. 10 Embeds / 5 Button-Reihen).
    // Nur die ERSTE Nachricht pingt und macht einen Ton - weitere gehen lautlos raus (wie @silent).
    let count = 0;
    let sentMessages = 0;
    const nowFree = toPost.filter((g) => !g.upcoming);
    for (let i = 0; i < toPost.length; i += 5) {
      const batch = toPost.slice(i, i + 5);
      const first = sentMessages === 0;
      const hasFree = batch.some((g) => !g.upcoming);

      let content: string | undefined;
      if (first && !repostAll) {
        const ping = cfg.freeGamesRoleId && hasFree ? `<@&${cfg.freeGamesRoleId}> ` : "";
        const intro =
          nowFree.length > 1 ? `🚨 **${nowFree.length} neue Gratis-Spiele!**` : nowFree.length === 1 ? "🚨 **Neues Gratis-Spiel!**" : "🔜 **Bald kostenlos:**";
        const rawContent = ping + intro;
        content = settings.silent ? `@silent ${rawContent}` : rawContent;
      }

      const flags = settings.silent || (!first || repostAll) ? MessageFlags.SuppressNotifications : undefined;

      try {
        await (channel as TextChannel).send({
          content,
          embeds: batch.map((g) => this.buildMessage(g).embeds[0]),
          components: batch.map((g) => this.buildButtons(g, batch.length > 1)),
          allowedMentions: { roles: cfg.freeGamesRoleId && first && !repostAll ? [cfg.freeGamesRoleId] : [] },
          flags,
        });
        for (const g of batch) this.posted.add(`${guild.id}:${g.key}`);
        count += batch.length;
        sentMessages++;
      } catch (e) {
        // Nicht als gepostet markieren -> wird beim nächsten Durchlauf erneut versucht
        console.error(`[FreeGames] Konnte ${batch.length} Spiel(e) nicht posten:`, e);
      }
    }

    if (count > 0) writeJson(POSTED_FILE, [...this.posted]);
    return { count, channelId: channel.id };
  }

  // ------------------------------------------------------------------
  //  Automatik
  // ------------------------------------------------------------------
  public startAutoChecker(client: Client) {
    if (this.interval) return;
    console.log("🎮 [FreeGames] Automatischer Check gestartet (alle 30 Minuten, Epic + Steam + GOG + mehr)");
    setTimeout(() => this.runAutoCheck(client), 20_000);
    this.interval = setInterval(() => this.runAutoCheck(client), CHECK_INTERVAL_MS);
  }

  public runAutoCheck(client: Client): Promise<void> {
    // Nie zwei Durchläufe gleichzeitig (sonst doppelte Posts)
    if (!this.running) {
      this.running = (async () => {
        for (const guild of client.guilds.cache.values()) {
          if (!moduleService.isEnabled(guild.id, "freeGames")) continue; // Modul ausgeschaltet
          const r = await this.postFreeGames(guild).catch((e) => {
            console.error("[FreeGames] Fehler im automatischen Check:", e);
            return { count: 0 };
          });
          if (r.count > 0) console.log(`🎮 [FreeGames] ${r.count} neue Gratis-Spiele auf "${guild.name}" gepostet.`);
        }
      })().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }
}

export const freeGamesService = new FreeGamesService();
