import crypto from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  TextChannel,
} from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { BRANDING } from "../config/branding";
import { moduleService } from "./moduleService";

export type ReleasePlatform = "PC" | "PS5" | "Xbox" | "Switch" | "Game Pass";

export type ReleaseCategory = "game" | "major_update" | "dlc";

export interface GameRelease {
  id: string;
  title: string;
  releaseDate: string; // Format: "YYYY-MM-DD"
  platforms: ReleasePlatform[];
  genre: string;
  category?: ReleaseCategory;
  isTripleA?: boolean;
  isServerGame?: boolean;
  description?: string;
  coverUrl?: string;
  storeUrl?: string;
  trailerUrl?: string;
  isCurated?: boolean;
  addedBy?: string;
  createdAt: number;
}

export interface ReleaseConfig {
  channelId?: string;
  pingRoleId?: string;
  weeklyPostEnabled: boolean;
  weeklyPostDay: number; // 1 = Montag
  weeklyPostHour: number; // 10 = 10:00 Uhr
  lastWeeklyPostDate?: string; // "YYYY-MM-DD"
  customReleases: GameRelease[];
}

export const CURATED_RELEASES: GameRelease[] = [
  // --- Aktive Server-Spiele & Große Updates ---
  {
    id: "curated-ets2-nordic",
    title: "Euro Truck Simulator 2 – Nordic Horizons DLC & 1.54 Update",
    releaseDate: "2026-11-12",
    platforms: ["PC"],
    genre: "Simulation / Open World",
    category: "major_update",
    isServerGame: true,
    description: "Riesige Kartenerweiterung für den Norden Europas: Norwegen, Schweden und Finnland bis zum Polarkreis inklusive technischer Überarbeitung.",
    coverUrl: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-cod-bo6-update",
    title: "Call of Duty: Black Ops 6 – Season 1 Reloaded & Warzone Integration",
    releaseDate: "2026-11-14",
    platforms: ["PC", "PS5", "Xbox", "Game Pass"],
    genre: "Ego-Shooter / Action",
    category: "major_update",
    isTripleA: true,
    isServerGame: true,
    description: "Großes Content-Update mit neuen Mehrspieler-Karten, Waffen, neuem Zombies-Kapitel und voller Warzone-Integration.",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/1938090/Call_of_Duty/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-gta-online-winter",
    title: "GTA Online – Großes Winter Heist & Business Update 2026",
    releaseDate: "2026-12-10",
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Action / Open World / Multiplayer",
    category: "major_update",
    isTripleA: true,
    isServerGame: true,
    description: "Das traditionell größte Update des Jahres für GTA Online: Neuer Heist-Raid, exklusive Immobilien, Schneefall-Event und neue Luxusfahrzeuge.",
    coverUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-grayzone-nightops",
    title: "Gray Zone Warfare – Major Update 0.2 'Night Ops'",
    releaseDate: "2026-11-25",
    platforms: ["PC"],
    genre: "Taktik-Shooter / Extraction",
    category: "major_update",
    isServerGame: true,
    description: "Vollständiger dynamischer Tag-Nacht-Zyklus, Nachtsichtgeräte, NVG-Optiken, überarbeitete KI-Wahrnehmung und 20+ neue Missionen.",
    coverUrl: "https://images.unsplash.com/photo-1552824792-7cf513c9320e?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/2479810/Gray_Zone_Warfare/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-minecraft-update",
    title: "Minecraft Java & Bedrock – Bundles & Bravery (1.22 Update)",
    releaseDate: "2026-11-05",
    platforms: ["PC", "PS5", "Xbox", "Switch", "Game Pass"],
    genre: "Sandbox / Survival",
    category: "major_update",
    isServerGame: true,
    description: "Offizielles Bündel-System für das Inventar, neue Rüstungsverzierungen, härtere Erkundungsherausforderungen und verbesserte Weltengenerierung.",
    coverUrl: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://www.minecraft.net/",
    isCurated: true,
    createdAt: 1728640000000,
  },

  // --- Große Triple-A Blockbuster Releases ---
  {
    id: "curated-gta6",
    title: "Grand Theft Auto VI",
    releaseDate: "2026-11-20",
    platforms: ["PS5", "Xbox"],
    genre: "Action / Open World",
    category: "game",
    isTripleA: true,
    description: "Kehre zurück nach Vice City im nächsten Blockbuster von Rockstar Games.",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://www.rockstargames.com/VI",
    trailerUrl: "https://www.youtube.com/watch?v=QdBZY2fkU-0",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-mhwilds",
    title: "Monster Hunter Wilds",
    releaseDate: "2026-10-28",
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Action-RPG",
    category: "game",
    isTripleA: true,
    description: "Erkunde wilde neue Ökosysteme und jage gewaltige Monster in dynamischen Landschaften.",
    coverUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/2246340/Monster_Hunter_Wilds/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-doomdark",
    title: "DOOM: The Dark Ages",
    releaseDate: "2026-11-15",
    platforms: ["PC", "PS5", "Xbox", "Game Pass"],
    genre: "Ego-Shooter",
    category: "game",
    isTripleA: true,
    description: "Das Prequel zu DOOM (2016) und DOOM Eternal in einer düsteren mittelalterlichen Hölle.",
    coverUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://bethesda.net/game/doom-the-dark-ages",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-borderlands4",
    title: "Borderlands 4",
    releaseDate: "2026-12-15",
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Looter-Shooter / Action-RPG",
    category: "game",
    isTripleA: true,
    description: "Entkomme von einem neuen mysteriösen Planeten im nächsten Kapitel des ultimativen Looter-Shooters von Gearbox.",
    coverUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/1285190/Borderlands_4/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-civ7",
    title: "Sid Meier's Civilization VII",
    releaseDate: "2026-10-24",
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "Rundenstrategie / 4X",
    category: "game",
    isTripleA: true,
    description: "Führe deine Zivilisation durch Zeitalter des menschlichen Fortschritts.",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/1295660/Sid_Meiers_Civilization_VII/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-fable",
    title: "Fable",
    releaseDate: "2026-12-05",
    platforms: ["PC", "Xbox", "Game Pass"],
    genre: "Action-RPG / Fantasy",
    category: "game",
    isTripleA: true,
    description: "Ein neuer Beginn für das legendäre Rollenspiel-Franchise von Playground Games.",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://www.xbox.com/games/fable",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-mafia",
    title: "Mafia: The Old Country",
    releaseDate: "2026-11-30",
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Action-Adventure",
    category: "game",
    isTripleA: true,
    description: "Erlebe die Ursprünge des organisierten Verbrechens im Sizilien der 1900er-Jahre.",
    coverUrl: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/2182300/Mafia_The_Old_Country/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-subnautica2",
    title: "Subnautica 2",
    releaseDate: "2026-12-18",
    platforms: ["PC", "Xbox", "Game Pass"],
    genre: "Survival / Erkundung",
    category: "game",
    description: "Erkunde einen brandneuen Ozean-Planeten mit optionalem 4-Spieler Koop-Modus.",
    coverUrl: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=600&auto=format&fit=crop&q=80",
    storeUrl: "https://store.steampowered.com/app/1962700/Subnautica_2/",
    isCurated: true,
    createdAt: 1728640000000,
  },
  {
    id: "curated-ghost",
    title: "Ghost of Yōtei",
    releaseDate: "2026-12-22",
    platforms: ["PS5"],
    genre: "Action-Adventure",
    category: "game",
    isTripleA: true,
    description: "Der Nachfolger von Ghost of Tsushima: Eine neue Legende rund um den Berg Yōtei im Jahr 1603.",
    coverUrl: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&auto=format&fit=crop&q=80",
    isCurated: true,
    createdAt: 1728640000000,
  },
];

