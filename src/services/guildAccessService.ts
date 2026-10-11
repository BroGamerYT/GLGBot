import fs from "fs";
import path from "path";
import { Client, EmbedBuilder, Guild } from "discord.js";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { BRANDING } from "../config/branding";
import { customCommandService } from "./customCommandService";

/**
 * Server-Freigabe (Multi-Guild, max. 5 Server):
 *   - GUILD_ID          = Haupt-Server, immer erlaubt
 *   - ALLOWED_GUILD_IDS = weitere fest erlaubte Server (kommagetrennt, .env)
 *   - data/guild_access.json = im Dashboard freigegebene Server (nur Bot-Besitzer)
 * Der Bot bleibt nur auf Servern, die auf dieser Liste stehen. Insgesamt sind maximal
 * MAX_GUILDS (Standard und Obergrenze: 5) Server erlaubt.
 */
export const HARD_GUILD_LIMIT = 5;

const ACCESS_FILE = path.join(process.cwd(), "data", "guild_access.json");

interface AccessData {
  /** Im Dashboard freigegebene Server */
  allowed: { id: string; name?: string; addedBy?: string; addedAt: number }[];
  /** Entfernte Server (Daten bleiben erhalten, Zeitpunkt der Entfernung) */
  removed: { id: string; name?: string; removedAt: number }[];
}

function splitIds(value: string | undefined): string[] {
  return (value || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{15,25}$/.test(s));
}

class GuildAccessService {
  private data: AccessData = readJsonFile<AccessData>(ACCESS_FILE, { allowed: [], removed: [] });

  private save() {
    fs.mkdirSync(path.dirname(ACCESS_FILE), { recursive: true });
    writeJsonAtomic(ACCESS_FILE, this.data);
  }

  public get mainGuildId(): string {
    return (process.env.GUILD_ID || "").trim();
  }

  public get maxGuilds(): number {
    const n = Number(process.env.MAX_GUILDS || HARD_GUILD_LIMIT);
    return Math.max(1, Math.min(HARD_GUILD_LIMIT, Number.isFinite(n) ? Math.floor(n) : HARD_GUILD_LIMIT));
  }

  /** Server aus der .env (nicht im Dashboard entfernbar) */
  public getEnvGuildIds(): string[] {
    return [...new Set([this.mainGuildId, ...splitIds(process.env.ALLOWED_GUILD_IDS)].filter(Boolean))];
  }

  /** Alle erlaubten Server (Haupt-Server zuerst), begrenzt auf maxGuilds */
  public getAllowedIds(): string[] {
    const all = [...new Set([...this.getEnvGuildIds(), ...this.data.allowed.map((a) => a.id)])];
    return all.slice(0, this.maxGuilds);
  }

  public isAllowed(guildId: string): boolean {
    // Ohne GUILD_ID und ohne Liste: keine Einschränkung (Einzel-Installation ohne Konfiguration)
    if (this.getEnvGuildIds().length === 0 && this.data.allowed.length === 0) return true;
    return this.getAllowedIds().includes(guildId);
  }

  public isMain(guildId: string) {
    return !!this.mainGuildId && guildId === this.mainGuildId;
  }

  /** Bot-Besitzer: BOT_OWNER_ID aus der .env, sonst der Owner des Haupt-Servers */
  public getBotOwnerId(client: Client): string | null {
    const fromEnv = (process.env.BOT_OWNER_ID || "").trim();
    if (fromEnv) return fromEnv;
    const main = this.mainGuildId ? client.guilds.cache.get(this.mainGuildId) : undefined;
    return main?.ownerId || null;
  }

  public getEntries() {
    const env = new Set(this.getEnvGuildIds());
    return this.getAllowedIds().map((id) => {
      const dyn = this.data.allowed.find((a) => a.id === id);
      return {
        id,
        main: this.isMain(id),
        fromEnv: env.has(id),
        name: dyn?.name,
        addedBy: dyn?.addedBy,
        addedAt: dyn?.addedAt,
      };
    });
  }

  public getRemoved() {
    return this.data.removed;
  }

