import fs from "fs";
import path from "path";
import { EmbedBuilder, TextChannel, Client } from "discord.js";
import { rolePanelService } from "./rolePanelService";

export interface FreeGame {
  title: string;
  description: string;
  imageUrl: string;
  storeUrl: string;
  startDate?: string;
  endDate?: string;
}

class FreeGamesService {
  private postedGamesPath = path.join(process.cwd(), "data", "posted_free_games.json");
  private postedGamesCache: Set<string> = new Set();
  private autoCheckerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPostedGames();
  }

  private loadPostedGames() {
    try {
      const dataDir = path.dirname(this.postedGamesPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.postedGamesPath)) {
        const raw = fs.readFileSync(this.postedGamesPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.postedGamesCache = new Set(list);
        }
      }
    } catch (e) {
      console.error("[FreeGames] Fehler beim Laden der bereits geposteten Spiele:", e);
    }
  }

  private savePostedGames() {
    try {
      const list = Array.from(this.postedGamesCache);
      fs.writeFileSync(this.postedGamesPath, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.error("[FreeGames] Fehler beim Speichern der geposteten Spiele:", e);
    }
  }

  // Holt die aktuellen Gratis-Spiele von Epic Games
  public async fetchEpicFreeGames(): Promise<FreeGame[]> {
    try {
      const url = "https://store-site-backend-static.akamaized.net/freeGamesPromotions?locale=de-DE&country=DE&allowCountries=DE";
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return [];

      const json = await res.json();
      const elements: any[] = json?.data?.Catalog?.searchStore?.elements || [];
      const freeGames: FreeGame[] = [];

      for (const el of elements) {
        // Prüfen, ob das Spiel aktuell 100% Rabatt hat
        const promoOffers = el?.promotions?.promotionalOffers?.[0]?.promotionalOffers;
        if (!promoOffers || promoOffers.length === 0) continue;

        const currentPromo = promoOffers.find((p: any) => p.discountSetting?.discountPercentage === 0);
        if (!currentPromo) continue;

        const title = el.title;
        const description = el.description || "Aktuell kostenlos im Epic Games Store verfügbar!";
        const image = el.keyImages?.find((img: any) => img.type === "OfferImageWide")?.url ||
                      el.keyImages?.find((img: any) => img.type === "Thumbnail")?.url ||
                      el.keyImages?.[0]?.url || "";

        const slug = el.productSlug || el.urlSlug || (el.offerMappings?.[0]?.pageSlug) || "";
        const storeUrl = slug ? `https://store.epicgames.com/de/p/${slug}` : "https://store.epicgames.com/de/free-games";

        freeGames.push({
          title,
          description,
          imageUrl: image,
          storeUrl,
          startDate: currentPromo.startDate,
          endDate: currentPromo.endDate,
        });
      }

      return freeGames;
    } catch (e) {
      console.error("[FreeGames] Fehler beim Abrufen der Gratis-Spiele:", e);
      return [];
    }
  }

  // Sendet die aktuellen Gratis-Spiele in den konfigurierten Kanal
  public async postFreeGames(guild: any, forceAll: boolean = true): Promise<{ count: number; channelName?: string }> {
    rolePanelService.loadConfig();
    const cfg = rolePanelService.getConfig(guild.id);
    if (!cfg || !cfg.freeGamesChannelId) {
      return { count: 0 };
    }

    const channel = guild.channels.cache.get(cfg.freeGamesChannelId);
    if (!channel || !channel.isTextBased()) {
      return { count: 0 };
    }

    const games = await this.fetchEpicFreeGames();
    if (games.length === 0) return { count: 0, channelName: channel.name };

    const ping = cfg.freeGamesRoleId ? `<@&${cfg.freeGamesRoleId}> ` : "";
    let postedCount = 0;

    for (const game of games) {
      const gameKey = `${guild.id}_${game.title}_${game.endDate || "promo"}`;
      if (!forceAll && this.postedGamesCache.has(gameKey)) {
        continue;
      }

      const embed = new EmbedBuilder()
        .setColor(0x0078f2) // Epic Games Blau
        .setTitle(`🎁 GRATIS SPIEL: ${game.title}`)
        .setURL(game.storeUrl)
        .setDescription(game.description)
        .addFields(
          { name: "💰 Preis", value: "~~100% Rabatt~~ **0,00 € (KOSTENLOS)**", inline: true },
          { name: "🔗 Zum Store", value: `[Hier kostenlos sichern](${game.storeUrl})`, inline: true }
        )
        .setFooter({ text: "GLGBot Free-Games Alerts | Epic Games Store" })
        .setTimestamp();

      if (game.imageUrl) {
        embed.setImage(game.imageUrl);
      }

      if (game.endDate) {
        const endUnix = Math.floor(new Date(game.endDate).getTime() / 1000);
        embed.addFields({ name: "⏳ Verfügbar bis", value: `<t:${endUnix}:F> (<t:${endUnix}:R>)`, inline: false });
      }

      await (channel as TextChannel).send({
        content: `${ping}🚨 **Neues kostenloses PC-Spiel verfügbar!**`,
        embeds: [embed],
      }).catch(() => null);

      this.postedGamesCache.add(gameKey);
      postedCount++;
    }

    if (postedCount > 0) {
      this.savePostedGames();
    }

    return { count: postedCount, channelName: channel.name };
  }

  // Automatischer Scheduler: Prüft stündlich auf neue Gratis-Spiele und sendet sie unaufgefordert
  public startAutoChecker(client: Client) {
    if (this.autoCheckerInterval) return;

    console.log("🎮 [FreeGames] Automatischer Benachrichtigungs-Checker gestartet (Intervall: 60 Minuten)");

    // Initialer Check nach 20 Sekunden
    setTimeout(async () => {
      await this.runAutoCheck(client);
    }, 20000);

    // Stündlicher Check
    this.autoCheckerInterval = setInterval(async () => {
      await this.runAutoCheck(client);
    }, 60 * 60 * 1000);
  }

  private async runAutoCheck(client: Client) {
    try {
      for (const guild of client.guilds.cache.values()) {
        const result = await this.postFreeGames(guild, false);
        if (result.count > 0) {
          console.log(`🎮 [FreeGames] Automatisch ${result.count} neue Gratis-Spiele auf Server "${guild.name}" gesendet.`);
        }
      }
    } catch (e) {
      console.error("[FreeGames] Fehler im automatischen Checker:", e);
    }
  }
}

export const freeGamesService = new FreeGamesService();