export const DEFAULT_RELEASE_CONFIG: ReleaseConfig = {
  weeklyPostEnabled: true,
  weeklyPostDay: 1, // Montag
  weeklyPostHour: 10, // 10:00 Uhr
  customReleases: [],
};

const store = new GuildStore<ReleaseConfig>("game_releases.json", () => ({ ...DEFAULT_RELEASE_CONFIG }));

class ReleaseService {
  private schedulerInterval: NodeJS.Timeout | null = null;

  public getConfig(guildId: string): ReleaseConfig {
    return store.get(guildId);
  }

  public setConfig(guildId: string, patch: Partial<ReleaseConfig>): ReleaseConfig {
    return store.update(guildId, (c) => {
      if (patch.channelId !== undefined) c.channelId = patch.channelId || undefined;
      if (patch.pingRoleId !== undefined) c.pingRoleId = patch.pingRoleId || undefined;
      if (typeof patch.weeklyPostEnabled === "boolean") c.weeklyPostEnabled = patch.weeklyPostEnabled;
      if (typeof patch.weeklyPostDay === "number") c.weeklyPostDay = Math.max(0, Math.min(6, patch.weeklyPostDay));
      if (typeof patch.weeklyPostHour === "number") c.weeklyPostHour = Math.max(0, Math.min(23, patch.weeklyPostHour));
      if (patch.lastWeeklyPostDate !== undefined) c.lastWeeklyPostDate = patch.lastWeeklyPostDate;
      if (Array.isArray(patch.customReleases)) c.customReleases = patch.customReleases;
    });
  }