  /** Gibt einen Server frei. Fehlermeldung oder null. */
  public add(guildId: string, name?: string, by?: string): string | null {
    if (!/^\d{15,25}$/.test(guildId)) return "Ungültige Server-ID.";
    if (this.getAllowedIds().includes(guildId)) return "Dieser Server ist bereits freigegeben.";
    if (this.getAllowedIds().length >= this.maxGuilds) return `Es sind bereits ${this.maxGuilds} Server freigegeben (Maximum).`;
    this.data.allowed.push({ id: guildId, name, addedBy: by, addedAt: Date.now() });
    this.data.removed = this.data.removed.filter((r) => r.id !== guildId);
    this.save();
    return null;
  }

  /** Entfernt eine Freigabe (nicht für Server aus der .env). Fehlermeldung oder null. */
  public remove(guildId: string, name?: string): string | null {
    if (this.isMain(guildId)) return "Der Haupt-Server (GUILD_ID) kann nicht entfernt werden.";
    if (this.getEnvGuildIds().includes(guildId)) return "Dieser Server steht in ALLOWED_GUILD_IDS in der .env - dort entfernen.";
    const before = this.data.allowed.length;
    this.data.allowed = this.data.allowed.filter((a) => a.id !== guildId);
    if (this.data.allowed.length === before) return "Server ist nicht freigegeben.";
    this.data.removed = [...this.data.removed.filter((r) => r.id !== guildId), { id: guildId, name, removedAt: Date.now() }];
    this.save();
    return null;
  }

  public setName(guildId: string, name: string) {
    const entry = this.data.allowed.find((a) => a.id === guildId);
    if (entry && entry.name !== name) {
      entry.name = name;
      this.save();
    }
  }

  /** Registriert alle Slash-Befehle direkt für einen Server (sofort verfügbar). */
  public async registerCommands(client: Client, guildId: string) {
    // eingebaute + eigene Befehle dieses Servers
    await customCommandService.syncGuild(client, guildId);
  }

  /** Teilt dem Owner mit, warum der Bot geht, und verlässt den Server. */
  public async rejectGuild(guild: Guild, reason: "not_allowed" | "limit") {
    const text =
      reason === "limit"
        ? `Der Bot ist bereits auf der maximalen Anzahl von ${this.maxGuilds} Servern aktiv.`
        : "Dieser Bot ist privat und nur für freigegebene Server gedacht.";
    try {
      const owner = await guild.fetchOwner();
      await owner.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(`👋 ${BRANDING.bot} hat deinen Server verlassen`)
            .setDescription(
              `Ich wurde gerade auf **${guild.name}** eingeladen.\n\n${text}\n\n` +
                `Wenn du den Bot nutzen möchtest, melde dich beim Betreiber von **${BRANDING.community}**, damit dein Server freigegeben wird.`
            )
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs geschlossen - egal, Server wird trotzdem verlassen
    }
    console.warn(`[GuildAccess] Server verlassen: ${guild.name} (${guild.id}) - ${reason === "limit" ? "Limit erreicht" : "nicht freigegeben"}`);
    await guild.leave().catch((e) => console.error("[GuildAccess] Konnte Server nicht verlassen:", e));
  }

  /** Beim Beitritt: freigegeben -> Befehle registrieren, sonst Owner benachrichtigen & verlassen. */
  public async handleJoin(client: Client, guild: Guild) {
    if (!this.isAllowed(guild.id)) {
      await this.rejectGuild(guild, this.getAllowedIds().length >= this.maxGuilds ? "limit" : "not_allowed");
      return false;
    }
    this.setName(guild.id, guild.name);
    await this.registerCommands(client, guild.id).catch((e) => console.error(`[GuildAccess] Befehle für ${guild.name}:`, e));
    console.log(`[GuildAccess] Freigegebener Server beigetreten: ${guild.name} (${guild.id})`);
    return true;
  }

  /** Beim Start: nicht freigegebene Server verlassen, Befehle für alle freigegebenen registrieren. */
  public async enforce(client: Client) {
    for (const guild of [...client.guilds.cache.values()]) {
      if (!this.isAllowed(guild.id)) {
        await this.rejectGuild(guild, "not_allowed");
        continue;
      }
      this.setName(guild.id, guild.name);
      // auch für den Haupt-Server: deploy-commands kennt die eigenen Befehle nicht
      await this.registerCommands(client, guild.id).catch((e) => console.error(`[GuildAccess] Befehle für ${guild.name}:`, e));
    }
  }
}

export const guildAccessService = new GuildAccessService();