  /** Gibt alle Releases (kuratierte + eigene Server-Releases) sortiert nach Datum zurück */
  public getAllReleases(guildId: string): GameRelease[] {
    const cfg = this.getConfig(guildId);
    const custom = cfg.customReleases || [];
    const all = [...CURATED_RELEASES, ...custom];

    // Deduplizieren nach ID und sortieren
    const map = new Map<string, GameRelease>();
    for (const r of all) {
      map.set(r.id, r);
    }

    return Array.from(map.values()).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  }

  public getFilteredReleases(
    guildId: string,
    options: {
      timeframe?: "week" | "month" | "next_month" | "upcoming" | "all";
      platform?: string;
    } = {}
  ): GameRelease[] {
    const all = this.getAllReleases(guildId);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const timeframe = options.timeframe || "upcoming";
    const platform = options.platform?.toLowerCase();

    // Start- und End-Daten für Filter
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Montag
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
    const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    return all.filter((r) => {
      // 1. Plattform-Filter
      if (platform && platform !== "alle") {
        const matchesPlatform = r.platforms.some((p) => {
          const pl = p.toLowerCase();
          if (platform === "pc") return pl.includes("pc");
          if (platform === "ps5" || platform === "playstation") return pl.includes("ps5");
          if (platform === "xbox") return pl.includes("xbox");
          if (platform === "switch" || platform === "nintendo") return pl.includes("switch");
          if (platform === "gamepass" || platform === "game pass") return pl.includes("game pass");
          return false;
        });
        if (!matchesPlatform) return false;
      }

      // 2. Zeitraum-Filter
      if (timeframe === "all") return true;

      if (timeframe === "week") {
        return r.releaseDate >= startOfWeekStr && r.releaseDate <= endOfWeekStr;
      }

      if (timeframe === "month") {
        const rDate = new Date(r.releaseDate);
        return rDate.getFullYear() === currentYear && rDate.getMonth() === currentMonth;
      }

      if (timeframe === "next_month") {
        const rDate = new Date(r.releaseDate);
        return rDate.getFullYear() === nextMonthYear && rDate.getMonth() === nextMonth;
      }

      // upcoming (Standard): alles ab heute
      return r.releaseDate >= todayStr;
    });
  }

  public addRelease(
    guildId: string,
    data: Omit<GameRelease, "id" | "createdAt" | "isCurated">,
    addedBy?: string
  ): GameRelease {
    const id = `custom-${crypto.randomBytes(4).toString("hex")}`;
    const newRelease: GameRelease = {
      ...data,
      id,
      isCurated: false,
      addedBy,
      createdAt: Date.now(),
    };

    store.update(guildId, (c) => {
      if (!c.customReleases) c.customReleases = [];
      c.customReleases.push(newRelease);
    });

    return newRelease;
  }

  public updateRelease(guildId: string, id: string, patch: Partial<GameRelease>): GameRelease | null {
    let updated: GameRelease | null = null;
    store.update(guildId, (c) => {
      if (!c.customReleases) return;
      const idx = c.customReleases.findIndex((r) => r.id === id);
      if (idx >= 0) {
        c.customReleases[idx] = { ...c.customReleases[idx], ...patch, id };
        updated = c.customReleases[idx];
      }
    });
    return updated;
  }

  public deleteRelease(guildId: string, id: string): boolean {
    let removed = false;
    store.update(guildId, (c) => {
      if (!c.customReleases) return;
      const lenBefore = c.customReleases.length;
      c.customReleases = c.customReleases.filter((r) => r.id !== id);
      removed = c.customReleases.length < lenBefore;
    });
    return removed;
  }

  /** Erstellt das wöchentliche Release-Embed für Discord */
  public buildWeeklyEmbed(guild: Guild, releases: GameRelease[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📅 Spiele-Releases dieser Woche")
      .setDescription(
        releases.length === 0
          ? "In dieser Woche stehen keine größeren Spiele-Neuveröffentlichungen an. Schau im Web-Dashboard vorbei für alle kommenden Titel!"
          : `Hier sind die wichtigsten Spiele-Releases der laufenden Woche:\n`
      )
      .setFooter({ text: `${BRANDING.community} • Game-Release Kalender` })
      .setTimestamp();

    for (const r of releases.slice(0, 8)) {
      const dateParts = r.releaseDate.split("-");
      const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
      const platIcons = r.platforms
        .map((p) => {
          if (p === "PC") return "💻 PC";
          if (p === "PS5") return "🎮 PS5";
          if (p === "Xbox") return "🟢 Xbox";
          if (p === "Switch") return "🔴 Switch";
          if (p === "Game Pass") return "🎫 Game Pass";
          return p;
        })
        .join(" • ");

      let val = `**Datum:** \`${formattedDate}\`\n**Plattformen:** ${platIcons}\n**Genre:** ${r.genre}`;
      if (r.storeUrl) {
        val += `\n[🛒 Store-Link](${r.storeUrl})`;
      }
      if (r.trailerUrl) {
        val += ` • [🎥 Trailer](${r.trailerUrl})`;
      }

      embed.addFields({
        name: `🎮 ${r.title}`,
        value: val,
        inline: false,
      });
    }

    if (releases.length > 0 && releases[0].coverUrl) {
      embed.setThumbnail(releases[0].coverUrl);
    }

    return embed;
  }

  /** Postet die Releases der Woche in den konfigurierten Kanal */
  public async postWeeklyReleases(client: Client, guildId: string): Promise<boolean> {
    const cfg = this.getConfig(guildId);
    if (!cfg.channelId) return false;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;

    const channel = guild.channels.cache.get(cfg.channelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased() || !("send" in channel)) return false;

    const weekReleases = this.getFilteredReleases(guildId, { timeframe: "week" });
    const embed = this.buildWeeklyEmbed(guild, weekReleases);

    const row = new ActionRowBuilder<ButtonBuilder>();
    const dashboardUrl = process.env.DASHBOARD_URL || "";
    if (dashboardUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Vollständiger Kalender im Dashboard")
          .setStyle(ButtonStyle.Link)
          .setURL(`${dashboardUrl.replace(/\/+$/, "")}/releases`)
      );
    }

    const content = cfg.pingRoleId ? `<@&${cfg.pingRoleId}>` : undefined;

    await channel.send({
      content,
      embeds: [embed],
      components: row.components.length > 0 ? [row] : undefined,
    });

    this.setConfig(guildId, { lastWeeklyPostDate: new Date().toISOString().slice(0, 10) });
    return true;
  }

  /** Startet den automatischen Scheduler (prüft jede Minute) */
  public startWeeklyScheduler(client: Client) {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(async () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sonntag, 1 = Montag ...
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayStr = now.toISOString().slice(0, 10);

      // Nur zu Beginn der vollen Stunde prüfen (Minute 0)
      if (currentMinute !== 0) return;

      for (const guild of client.guilds.cache.values()) {
        if (!moduleService.isEnabled(guild.id, "releases")) continue;

        const cfg = this.getConfig(guild.id);
        if (!cfg.weeklyPostEnabled || !cfg.channelId) continue;
        if (cfg.lastWeeklyPostDate === todayStr) continue;

        if (currentDay === cfg.weeklyPostDay && currentHour === cfg.weeklyPostHour) {
          try {
            await this.postWeeklyReleases(client, guild.id);
            console.log(`[ReleaseService] Wöchentlicher Release-Post für ${guild.name} erfolgreich versendet.`);
          } catch (e) {
            console.error(`[ReleaseService] Fehler beim Posten der Wochen-Releases für ${guild.name}:`, e);
          }
        }
      }
    }, 60000);

    console.log("⏱️ [ReleaseService] Release-Kalender Scheduler gestartet (Wochen-Post Prüfung aktiv).");
  }
}

export const releaseService = new ReleaseService();
