import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import { Client, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel, NewsChannel } from "discord.js";
import { freeGamesService } from "../services/freeGamesService";
import { rulesService } from "../services/rulesService";
import { rolePanelService } from "../services/rolePanelService";
import { gameNewsService } from "../services/gameNewsService";
import { auditLogService } from "../services/auditLogService";
import { backupService } from "../services/backupService";
import { ticketService } from "../services/ticketService";
import { statsService } from "../services/statsService";
import { moderationService } from "../services/moderationService";
import { prisonService } from "../services/prisonService";
import { blacklistService } from "../services/blacklistService";
import { setupService, SETUP_MODULES, MODULE_INFO } from "../services/setupService";
import { guildAccessService } from "../services/guildAccessService";
import { dailyService } from "../services/dailyService";
import { statsChannelsService, COUNTERS } from "../services/statsChannelsService";
import { birthdayService, DEFAULT_BIRTHDAY_MESSAGE } from "../services/birthdayService";
import { announcementService } from "../services/announcementService";
import { customCommandService, MAX_CUSTOM_COMMANDS } from "../services/customCommandService";
import { welcomeService, WELCOME_DEFAULTS } from "../services/welcomeService";
import { gameServerService, MAX_GAME_SERVERS, DEFAULT_PORTS } from "../services/gameServerService";
import { moduleService } from "../services/moduleService";
import { clipService } from "../services/clipService";
import { liveStreamService } from "../services/liveStreamService";
import { releaseService } from "../services/releaseService";
import { economyService } from "../services/economyService";
import { templateService } from "../services/templateService";
import { authCodeService } from "../services/authCodeService";
import { systemService } from "../services/systemService";
import { radioService } from "../services/radioService";
import { musicService } from "../services/musicService";
import { musicPrefsService } from "../services/musicPrefsService";
import { voiceDuckingService } from "../services/voiceDuckingService";
import { trackMusicChannel } from "../services/musicChannelCleanup";
import { musicBotManager } from "../services/musicBotManager";
import { CHANNEL_STYLES } from "../utils/fontUtils";

/**
 * Interne Schnittstelle für das Web-Dashboard.
 *
 * - lauscht NUR auf 127.0.0.1 (von außen nicht erreichbar)
 * - jede Anfrage braucht den Header "x-bot-token" (= INTERNAL_API_TOKEN, sonst SESSION_SECRET aus der .env)
 * - Port: BOT_API_PORT (Standard 3101)
 */

const PORT = Number(process.env.BOT_API_PORT || 3101);

function getToken(): string | null {
  const t = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  return t.length >= 32 ? t : null;
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length < 32 || b.length < 32) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  try {
    const json = JSON.stringify(body, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(json);
  } catch (err: any) {
    console.error("[BotAPI] Fehler beim Serialisieren der Antwort:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ error: "Interner Serverfehler bei der API-Antwort." }));
  }
}

export class PayloadTooLargeError extends Error {
  public status = 413;
  constructor(message = "Anfrage zu groß (maximal 512 KB erlaubt).") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  public status = 400;
  constructor(message = "Ungültiges JSON-Format im Anfrage-Body.") {
    super(message);
    this.name = "InvalidJsonError";
  }
}

async function readBody(req: http.IncomingMessage, maxBytes = 512 * 1024): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new PayloadTooLargeError(`Anfrage zu groß (maximal ${Math.floor(maxBytes / (1024 * 1024)) || 1} MB erlaubt).`);
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new InvalidJsonError();
  }
}

async function readRawBody(req: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new PayloadTooLargeError(`Anfrage zu groß (maximal ${Math.floor(maxBytes / (1024 * 1024))} MB erlaubt).`);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

const NOTES_FILE = path.join(__dirname, "../../data/admin_notes.json");
function loadAdminNotes(): Record<string, string> {
  try {
    if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8"));
  } catch {}
  return {};
}
/** Notizen-Schlüssel: Haupt-Server wie bisher nur User-ID, weitere Server "guildId:userId" */
function noteKey(guildId: string, userId: string) {
  const main = (process.env.GUILD_ID || "").trim();
  return !main || guildId === main ? userId : `${guildId}:${userId}`;
}
function saveAdminNotes(notes: Record<string, string>) {
  try {
    writeJsonAtomic(NOTES_FILE, notes);
  } catch {}
}

export function startInternalApi(client: Client) {
  const token = getToken();
  if (!token) {
    console.warn("⚠️ [BotAPI] Kein SESSION_SECRET/INTERNAL_API_TOKEN (min. 32 Zeichen) - Dashboard-Aktionen sind deaktiviert.");
    return;
  }

  const server = http.createServer(async (req, res) => {
    const route = `${req.method} ${(req.url || "").split("?")[0]}`;

    try {
      const given = String(req.headers["x-bot-token"] || "");
      if (!safeEqual(given, token)) return send(res, 401, { error: "Nicht autorisiert." });

    // ---------------- Server-übergreifend (ohne aktiven Server) ----------------
    if (route === "GET /guilds") {
      // Freigegebene Server, auf denen der Bot ist (für Rechteprüfung & Server-Wechsel im Dashboard)
      const guilds = guildAccessService
        .getAllowedIds()
        .map((id) => client.guilds.cache.get(id))
        .filter((g): g is NonNullable<typeof g> => !!g)
        .map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL({ size: 64 }) || null,
          memberCount: g.memberCount,
          main: guildAccessService.isMain(g.id),
        }));
      return send(res, 200, { guilds, mainGuildId: guildAccessService.mainGuildId || null });
    }

    if (route === "POST /auth/verify-code") {
      const body = await readBody(req);
      const code = String(body.code || "");
      if (!code) return send(res, 400, { error: "Code fehlt." });
      const result = await authCodeService.verifyCode(code, client);
      if (!result.valid) return send(res, 400, { error: result.error || "Ungültiger Code." });
      return send(res, 200, result);
    }

    // ---------------- System-Manager (Logs & Neustart) ----------------
    if (route === "GET /system/logs") {
      const parsedUrl = new URL(req.url || "", "http://localhost");
      const service = (parsedUrl.searchParams.get("service") || "all") as any;
      const limit = parseInt(parsedUrl.searchParams.get("limit") || "150", 10);
      const query = parsedUrl.searchParams.get("q") || "";
      const level = (parsedUrl.searchParams.get("level") || "all") as any;
      const data = await systemService.getLogs({ service, limit, query, level });
      return send(res, 200, data);
    }

    if (route === "POST /system/restart") {
      const body = await readBody(req);
      const rawTarget = String(body?.target || "bot").toLowerCase();
      if (rawTarget !== "bot" && rawTarget !== "web" && rawTarget !== "all") {
        return send(res, 400, { error: "Ungültiges Neustart-Ziel. Erlaubt: bot, web, all." });
      }
      const result = await systemService.restart(rawTarget as "bot" | "web" | "all");
      return send(res, 200, result);
    }

    if (route === "POST /system/logs/clear") {
      const result = await systemService.clearLogs();
      return send(res, 200, result);
    }

    // Aktiver Server: vom Dashboard per Header gewählt, sonst Haupt-Server (GUILD_ID)
    const requested = String(req.headers["x-guild-id"] || "").trim();
    const guildId =
      requested && guildAccessService.isAllowed(requested) && client.guilds.cache.has(requested)
        ? requested
        : process.env.GUILD_ID || "";
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return send(res, 503, { error: "Bot ist nicht mit dem Server verbunden (GUILD_ID prüfen)." });
    // Wer im Dashboard eingeloggt ist (für den Verlauf)
    const by = decodeURIComponent(String(req.headers["x-dashboard-user"] || "")).slice(0, 64) || undefined;
    const isLoggedIn = req.headers["x-dashboard-auth"] === "1";
    const actorId = String(req.headers["x-dashboard-user-id"] || "");

    // IDOR-Schutz: Wenn ein Nutzer eingeloggt ist (und nicht Bot-Owner), muss er Mitglied des angefragten Servers sein
    if (isLoggedIn && actorId && !guildAccessService.isBotOwner(actorId, client)) {
      const actorMember = await guild.members.fetch(actorId).catch(() => null);
      if (!actorMember) {
        return send(res, 403, { error: "Keine Berechtigung: Du bist kein Mitglied dieses Servers." });
      }
    }
    /** Eingeloggtes Dashboard-Mitglied (für Rangprüfungen). */
    const getActor = async () => (actorId ? await guild.members.fetch(actorId).catch(() => null) : null);
    const canManageBackups = async () => {
      const actor = await getActor();
      return !!actor && (
        actor.id === guild.ownerId ||
        actor.permissions.has(PermissionFlagsBits.Administrator) ||
        actor.permissions.has(PermissionFlagsBits.ManageGuild)
      );
    };
    const getRoleManagerActor = async () => {
      const actor = await getActor();
      if (!actor) return { actor: null, error: "Anmeldung mit Server-Verwaltungsrechten erforderlich." };
      const owner = actor.id === guild.ownerId;
      if (!owner && !actor.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return { actor, error: "Dir fehlt die Discord-Berechtigung „Rollen verwalten“." };
      }
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return { actor, error: "Der Bot benötigt die Discord-Berechtigung „Rollen verwalten“." };
      }
      return { actor, error: null };
    };
    const canEditRole = (role: import("discord.js").Role, actor: import("discord.js").GuildMember) => {
      if (role.id === guild.id || role.managed) return false;
      if (!guild.members.me || guild.members.me.roles.highest.position <= role.position) return false;
      return actor.id === guild.ownerId || actor.roles.highest.position > role.position;
    };
    const dangerousRolePermissions =
      PermissionFlagsBits.Administrator |
      PermissionFlagsBits.ManageGuild |
      PermissionFlagsBits.ManageRoles |
      PermissionFlagsBits.ManageChannels |
      PermissionFlagsBits.BanMembers |
      PermissionFlagsBits.KickMembers |
      PermissionFlagsBits.ManageWebhooks;
    const parseRolePermissionChanges = (body: Record<string, unknown>, current = BigInt(0)) => {
      if (!body || typeof body !== "object" || !body.permissions || typeof body.permissions !== "object" || Array.isArray(body.permissions)) {
        return { permissions: current, error: null };
      }
      let permissions = current;
      for (const [name, enabled] of Object.entries(body.permissions as Record<string, unknown>)) {
        const flag = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];
        if (typeof enabled !== "boolean" || typeof flag !== "bigint") {
          return { permissions: current, error: `Ungültige Berechtigung: ${name}` };
        }
        permissions = enabled ? permissions | flag : permissions & ~flag;
      }
      return { permissions, error: null };
    };
    /** Owner & Administratoren dürfen alles, alle anderen nur Mitglieder bzw. Rollen UNTER ihrer höchsten Rolle. */
    const outranks = async (targetPosition: number) => {
      const actor = await getActor();
      if (!actor) return false;
      if (actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator)) return true;
      return actor.roles.highest.position > targetPosition;
    };
    const refreshNewsHeader = () =>
      Promise.all([rulesService.postChannelHeaders(guild, "game-news"), rulesService.postChannelHeaders(guild, "driver-news")]).catch((e) =>
        console.error("[BotAPI] News Kopf-Nachricht:", e)
      );

    switch (route) {
        case "GET /roles/manage": {
          const { actor, error } = await getRoleManagerActor();
          if (error || !actor) return send(res, 403, { error });
          await guild.roles.fetch();
          const botPosition = guild.members.me?.roles.highest.position ?? 0;
          const canGrantDangerous = actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator);
          const roles = Array.from(guild.roles.cache.values())
            .filter((role) => role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map((role) => ({
              id: role.id,
              name: role.name,
              color: role.hexColor,
              position: role.position,
              hoist: role.hoist,
              mentionable: role.mentionable,
              managed: role.managed,
              memberCount: role.members.size,
              editable: canEditRole(role, actor) && (canGrantDangerous || (role.permissions.bitfield & dangerousRolePermissions) === BigInt(0)),
              permissions: role.permissions.toArray(),
            }));
          return send(res, 200, { roles, botPosition, canCreate: botPosition > 1, canGrantDangerous });
        }
        case "GET /roles/manage/members": {
          const { actor, error } = await getRoleManagerActor();
          if (error || !actor) return send(res, 403, { error });
          const query = new URL(req.url || "", "http://localhost").searchParams.get("q")?.trim() || "";
          if (query.length < 2) return send(res, 400, { error: "Bitte mindestens zwei Zeichen eingeben." });
          const members = await guild.members.search({ query: query.slice(0, 32), limit: 25 });
          return send(res, 200, {
            members: members.map((member) => ({
              id: member.id,
              username: member.user.username,
              displayName: member.displayName,
              isOwner: member.id === guild.ownerId,
              roles: member.roles.cache.filter((role) => role.id !== guild.id).map((role) => ({ id: role.id, name: role.name, position: role.position })),
            })),
          });
        }
        case "POST /roles/manage/create": {
          const { actor, error } = await getRoleManagerActor();
          if (error || !actor) return send(res, 403, { error });
          const body = await readBody(req);
          const name = String(body?.name || "").trim();
          if (!name || name.length > 100) return send(res, 400, { error: "Der Rollenname muss 1 bis 100 Zeichen lang sein." });
          const color = String(body?.color || "#000000");
          if (!/^#[0-9a-f]{6}$/i.test(color)) return send(res, 400, { error: "Ungültige Rollenfarbe." });
          const parsed = parseRolePermissionChanges(body);
          if (parsed.error) return send(res, 400, { error: parsed.error });
          const actorIsAdmin = actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator);
          if (!actorIsAdmin && (parsed.permissions & dangerousRolePermissions) !== BigInt(0)) {
            return send(res, 403, { error: "Gefährliche Server-Rechte darf nur ein Administrator vergeben." });
          }
          const role = await guild.roles.create({
            name,
            color: parseInt(color.slice(1), 16),
            hoist: body?.hoist === true,
            mentionable: body?.mentionable === true,
            permissions: parsed.permissions,
            reason: `Rolle über Web-Dashboard erstellt von ${by || actor.user.tag}`,
          });
          return send(res, 201, { ok: true, role: { id: role.id, name: role.name, color: role.hexColor, position: role.position, permissions: role.permissions.toArray(), memberCount: role.members.size } });
        }
        case "POST /roles/manage/update": {
          const { actor, error } = await getRoleManagerActor();
          if (error || !actor) return send(res, 403, { error });
          const body = await readBody(req);
          const role = guild.roles.cache.get(String(body?.roleId || ""));
          if (!role) return send(res, 404, { error: "Rolle nicht gefunden." });
          if (!canEditRole(role, actor)) return send(res, 403, { error: "Diese Rolle liegt über deiner oder der Bot-Rolle oder wird von Discord verwaltet." });
          const patch: { name?: string; color?: number; hoist?: boolean; mentionable?: boolean; permissions?: bigint } = {};
          if (body?.name !== undefined) {
            const name = String(body.name).trim();
            if (!name || name.length > 100) return send(res, 400, { error: "Der Rollenname muss 1 bis 100 Zeichen lang sein." });
            patch.name = name;
          }
          if (body?.color !== undefined) {
            const color = String(body.color);
            if (!/^#[0-9a-f]{6}$/i.test(color)) return send(res, 400, { error: "Ungültige Rollenfarbe." });
            patch.color = parseInt(color.slice(1), 16);
          }
          if (body?.hoist !== undefined) patch.hoist = body.hoist === true;
          if (body?.mentionable !== undefined) patch.mentionable = body.mentionable === true;
          const parsed = parseRolePermissionChanges(body, role.permissions.bitfield);
          if (parsed.error) return send(res, 400, { error: parsed.error });
          const actorIsAdmin = actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator);
          if (!actorIsAdmin && (parsed.permissions & dangerousRolePermissions) !== BigInt(0)) {
            return send(res, 403, { error: "Gefährliche Server-Rechte darf nur ein Administrator vergeben." });
          }
          if (body?.permissions !== undefined) patch.permissions = parsed.permissions;
          const updated = await role.edit({ ...patch, reason: `Rolle über Web-Dashboard geändert von ${by || actor.user.tag}` });
          return send(res, 200, { ok: true, role: { id: updated.id, name: updated.name, color: updated.hexColor, position: updated.position, permissions: updated.permissions.toArray(), memberCount: updated.members.size } });
        }
        case "POST /roles/manage/delete": {
          const { actor, error } = await getRoleManagerActor();
          if (error || !actor) return send(res, 403, { error });
          const body = await readBody(req);
          const role = guild.roles.cache.get(String(body?.roleId || ""));
          if (!role) return send(res, 404, { error: "Rolle nicht gefunden." });
          if (!canEditRole(role, actor)) return send(res, 403, { error: "Diese Rolle liegt über deiner oder der Bot-Rolle oder wird von Discord verwaltet." });
          await role.delete(`Rolle über Web-Dashboard gelöscht von ${by || actor.user.tag}`);
          return send(res, 200, { ok: true });
        }
        case "GET /health":
          return send(res, 200, { ok: true, bot: client.user?.tag, guild: guild.name });

        // ---------------- Free-Games ----------------
        // ---------------- Server-Freigabe (nur Bot-Besitzer) ----------------
        case "GET /guild-access": {
          const isOwner = !!actorId && guildAccessService.isBotOwner(actorId, client);
          if (!isOwner) return send(res, 200, { isOwner: false });
          const clientId = client.user?.id || process.env.CLIENT_ID || "";
          const invite = (id: string) =>
            `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8&guild_id=${id}&disable_guild_select=true`;
          return send(res, 200, {
            isOwner: true,
            max: guildAccessService.maxGuilds,
            entries: guildAccessService.getEntries().map((e) => {
              const g = client.guilds.cache.get(e.id);
              return {
                ...e,
                name: g?.name || e.name || null,
                icon: g?.iconURL({ size: 64 }) || null,
                joined: !!g,
                memberCount: g?.memberCount ?? null,
                inviteUrl: g ? null : invite(e.id),
              };
            }),
            removed: guildAccessService.getRemoved(),
            purged: guildAccessService.getPurged().slice(-10),
            purgeAfterDays: Number(process.env.PURGE_REMOVED_GUILDS_DAYS || 30),
          });
        }
        case "POST /guild-access/add": {
          if (!actorId || !guildAccessService.isBotOwner(actorId, client)) {
            return send(res, 403, { error: "Nur der Bot-Besitzer darf Server freigeben." });
          }
          const body = await readBody(req);
          const id = String(body?.guildId || "").trim();
          const name = String(body?.name || "").trim().slice(0, 100) || undefined;
          const error = guildAccessService.add(id, name, by);
          if (error) return send(res, 400, { error });
          console.log(`[GuildAccess] ${by || actorId} hat Server ${id} freigegeben.`);
          return send(res, 200, { ok: true });
        }
        case "POST /guild-access/purge": {
          if (!actorId || !guildAccessService.isBotOwner(actorId, client)) {
            return send(res, 403, { error: "Nur der Bot-Besitzer darf Daten löschen." });
          }
          const body = await readBody(req);
          const error = guildAccessService.markPurge(String(body?.guildId || ""));
          if (error) return send(res, 400, { error });
          return send(res, 200, { ok: true });
        }
        case "POST /guild-access/remove": {
          if (!actorId || !guildAccessService.isBotOwner(actorId, client)) {
            return send(res, 403, { error: "Nur der Bot-Besitzer darf Freigaben entfernen." });
          }
          const body = await readBody(req);
          const id = String(body?.guildId || "").trim();
          const target = client.guilds.cache.get(id);
          const error = guildAccessService.remove(id, target?.name);
          if (error) return send(res, 400, { error });
          if (target) await guildAccessService.rejectGuild(target, "not_allowed");
          console.log(`[GuildAccess] ${by || actorId} hat die Freigabe für ${target?.name || id} entfernt.`);
          return send(res, 200, { ok: true, left: !!target });
        }

        // ---------------- Statistik-Kanäle ----------------
        case "GET /stats-channels": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const cfg = statsChannelsService.getConfig(guild.id);
          return send(res, 200, {
            counters: (Object.keys(COUNTERS) as (keyof typeof COUNTERS)[]).map((id) => ({
              id,
              ...COUNTERS[id],
              enabled: !!cfg.counters[id]?.enabled,
              template: cfg.counters[id]?.template || COUNTERS[id].template,
              channelId: cfg.counters[id]?.channelId || null,
              value: statsChannelsService.display(guild, id),
            })),
          });
        }
        case "POST /stats-channels": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageChannels) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Kanäle verwalten“." });
          }
          const body = await readBody(req);
          const wanted: Record<string, { enabled: boolean; template?: string }> = {};
          for (const id of Object.keys(COUNTERS)) {
            const c = body?.counters?.[id];
            const template = typeof c?.template === "string" ? c.template.trim() : undefined;
            if (template && !template.includes("{count}")) return send(res, 400, { error: `${COUNTERS[id as keyof typeof COUNTERS].label}: Der Text muss {count} enthalten.` });
            wanted[id] = { enabled: !!c?.enabled, template };
          }
          const cfg = await statsChannelsService.apply(guild, wanted as any);
          return send(res, 200, { ok: true, config: cfg });
        }

        // ---------------- Geburtstage ----------------
        case "GET /birthdays": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const data = birthdayService.getData(guild.id);
          const upcoming = birthdayService.upcoming(guild.id, 25);
          const members = await Promise.all(upcoming.map((u) => guild.members.fetch(u.userId).catch(() => null)));
          return send(res, 200, {
            config: { channelId: data.channelId || null, roleId: data.roleId || null, message: data.message, defaultMessage: DEFAULT_BIRTHDAY_MESSAGE },
            total: Object.keys(data.users).length,
            upcoming: upcoming.map((u, i) => ({
              ...u,
              date: birthdayService.formatDate(u.day, u.month),
              name: members[i]?.displayName || "Unbekannt",
              avatar: members[i]?.displayAvatarURL({ size: 64 }) || null,
            })),
            channels: guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased()).map((c) => ({ id: c.id, name: c.name })),
            roles: guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).map((r) => ({ id: r.id, name: r.name })),
          });
        }
        case "POST /birthdays/config": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (body?.channelId && !guild.channels.cache.get(String(body.channelId))?.isTextBased()) return send(res, 400, { error: "Ungültiger Kanal." });
          if (body?.createRole) {
            try {
              await birthdayService.ensureRole(guild);
            } catch (e: any) {
              return send(res, 400, { error: e?.message || "Rolle konnte nicht angelegt werden." });
            }
          } else if (body?.roleId !== undefined && body.roleId) {
            const role = guild.roles.cache.get(String(body.roleId));
            const botTop = guild.members.me?.roles.highest.position ?? 0;
            if (!role || role.managed || role.position >= botTop) return send(res, 400, { error: "Diese Rolle kann der Bot nicht vergeben (muss unter der Bot-Rolle stehen)." });
            if (role.permissions.has(PermissionFlagsBits.Administrator) || role.permissions.has(PermissionFlagsBits.ManageGuild)) {
              return send(res, 400, { error: "Rollen mit Admin- oder Verwaltungsrechten sind als Geburtstags-Rolle nicht erlaubt." });
            }
          }
          birthdayService.setConfig(guild.id, {
            channelId: body?.channelId !== undefined ? String(body.channelId || "") : undefined,
            roleId: body?.createRole ? undefined : body?.roleId !== undefined ? String(body.roleId || "") : undefined,
            message: typeof body?.message === "string" ? body.message : undefined,
          });
          return send(res, 200, { ok: true });
        }
        case "POST /birthdays/test": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const data = birthdayService.getData(guild.id);
          const channel = data.channelId ? guild.channels.cache.get(data.channelId) : null;
          if (!channel || !channel.isTextBased()) return send(res, 400, { error: "Bitte zuerst einen Kanal festlegen." });
          await (channel as any).send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xeb459e)
                .setTitle("🎂 Herzlichen Glückwunsch! (Test)")
                .setDescription(data.message.replace(/{user}/g, "@Mitglied").replace(/{server}/g, guild.name).replace(/{name}/g, "Mitglied")),
            ],
          });
          return send(res, 200, { ok: true });
        }

        // ---------------- Game-Release Kalender ----------------
        case "GET /releases": {
          const config = releaseService.getConfig(guild.id);
          const releases = releaseService.getAllReleases(guild.id);
          const channels = guild.channels.cache
            .filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased())
            .map((c) => ({ id: c.id, name: c.name }));
          const roles = guild.roles.cache
            .filter((r) => r.id !== guild.id && !r.managed)
            .sort((a, b) => b.position - a.position)
            .map((r) => ({ id: r.id, name: r.name }));

          return send(res, 200, {
            config,
            releases,
            channels,
            roles,
          });
        }
        case "POST /releases/config": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          const updated = releaseService.setConfig(guild.id, body);
          return send(res, 200, { ok: true, config: updated });
        }
        case "POST /releases/add": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.title || !body.releaseDate || !Array.isArray(body.platforms)) {
            return send(res, 400, { error: "Titel, Release-Datum und mindestens eine Plattform erforderlich." });
          }
          const created = releaseService.addRelease(
            guild.id,
            {
              title: String(body.title).trim(),
              releaseDate: String(body.releaseDate).trim(),
              platforms: body.platforms,
              genre: String(body.genre || "Action").trim(),
              description: body.description ? String(body.description).trim() : undefined,
              coverUrl: body.coverUrl ? String(body.coverUrl).trim() : undefined,
              storeUrl: body.storeUrl ? String(body.storeUrl).trim() : undefined,
              trailerUrl: body.trailerUrl ? String(body.trailerUrl).trim() : undefined,
            },
            by
          );
          return send(res, 200, { ok: true, release: created });
        }
        case "POST /releases/update": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.id) return send(res, 400, { error: "Keine Release-ID angegeben." });
          const updated = releaseService.updateRelease(guild.id, String(body.id), body.patch || {});
          if (!updated) return send(res, 404, { error: "Release nicht gefunden oder ist ein geschützter Standard-Titel." });
          return send(res, 200, { ok: true, release: updated });
        }
        case "POST /releases/delete": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.id) return send(res, 400, { error: "Keine Release-ID angegeben." });
          const ok = releaseService.deleteRelease(guild.id, String(body.id));
          if (!ok) return send(res, 404, { error: "Release konnte nicht gelöscht werden (nur eigene Releases können gelöscht werden)." });
          return send(res, 200, { ok: true });
        }
        case "POST /releases/post-week": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const ok = await releaseService.postWeeklyReleases(client, guild.id);
          if (!ok) return send(res, 400, { error: "Wochen-Post konnte nicht versendet werden. Prüfe den konfigurierten Kanal." });
          return send(res, 200, { ok: true });
        }

        // ---------------- Wirtschaft & Shop ----------------
        case "GET /economy": {
          const config = economyService.getConfig(guild.id);
          const shopItems = economyService.getShopItems(guild.id, false);
          const leaderboard = economyService.getLeaderboard(guild.id, 20);
          const transactions = isLoggedIn ? economyService.getTransactions(guild.id, 50) : [];
          const userWallet = actorId ? economyService.getOrCreateWallet(guild.id, actorId) : null;
          const userInventory = actorId ? economyService.getUserInventory(guild.id, actorId) : [];
          const userProfile = actorId ? statsService.getUserProfile(guild.id, actorId) : null;

          // Rollen nur für Eingeloggte: die Seite ist ohne Login erreichbar,
          // die interne Rollenstruktur des Servers geht Fremde nichts an.
          const roles = isLoggedIn
            ? guild.roles.cache
                .filter((r) => r.id !== guild.id && !r.managed)
                .sort((a, b) => b.position - a.position)
                .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
            : [];

          return send(res, 200, {
            config,
            shopItems,
            leaderboard,
            transactions,
            userWallet,
            userInventory,
            userProfile,
            roles,
          });
        }
        case "POST /economy/config": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.Administrator) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Nur Administratoren dürfen die Währungseinstellungen bearbeiten." });
          }
          const body = await readBody(req);
          const updated = economyService.updateConfig(guild.id, body);
          return send(res, 200, { ok: true, config: updated });
        }
        case "POST /economy/exchange-xp": {
          if (!isLoggedIn || !actorId) return send(res, 401, { error: "Bitte einloggen." });
          const member = await guild.members.fetch(actorId).catch(() => null);
          if (!member) return send(res, 404, { error: "Mitglied auf dem Server nicht gefunden." });
          const body = await readBody(req);
          const xp = Number(body?.xp);
          if (isNaN(xp) || xp <= 0) return send(res, 400, { error: "Ungültiger XP-Betrag." });
          const result = economyService.exchangeXpForCoins(guild, member.user, xp);
          if (!result.success) return send(res, 400, { error: result.error });
          const profile = statsService.getUserProfile(guild.id, actorId);
          return send(res, 200, { ok: true, ...result, userProfile: profile });
        }
        case "POST /economy/setup-colors": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageRoles) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Rollen verwalten“." });
          }
          const result = await economyService.setupColorRoles(guild);
          const shopItems = economyService.getShopItems(guild.id, false);
          return send(res, 200, { ok: true, ...result, shopItems });
        }
        case "POST /economy/shop/add": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.name || typeof body.price !== "number") {
            return send(res, 400, { error: "Artikelname und Preis erforderlich." });
          }
          const item = economyService.addShopItem(guild.id, {
            name: String(body.name).trim(),
            description: String(body.description || "").trim(),
            price: Math.max(1, Math.floor(body.price)),
            type: body.type || "custom",
            roleId: body.roleId ? String(body.roleId) : undefined,
            colorHex: body.colorHex ? String(body.colorHex) : undefined,
            badgeIcon: body.badgeIcon ? String(body.badgeIcon) : undefined,
            stock: body.stock !== undefined ? Number(body.stock) : -1,
            requiredLevel: body.requiredLevel ? Number(body.requiredLevel) : 0,
            enabled: body.enabled !== false,
          });
          return send(res, 200, { ok: true, item });
        }
        case "POST /economy/shop/update": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.id) return send(res, 400, { error: "Artikel-ID erforderlich." });
          const updated = economyService.updateShopItem(guild.id, String(body.id), body.patch || {});
          if (!updated) return send(res, 404, { error: "Artikel nicht gefunden." });
          return send(res, 200, { ok: true, item: updated });
        }
        case "POST /economy/shop/delete": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (!body.id) return send(res, 400, { error: "Artikel-ID erforderlich." });
          const ok = economyService.deleteShopItem(guild.id, String(body.id));
          return send(res, 200, { ok });
        }
        case "POST /economy/shop/buy": {
          if (!isLoggedIn || !actorId) return send(res, 401, { error: "Bitte einloggen." });
          const member = await guild.members.fetch(actorId).catch(() => null);
          if (!member) return send(res, 404, { error: "Mitglied auf dem Server nicht gefunden." });
          const body = await readBody(req);
          if (!body.itemId) return send(res, 400, { error: "Keine itemId angegeben." });
          const result = await economyService.buyShopItem(guild, member, String(body.itemId));
          if (!result.success) return send(res, 400, { error: result.error });
          return send(res, 200, { ok: true, item: result.item, newBalance: result.newBalance });
        }
        case "POST /economy/admin/balance": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.Administrator) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Nur Administratoren dürfen Kontostände manipulieren." });
          }
          const body = await readBody(req);
          const { userId, amount, mode, reason } = body;
          if (!userId || typeof amount !== "number") {
            return send(res, 400, { error: "userId und amount erforderlich." });
          }
          const targetMember = await guild.members.fetch(userId).catch(() => null);
          const targetTag = targetMember?.user.tag || "Nutzer";
          let wallet;
          if (mode === "set") {
            wallet = economyService.setBalance(guild.id, userId, amount, reason || "Admin-Anpassung", targetTag);
          } else if (mode === "deduct") {
            wallet = economyService.removeCoins(guild.id, userId, amount, reason || "Admin-Abzug", "admin", actor.id, targetTag, actor.user.tag);
          } else {
            wallet = economyService.addCoins(guild.id, userId, amount, reason || "Admin-Gutschrift", "admin", actor.id, targetTag, actor.user.tag);
          }
          return send(res, 200, { ok: true, wallet });
        }

        // ---------------- Server-Templates & Setup Wizard ----------------
        case "GET /templates": {
          const isOwner = actorId === guild.ownerId || (!!actorId && guildAccessService.isBotOwner(actorId, client));
          const channels = guild.channels.cache
            .filter((c) => !c.isThread())
            .map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              parentId: c.parentId,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          return send(res, 200, {
            templates: templateService.getTemplates(),
            styles: templateService.getStyles(),
            channels,
            isOwner,
          });
        }
        case "POST /templates/apply": {
          const actor = await getActor();
          const isOwner = !!actor && (actor.id === guild.ownerId || guildAccessService.isBotOwner(actor.id, client));
          if (!actor || (!actor.permissions.has(PermissionFlagsBits.Administrator) && !isOwner)) {
            return send(res, 403, { error: "Nur Administratoren dürfen Server-Templates anwenden." });
          }
          const body = await readBody(req);
          const { templateId, styleId, wipe } = body;
          if (!templateId || !styleId) {
            return send(res, 400, { error: "templateId und styleId erforderlich." });
          }
          if (wipe && !isOwner) {
            return send(res, 403, { error: "Die Wipe-Option darf nur vom Server-Inhaber oder Bot-Besitzer ausgeführt werden." });
          }

          const result = await templateService.applyTemplate(guild, templateId, styleId, {
            wipe: Boolean(wipe),
            executorTag: actor.user.tag,
          });

          if (!result.ok) {
            return send(res, 400, { error: result.error || "Fehler beim Anwenden des Templates." });
          }

          moduleService.enableModule(guild.id, "templates");
          return send(res, 200, result);
        }

        case "POST /channels/rename-style": {
          const actor = await getActor();
          const canManage =
            !!actor &&
            (actor.permissions.has(PermissionFlagsBits.ManageChannels) ||
              actor.permissions.has(PermissionFlagsBits.Administrator) ||
              actor.id === guild.ownerId);
          if (!canManage) {
            return send(res, 403, { error: "Dafür benötigst du die Berechtigung „Kanäle verwalten“." });
          }
          const body = await readBody(req);
          const { channelId, styleId, customName, customIcon } = body;
          if (!channelId || !styleId) {
            return send(res, 400, { error: "channelId und styleId erforderlich." });
          }
          const targetChannel = guild.channels.cache.get(channelId);
          if (!targetChannel) {
            return send(res, 404, { error: "Kanal nicht gefunden." });
          }

          const preset = CHANNEL_STYLES.find((s) => s.id === styleId) || CHANNEL_STYLES[0];
          let baseName = String(customName || "").trim();
          if (!baseName) {
            baseName = targetChannel.name
              .replace(/^[^\w\s\u00C0-\u024F\u1E00-\u1EFF\u1D00-\u1D7F]+/gu, "")
              .replace(/^[・|〢「」◈›‹•\-_\s]+/gu, "")
              .trim();
            if (!baseName) baseName = targetChannel.name;
          }

          const defaultIcon =
            targetChannel.type === ChannelType.GuildVoice
              ? "🔊"
              : targetChannel.type === ChannelType.GuildAnnouncement
              ? "📢"
              : targetChannel.type === ChannelType.GuildCategory
              ? "📁"
              : "💬";
          const icon = customIcon || defaultIcon;

          let formattedName = "";
          if (targetChannel.type === ChannelType.GuildCategory) {
            formattedName = preset.formatCategory(baseName, icon);
          } else if (targetChannel.type === ChannelType.GuildVoice) {
            formattedName = preset.formatVoice(baseName, icon);
          } else {
            formattedName = preset.formatText(baseName, icon);
          }
          if (formattedName.length > 100) formattedName = formattedName.substring(0, 100);

          const oldName = targetChannel.name;
          await targetChannel.setName(formattedName, `Kanal-Styling Webinterface durch ${actor?.user?.tag || "Admin"}`);
          return send(res, 200, { ok: true, channelId, oldName, newName: formattedName, styleName: preset.name });
        }

        // ---------------- Geplante Ankündigungen ----------------
        case "GET /announcements": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, {
            announcements: announcementService.list(guild.id),
            channels: guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased()).map((c) => ({ id: c.id, name: c.name })),
            roles: guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).map((r) => ({ id: r.id, name: r.name })),
          });
        }
        case "POST /announcements": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageMessages) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Nachrichten verwalten“." });
          }
          const body = await readBody(req);
          // @everyone/@here nur mit der Berechtigung "Alle erwähnen"
          if ((body?.ping === "everyone" || body?.ping === "here") && !actor.permissions.has(PermissionFlagsBits.MentionEveryone)) {
            return send(res, 403, { error: "Für @everyone/@here brauchst du „@everyone erwähnen“." });
          }
          const result = announcementService.save(guild, body, by);
          if ("error" in result) return send(res, 400, { error: result.error });
          return send(res, 200, { ok: true, item: result.item });
        }
        case "POST /announcements/delete": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const body = await readBody(req);
          return send(res, 200, { ok: announcementService.remove(guild.id, String(body?.id || "")) });
        }
        case "POST /announcements/send-now": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageMessages) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Nachrichten verwalten“." });
          }
          const body = await readBody(req);
          const item = announcementService.list(guild.id).find((a) => a.id === String(body?.id || ""));
          if (!item) return send(res, 404, { error: "Ankündigung nicht gefunden." });
          try {
            await announcementService.send(guild, item);
            return send(res, 200, { ok: true });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Senden fehlgeschlagen." });
          }
        }

        // ---------------- Eigene Befehle ----------------
        case "GET /custom-commands": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, { commands: customCommandService.list(guild.id), max: MAX_CUSTOM_COMMANDS });
        }
        case "POST /custom-commands": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const result = customCommandService.save(guild.id, await readBody(req), by);
          if ("error" in result) return send(res, 400, { error: result.error });
          try {
            await customCommandService.syncGuild(client, guild.id);
          } catch (e: any) {
            return send(res, 200, { ok: true, item: result.item, warning: `Gespeichert, aber Discord hat die Registrierung abgelehnt: ${e?.message || e}` });
          }
          return send(res, 200, { ok: true, item: result.item });
        }
        case "POST /custom-commands/delete": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          const ok = customCommandService.remove(guild.id, String(body?.id || ""));
          if (ok) await customCommandService.syncGuild(client, guild.id).catch(() => null);
          return send(res, 200, { ok });
        }

        // ---------------- Willkommens-Karte ----------------
        case "GET /welcome": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, {
            config: welcomeService.getConfig(guild.id),
            defaults: WELCOME_DEFAULTS,
            ruleLockActive: welcomeService.isRuleLockActive(guild.id),
            channels: guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased()).map((c) => ({ id: c.id, name: c.name })),
            roles: guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).map((r) => ({ id: r.id, name: r.name })),
          });
        }
        case "POST /welcome": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (body?.channelId && !guild.channels.cache.get(String(body.channelId))?.isTextBased()) return send(res, 400, { error: "Ungültiger Kanal." });
          if (body?.autoRoleId) {
            const role = guild.roles.cache.get(String(body.autoRoleId));
            const botTop = guild.members.me?.roles.highest.position ?? 0;
            if (!role || role.managed || role.position >= botTop) return send(res, 400, { error: "Diese Rolle kann der Bot nicht vergeben (muss unter der Bot-Rolle stehen)." });
            const DANGEROUS = PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers;
            if ((role.permissions.bitfield & DANGEROUS) !== BigInt(0)) return send(res, 400, { error: "Rollen mit Admin- oder Verwaltungsrechten sind als automatische Rolle nicht erlaubt." });
          }
          const cfg = welcomeService.setConfig(guild.id, {
            channelId: body?.channelId !== undefined ? String(body.channelId || "") : undefined,
            title: body?.title,
            message: body?.message,
            subtitle: body?.subtitle,
            accent: body?.accent,
            card: typeof body?.card === "boolean" ? body.card : undefined,
            autoRoleId: body?.autoRoleId !== undefined ? String(body.autoRoleId || "") : undefined,
            backgroundImageUrl: body?.backgroundImageUrl !== undefined ? String(body.backgroundImageUrl || "") : undefined,
          });
          return send(res, 200, { ok: true, config: cfg });
        }
        case "POST /welcome/preview": {
          if (!isLoggedIn || !actorId) return send(res, 401, { error: "Bitte einloggen." });
          const body = await readBody(req);
          try {
            const png = await welcomeService.preview(guild, actorId, {
              title: typeof body?.title === "string" ? body.title.slice(0, 40) : undefined,
              subtitle: typeof body?.subtitle === "string" ? body.subtitle.slice(0, 120) : undefined,
              accent: /^#[0-9a-f]{6}$/i.test(String(body?.accent || "")) ? body.accent : undefined,
              backgroundImageUrl: typeof body?.backgroundImageUrl === "string" ? body.backgroundImageUrl.trim() : undefined,
            } as any);
            return send(res, 200, { image: `data:image/png;base64,${png.toString("base64")}` });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Vorschau fehlgeschlagen." });
          }
        }
        case "POST /welcome/test": {
          if (!isLoggedIn || !actorId) return send(res, 401, { error: "Bitte einloggen." });
          const member = await guild.members.fetch(actorId).catch(() => null);
          if (!member) return send(res, 400, { error: "Mitglied nicht gefunden." });
          try {
            await welcomeService.sendWelcome(member, true);
            return send(res, 200, { ok: true });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Senden fehlgeschlagen." });
          }
        }

        // ---------------- Game-Server-Status ----------------
        case "GET /game-servers": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const fresh = (req.url || "").includes("refresh=1");
          if (fresh) await gameServerService.checkGuild(guild.id);
          return send(res, 200, {
            max: MAX_GAME_SERVERS,
            defaultPorts: DEFAULT_PORTS,
            servers: gameServerService.list(guild.id).map((s) => ({ ...s, status: gameServerService.getStatus(s.id) || null })),
          });
        }
        case "POST /game-servers": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const result = gameServerService.save(guild.id, await readBody(req));
          if ("error" in result) return send(res, 400, { error: result.error });
          const status = await gameServerService.check(result.item);
          return send(res, 200, { ok: true, item: result.item, status });
        }
        case "POST /game-servers/delete": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          return send(res, 200, { ok: gameServerService.remove(guild.id, String(body?.id || "")) });
        }

        // ---------------- Clip-Showcase ----------------
        case "GET /clips": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const data = clipService.getData(guild.id);
          const ranking = await clipService.ranking(guild, 10).catch(() => []);
          const ids = Array.from(new Set([...ranking.map((r) => r.clip.authorId), ...data.history.map((h) => h.authorId)]));
          const members = await Promise.all(ids.map((id) => guild.members.fetch(id).catch(() => null)));
          const names: Record<string, { name: string; avatar: string | null }> = {};
          members.forEach((m, i) => (names[ids[i]] = { name: m?.displayName || "Unbekannt", avatar: m?.displayAvatarURL({ size: 64 }) || null }));
          const channel = data.channelId ? guild.channels.cache.get(data.channelId) : null;
          return send(res, 200, {
            config: { channelId: data.channelId || null, weekday: data.weekday, hour: data.hour },
            lastAward: data.lastAward || null,
            ranking: ranking.map((r) => ({
              ...r.clip,
              votes: r.votes,
              laughs: r.laughs,
              author: names[r.clip.authorId],
              jumpUrl: channel ? `https://discord.com/channels/${guild.id}/${channel.id}/${r.clip.messageId}` : null,
            })),
            history: [...data.history].reverse().map((h) => ({ ...h, author: names[h.authorId] })),
            channels: guild.channels.cache
              .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
              .map((c) => ({ id: c.id, name: c.name })),
          });
        }
        case "POST /clips/config": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          if (body?.channelId && !guild.channels.cache.has(String(body.channelId))) return send(res, 400, { error: "Kanal nicht gefunden." });
          const d = clipService.setConfig(guild.id, {
            channelId: body?.channelId === undefined ? undefined : body.channelId ? String(body.channelId) : null,
            weekday: body?.weekday === undefined ? undefined : Number(body.weekday),
            hour: body?.hour === undefined ? undefined : Number(body.hour),
          });
          return send(res, 200, { ok: true, config: { channelId: d.channelId || null, weekday: d.weekday, hour: d.hour } });
        }
        case "POST /clips/award": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          try {
            return send(res, 200, { ok: true, result: await clipService.award(guild, true) });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Kür fehlgeschlagen." });
          }
        }

        // ---------------- Web-Konsole ----------------
        case "GET /console/channels":
        case "GET /console/messages":
        case "POST /console/send":
        case "POST /console/delete": {
          const actor = await getActor();
          if (!actor) return send(res, 401, { error: "Bitte einloggen." });
          const me = guild.members.me;
          const visible = guild.channels.cache.filter(
            (c): c is TextChannel | NewsChannel =>
              (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
              !!c.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]) &&
              !!me && !!c.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory])
          );
          if (route === "GET /console/channels") {
            return send(res, 200, {
              channels: visible
                .sort((a, b) => (a.parent?.position ?? -1) - (b.parent?.position ?? -1) || a.position - b.position)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  category: c.parent?.name || null,
                  canSend: !!c.permissionsFor(actor)?.has(PermissionFlagsBits.SendMessages) && !!c.permissionsFor(me!)?.has(PermissionFlagsBits.SendMessages),
                })),
              canMentionEveryone: actor.permissions.has(PermissionFlagsBits.MentionEveryone),
            });
          }
          const url = new URL(req.url || "/", "http://x");
          const body = req.method === "POST" ? await readBody(req) : null;
          const channelId = String(body?.channelId || url.searchParams.get("channelId") || "");
          const channel = visible.get(channelId);
          if (!channel) return send(res, 403, { error: "Für diesen Kanal fehlen dir (oder dem Bot) die Rechte - nötig ist „Nachrichten verwalten“." });

          if (route === "GET /console/messages") {
            const after = url.searchParams.get("after") || undefined;
            const msgs = await channel.messages.fetch(after ? { after, limit: 50 } : { limit: 50 });
            return send(res, 200, {
              messages: [...msgs.values()]
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map((m) => ({
                  id: m.id,
                  content: m.content,
                  createdAt: m.createdTimestamp,
                  editedAt: m.editedTimestamp,
                  author: { id: m.author.id, name: m.member?.displayName || m.author.username, avatar: m.author.displayAvatarURL({ size: 64 }), bot: m.author.bot },
                  isOwnBot: m.author.id === client.user?.id,
                  replyTo: m.reference?.messageId || null,
                  embeds: m.embeds.map((e) => ({ title: e.title, description: e.description?.slice(0, 500) || null, color: e.color })),
                  attachments: [...m.attachments.values()].map((a) => ({ name: a.name, url: a.url, image: (a.contentType || "").startsWith("image/") })),
                })),
            });
          }

          if (route === "POST /console/delete") {
            const msg = await channel.messages.fetch(String(body?.messageId || "")).catch(() => null);
            if (!msg) return send(res, 404, { error: "Nachricht nicht gefunden." });
            if (!channel.permissionsFor(me!)?.has(PermissionFlagsBits.ManageMessages) && msg.author.id !== client.user?.id) {
              return send(res, 403, { error: "Dem Bot fehlt „Nachrichten verwalten“ in diesem Kanal." });
            }
            await msg.delete();
            auditLogService
              .log({ guildId: guild.id, category: "message", action: "Web-Konsole: Nachricht gelöscht", executor: { id: actor.id, tag: actor.user.tag }, target: { id: msg.author.id, tag: msg.author.tag }, details: { channelId: channel.id, content: msg.content.slice(0, 500) } }, client)
              .catch(() => null);
            return send(res, 200, { ok: true });
          }

          // POST /console/send
          const content = String(body?.content || "").trim();
          if (!content) return send(res, 400, { error: "Die Nachricht ist leer." });
          if (content.length > 2000) return send(res, 400, { error: "Maximal 2000 Zeichen." });
          if (!channel.permissionsFor(actor)?.has(PermissionFlagsBits.SendMessages)) return send(res, 403, { error: "Du darfst in diesem Kanal nicht schreiben." });
          if (!channel.permissionsFor(me!)?.has(PermissionFlagsBits.SendMessages)) return send(res, 403, { error: "Der Bot darf in diesem Kanal nicht schreiben." });
          const mayEveryone = channel.permissionsFor(actor)?.has(PermissionFlagsBits.MentionEveryone) ?? false;
          const replyTo = body?.replyTo ? await channel.messages.fetch(String(body.replyTo)).catch(() => null) : null;
          const sent = await channel.send({
            content,
            reply: replyTo ? { messageReference: replyTo.id, failIfNotExists: false } : undefined,
            allowedMentions: mayEveryone ? { parse: ["users", "roles", "everyone"], repliedUser: true } : { parse: ["users"], repliedUser: true },
          });
          auditLogService
            .log({ guildId: guild.id, category: "message", action: "Web-Konsole: Nachricht als Bot gesendet", executor: { id: actor.id, tag: actor.user.tag }, details: { channelId: channel.id, messageId: sent.id, content: content.slice(0, 500) } }, client)
            .catch(() => null);
          console.log(`[Konsole] ${actor.user.tag} → #${channel.name}: ${content.slice(0, 80)}`);
          return send(res, 200, { ok: true, id: sent.id });
        }

        // ---------------- Komplett-Einrichtung ----------------
        case "GET /setup": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const me = guild.members.me;
          return send(res, 200, {
            modules: SETUP_MODULES.map((id) => ({ id, ...MODULE_INFO[id] })),
            status: setupService.getStatus(guild),
            moduleEnabled: setupService.getModuleEnabled(guild.id),
            running: setupService.isRunning(guild.id),
            botPermissions: {
              administrator: !!me?.permissions.has(PermissionFlagsBits.Administrator),
              manageRoles: !!me?.permissions.has(PermissionFlagsBits.ManageRoles),
              manageChannels: !!me?.permissions.has(PermissionFlagsBits.ManageChannels),
            },
          });
        }
        case "POST /setup/run": {
          const actor = await getActor();
          if (!actor || (actor.id !== guild.ownerId && !actor.permissions.has(PermissionFlagsBits.Administrator))) {
            return send(res, 403, { error: "Die Komplett-Einrichtung dürfen nur der Owner und Administratoren starten." });
          }
          const body = await readBody(req);
          const wanted = Array.isArray(body?.modules) ? body.modules.map(String) : [];
          try {
            const results = await setupService.run(guild, wanted);
            console.log(`[Setup] ${by || actor.user.tag} hat eingerichtet: ${results.map((r) => `${r.label}${r.ok ? "" : " (Fehler)"}`).join(", ")}`);
            return send(res, 200, { ok: true, results, status: setupService.getStatus(guild) });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Einrichtung fehlgeschlagen." });
          }
        }

        // ---------------- Modul-Verwaltung ----------------
        case "GET /modules": {
          const list = moduleService.getModules(guild.id);
          return send(res, 200, { modules: list });
        }
        case "POST /modules/toggle": {
          const actor = await getActor();
          if (!actor || (actor.id !== guild.ownerId && !actor.permissions.has(PermissionFlagsBits.Administrator))) {
            return send(res, 403, { error: "Module dürfen nur von Administratoren umgeschaltet werden." });
          }
          const body = await readBody(req);
          const moduleId = String(body?.moduleId || "");
          const mod = moduleService.getModuleById(moduleId);
          if (!mod) return send(res, 400, { error: "Unbekanntes Modul." });

          const newState = typeof body?.enabled === "boolean"
            ? (body.enabled ? moduleService.enableModule(guild.id, mod.id) : moduleService.disableModule(guild.id, mod.id))
            : moduleService.toggleModule(guild.id, mod.id);

          console.log(`[Modules] ${by || actor.user.tag} hat Modul '${mod.name}' ${newState ? "aktiviert" : "deaktiviert"}.`);
          // Eigene Befehle an/aus -> Slash-Befehle des Servers neu registrieren
          if (mod.id === "customCommands") customCommandService.syncGuild(client, guild.id).catch((e) => console.error("[CustomCommands]", e));
          return send(res, 200, { ok: true, moduleId: mod.id, enabled: newState, modules: moduleService.getModules(guild.id) });
        }

        case "GET /free-games": {
          const games = await freeGamesService.fetchAll();
          return send(res, 200, { games, settings: freeGamesService.getSettings(guild.id) });
        }
        case "POST /free-games/settings": {
          const body = await readBody(req);
          const patch: Record<string, boolean> = {};
          for (const k of ["epic", "steam", "gog", "other", "upcoming", "keys", "silent"]) {
            if (typeof body[k] === "boolean") patch[k] = body[k];
          }
          return send(res, 200, { settings: freeGamesService.updateSettings(guild.id, patch) });
        }
        case "POST /free-games/post": {
          const body = await readBody(req);
          const result = await freeGamesService.postFreeGames(guild, Boolean(body.repostAll));
          if (result.error === "no_channel") {
            return send(res, 400, { error: "Kein Free-Games-Kanal eingerichtet (Seite „Rollen & Rechte“)." });
          }
          return send(res, 200, result);
        }

        // ---------------- Game-News ----------------
        case "GET /news": {
          const cfg = rolePanelService.getConfig(guild.id) || {};
          const articles = await gameNewsService.getAggregatedArticles(guild.id);
          return send(res, 200, {
            articles,
            feeds: gameNewsService.getFeeds(guild.id),
            history: gameNewsService.getHistory(guild.id).slice(0, 30),
            catalog: gameNewsService.catalog(),
            includes: gameNewsService.includes(),
            setup: {
              roleId: cfg.gameNewsRoleId || null,
              channelId: cfg.gameNewsChannelId || null,
              driverRoleId: cfg.driverNewsRoleId || null,
              driverChannelId: cfg.driverNewsChannelId || null,
            },
          });
        }
        case "POST /news/setup": {
          const game = await rolePanelService.ensureGameNewsSetup(guild);
          const driver = await rolePanelService.ensureDriverNewsSetup(guild);
          // Treiber-Quellen, die bisher im Game-News-Kanal lagen, in den Treiber-Kanal umziehen
          const moved = gameNewsService.moveDriverFeeds(guild.id, game.channel.id, driver.channel.id, driver.role.id, by);
          await rulesService.postChannelHeaders(guild).catch((e) => console.error("[BotAPI] Kanal-Banner:", e));
          return send(res, 200, { game, driver, moved });
        }
        case "POST /news/preview": {
          const body = await readBody(req);
          const result = await gameNewsService.preview(body.type, body.appId ? String(body.appId) : undefined, Boolean(body.snapshots));
          return typeof result === "string" ? send(res, 400, { error: result }) : send(res, 200, { items: result });
        }
        case "POST /news/feeds": {
          const body = await readBody(req);
          const result = gameNewsService.addFeed(guild, body, by);
          if (typeof result === "string") return send(res, 400, { error: result });
          refreshNewsHeader();
          return send(res, 200, { feed: result });
        }
        case "POST /news/feeds/update": {
          const body = await readBody(req);
          const result = gameNewsService.updateFeed(guild, String(body.id), body.patch || {}, by);
          if (typeof result === "string") return send(res, 400, { error: result });
          refreshNewsHeader();
          return send(res, 200, { feed: result });
        }
        case "POST /news/feeds/delete": {
          const body = await readBody(req);
          const ok = gameNewsService.deleteFeed(guild.id, String(body.id), by);
          refreshNewsHeader();
          return send(res, 200, { ok });
        }
        case "POST /news/feeds/test": {
          const body = await readBody(req);
          const withPing = Boolean(body?.withPing);
          const error = await gameNewsService.postLatest(guild, String(body.id), withPing);
          return error ? send(res, 400, { error }) : send(res, 200, { ok: true, withPing });
        }
        case "POST /news/steam-lookup": {
          const body = await readBody(req);
          const result = await gameNewsService.lookupSteam(String(body.input || ""));
          return typeof result === "string" ? send(res, 400, { error: result }) : send(res, 200, result);
        }

        // ---------------- Live-Streamer Suite ----------------
        case "GET /live/active": {
          const entries = liveStreamService.getActiveEntries(guild.id);
          const streamers = [];

          for (const entry of entries) {
            const member = guild.members.cache.get(entry.userId) || (await guild.members.fetch(entry.userId).catch(() => null));
            if (!member) continue;

            const streamingActivity = member.presence?.activities.find((a) => a.type === 1);
            const pendingData = liveStreamService.getPendingData(guild.id, member.id);

            const streamTitle = streamingActivity?.details || pendingData?.title || "Community Stream";
            const game = streamingActivity?.state || pendingData?.game || "Gaming";
            const url = streamingActivity?.url || pendingData?.url || undefined;
            const channel = entry.channelId ? guild.channels.cache.get(entry.channelId) : null;

            streamers.push({
              userId: member.id,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.displayAvatarURL(),
              title: streamTitle,
              game,
              url,
              channelId: entry.channelId,
              channelName: channel ? channel.name : undefined,
              channelType: entry.channelType || "voice",
            });
          }

          return send(res, 200, { ok: true, streamers });
        }

        // ---------------- Regeln ----------------
        case "GET /rules": {
          const cfg = rolePanelService.getConfig(guild.id) || {};
          return send(res, 200, {
            rules: rulesService.getRules(guild.id),
            customized: rulesService.isCustomized(guild.id),
            status: {
              rulesChannelId: cfg.rulesChannelId || null,
              permissionsChannelId: cfg.permissionsChannelId || null,
              guestRoleId: cfg.rulesRoleId || null,
              serverLocked: Boolean(cfg.serverLocked),
              lockProblem: rulesService.checkLockPrerequisites(guild),
            },
          });
        }
        case "PUT /rules": {
          const body = await readBody(req);
          const error = rulesService.saveRules(body.rules, guild.id);
          if (error) return send(res, 400, { error });
          return send(res, 200, { ok: true, rules: rulesService.getRules(guild.id) });
        }
        case "POST /rules/reset": {
          rulesService.resetRules(guild.id);
          return send(res, 200, { ok: true, rules: rulesService.getRules(guild.id) });
        }
        case "POST /rules/post": {
          const { rules, perms } = await rulesService.setupChannels(guild);
          return send(res, 200, {
            ok: true,
            rulesChannel: { id: rules.channel.id, name: rules.channel.name, created: rules.created },
            permissionsChannel: { id: perms.channel.id, name: perms.channel.name, created: perms.created },
          });
        }
        case "POST /rules/lock": {
          if (!rolePanelService.getConfig(guild.id)?.rulesChannelId) {
            return send(res, 400, { error: "Bitte zuerst die Regeln posten, damit der Regelkanal existiert." });
          }
          const problem = rulesService.checkLockPrerequisites(guild);
          if (problem) return send(res, 400, { error: problem.replace(/\*\*/g, "") });
          return send(res, 200, { ok: true, ...(await rulesService.lockServer(guild)) });
        }
        case "POST /rules/unlock": {
          await rulesService.unlockServer(guild);
          return send(res, 200, { ok: true });
        }

        // ---------------- Audit-Logs ----------------
        case "GET /logs": {
          const qs = (req.url || "").split("?")[1] || "";
          const params = new URLSearchParams(qs);
          const page = Number(params.get("page") || 1);
          const limit = Number(params.get("limit") || 50);
          const category = params.get("category") || undefined;
          const query = params.get("q") || undefined;

          const data = auditLogService.getLogs(guild.id, { page, limit, category, query });
          const stats = auditLogService.getStats(guild.id);
          const config = auditLogService.getConfig(guild.id);

          return send(res, 200, {
            ...data,
            stats,
            config,
          });
        }
        case "POST /logs/config": {
          const body = await readBody(req);
          const updated = auditLogService.setConfig(guild.id, body);
          return send(res, 200, { ok: true, config: updated });
        }
        case "POST /logs/setup": {
          const ch = await auditLogService.ensureLogChannel(guild);
          return send(res, 200, { ok: true, channelId: ch.id, channelName: ch.name });
        }

        // ---------------- Backups ----------------
        case "GET /backups": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const backups = backupService.listBackups(guild.id);
          return send(res, 200, { backups });
        }
        case "GET /backups/channels": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const channels = Array.from(guild.channels.cache.values())
            .filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
            .map((channel) => ({ id: channel.id, name: channel.name, type: channel.type }));
          return send(res, 200, { channels });
        }
        case "GET /backups/download": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const qs = (req.url || "").split("?")[1] || "";
          const backupId = new URLSearchParams(qs).get("id") || "";
          if (!backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          const backup = backupService.getBackup(backupId, guild.id);
          if (!backup) return send(res, 404, { error: "Backup nicht gefunden." });
          return send(res, 200, { backup });
        }
        case "POST /backups/upload": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          try {
            const body = await readBody(req, 16 * 1024 * 1024);
            if (!body.backup) return send(res, 400, { error: "Keine Backup-Daten übergeben." });
            const imported = backupService.importBackup(guild.id, body.backup, by || "Web-Upload");
            return send(res, 200, { ok: true, backup: { id: imported.id, summary: imported.summary } });
          } catch (e: any) {
            return send(res, e.status || 400, { error: e.message || "Import fehlgeschlagen." });
          }
        }
        case "POST /backups/upload-encrypted": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const secret = process.env.BACKUP_ENCRYPTION_KEY || "";
          if (secret.length < 32) return send(res, 500, { error: "Der Entschlüsselungsschlüssel ist nicht korrekt konfiguriert." });
          try {
            const encrypted = await readRawBody(req, 16 * 1024 * 1024);
            const imported = backupService.importEncryptedBackup(guild.id, encrypted, secret, by || "Verschlüsselter Web-Upload");
            return send(res, 200, { ok: true, backup: { id: imported.id, summary: imported.summary } });
          } catch (e: any) {
            return send(res, e.status || 400, { error: e.message || "Verschlüsselter Import fehlgeschlagen." });
          }
        }
        case "POST /backups/create": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const body = await readBody(req);
          if (body.chatChannelIds !== undefined && (!Array.isArray(body.chatChannelIds) || body.chatChannelIds.length > 10)) {
            return send(res, 400, { error: "Ungültige Kanal-Auswahl für das Chat-Archiv." });
          }
          const backup = await backupService.createBackup(guild, body.creator || "Web-Dashboard", {
            chatChannelIds: body.chatChannelIds,
            messagesPerChannel: body.messagesPerChannel,
          });
          return send(res, 200, { ok: true, backup: { id: backup.id, summary: backup.summary } });
        }
        case "POST /backups/preview": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const body = await readBody(req);
          if (!body.backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          try {
            const preview = await backupService.previewRestore(guild, body.backupId, body.options);
            return send(res, 200, { ok: true, preview });
          } catch (e: any) {
            return send(res, 400, { error: e.message || "Vorschau fehlgeschlagen." });
          }
        }
        case "POST /backups/restore": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const body = await readBody(req);
          if (!body.backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          if (body.options?.wipeFirst && actorId !== guild.ownerId) {
            return send(res, 403, { error: "Die Wipe-Option darf nur der Server-Inhaber ausführen." });
          }
          // Admin-/Moderationsrechte aus einem Backup darf nur Inhaber oder Administrator wiederherstellen.
          // Sonst könnte man sich über eine hochgeladene Backup-Datei selbst höhere Rechte verschaffen.
          const restoreActor = await getActor();
          const mayRestorePermissions =
            !!restoreActor && (restoreActor.id === guild.ownerId || restoreActor.permissions.has(PermissionFlagsBits.Administrator));
          try {
            const result = await backupService.restoreBackup(guild, body.backupId, {
              ...(body.options || {}),
              allowDangerousPermissions: mayRestorePermissions,
            });
            return send(res, 200, { ok: true, result });
          } catch (e: any) {
            return send(res, 400, { error: e.message || "Wiederherstellung fehlgeschlagen." });
          }
        }
        case "POST /backups/delete":
        case "DELETE /backups/delete": {
          if (!(await canManageBackups())) return send(res, 403, { error: "Server-Verwaltungsrechte erforderlich." });
          const body = await readBody(req);
          if (!body.backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          const ok = backupService.deleteBackup(body.backupId, guild.id);
          return send(res, 200, { ok });
        }

        // ---------------- Embed-Builder ----------------
        case "GET /embeds/channels": {
          const channels = Array.from(guild.channels.cache.values())
            .filter((c) => c.isTextBased())
            .map((c) => ({
              id: c.id,
              name: c.name,
              parentId: c.parentId,
              type: c.type,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return send(res, 200, { channels });
        }
        case "POST /embeds/send": {
          const body = await readBody(req);
          const channelId = String(body.channelId || "").trim();
          if (!channelId) return send(res, 400, { error: "Kein Kanal ausgewählt." });

          const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
          if (!channel || !channel.isTextBased() || !("send" in channel)) {
            return send(res, 400, { error: "Kanal nicht gefunden oder unterstützt keine Textnachrichten." });
          }

          const embedData = body.embed;
          if (!embedData || (!embedData.title && !embedData.description && (!embedData.fields || embedData.fields.length === 0))) {
            return send(res, 400, { error: "Das Embed benötigt mindestens einen Titel, eine Beschreibung oder Felder." });
          }

          const embed = new EmbedBuilder();
          if (embedData.title) embed.setTitle(embedData.title);
          if (embedData.description) embed.setDescription(embedData.description);
          if (embedData.url) embed.setURL(embedData.url);
          if (embedData.color) {
            try {
              const hex = embedData.color.replace("#", "");
              embed.setColor(parseInt(hex, 16));
            } catch {
              embed.setColor(0x5865f2);
            }
          }
          if (embedData.author?.name) {
            embed.setAuthor({
              name: embedData.author.name,
              iconURL: embedData.author.iconURL || undefined,
              url: embedData.author.url || undefined,
            });
          }
          if (embedData.thumbnail?.url) embed.setThumbnail(embedData.thumbnail.url);
          if (embedData.image?.url) embed.setImage(embedData.image.url);
          if (embedData.footer?.text) {
            embed.setFooter({
              text: embedData.footer.text,
              iconURL: embedData.footer.iconURL || undefined,
            });
          }
          if (embedData.timestamp) {
            embed.setTimestamp();
          }
          if (Array.isArray(embedData.fields)) {
            for (const f of embedData.fields) {
              if (f.name && f.value) {
                embed.addFields({ name: String(f.name), value: String(f.value), inline: Boolean(f.inline) });
              }
            }
          }

          const content = body.content ? String(body.content) : undefined;
          const msg = await (channel as any).send({
            content,
            embeds: [embed],
          });

          await auditLogService.log(
            {
              guildId: guild.id,
              category: "server",
              action: "EMBED_SENT",
              executor: { id: "dashboard", tag: by || "Web-Dashboard" },
              target: { id: channel.id, name: (channel as any).name },
              details: {
                channelName: (channel as any).name,
                channelId: channel.id,
                title: embedData.title || "(Ohne Titel)",
              },
            },
            client
          ).catch(() => null);

          return send(res, 200, { ok: true, messageId: msg.id, channelId: channel.id });
        }

        // ---------------- Tickets ----------------
        case "GET /tickets": {
          const allTickets = ticketService.getTickets(guild.id);
          const config = ticketService.getConfig(guild.id);

          // Anreicherung um aktuellen Kanal-Status
          const enriched = allTickets.map((t) => {
            const ch = guild.channels.cache.get(t.channelId);
            return {
              ...t,
              channelExists: Boolean(ch),
              channelName: ch ? ch.name : (t.channelName || `ticket-${t.channelId.slice(0, 4)}`),
            };
          });

          return send(res, 200, {
            tickets: enriched,
            config,
          });
        }
        case "GET /tickets/transcript": {
          const qs = (req.url || "").split("?")[1] || "";
          const params = new URLSearchParams(qs);
          const channelId = params.get("channelId");
          if (!channelId || !/^\d{15,25}$/.test(channelId)) return send(res, 400, { error: "Ungültige channelId." });

          const textTranscript = await ticketService.getTranscript(channelId, guild, "text");
          const htmlTranscript = await ticketService.getTranscript(channelId, guild, "html");

          return send(res, 200, {
            transcript: textTranscript || "Kein Transkript verfügbar.",
            htmlTranscript: htmlTranscript || null,
          });
        }
        case "GET /tickets/messages": {
          const qs = (req.url || "").split("?")[1] || "";
          const params = new URLSearchParams(qs);
          const channelId = params.get("channelId");
          if (!channelId || !/^\d{15,25}$/.test(channelId)) return send(res, 400, { error: "Ungültige channelId." });

          const ch = guild.channels.cache.get(channelId);
          if (!ch || !ch.isTextBased()) {
            return send(res, 404, { error: "Kanal ist geschlossen oder existiert nicht mehr." });
          }

          const messages = await ticketService.getLiveMessages(ch as any);
          return send(res, 200, { messages });
        }
        case "POST /tickets/config": {
          const body = await readBody(req);
          const updated = ticketService.setConfig(guild.id, {
            categoryId: body.categoryId || undefined,
            supportRoleId: body.supportRoleId || undefined,
          });
          return send(res, 200, { ok: true, config: updated });
        }
        case "POST /tickets/post-panel": {
          const body = await readBody(req);
          const channelId = String(body.channelId || "").trim();
          if (!channelId) return send(res, 400, { error: "Kein Kanal ausgewählt." });

          const ok = await ticketService.postPanel(guild, channelId);
          if (!ok) return send(res, 400, { error: "Kanal wurde nicht gefunden oder ist kein Textkanal." });
          return send(res, 200, { ok: true });
        }
        case "POST /tickets/close": {
          const body = await readBody(req);
          const channelId = String(body.channelId || "").trim();
          if (!channelId || !/^\d{15,25}$/.test(channelId)) return send(res, 400, { error: "Ungültige channelId." });

          const ok = await ticketService.closeTicketFromWeb(guild, channelId, by || "Web-Dashboard", client);
          if (!ok) return send(res, 400, { error: "Kanal konnte nicht geschlossen werden (evtl. bereits gelöscht)." });
          return send(res, 200, { ok: true });
        }
        case "POST /tickets/send-message": {
          const body = await readBody(req);
          const channelId = String(body.channelId || "").trim();
          const text = String(body.text || "").trim();
          if (!channelId || !text) return send(res, 400, { error: "Kanal und Nachrichtentext erforderlich." });

          const ok = await ticketService.sendTicketMessage(guild, channelId, text, by || "Web-Support");
          if (!ok) return send(res, 400, { error: "Nachricht konnte nicht gesendet werden." });
          return send(res, 200, { ok: true });
        }
        case "POST /tickets/ensure-support-channel": {
          const ch = await ticketService.ensureSupportChannel(guild);
          return send(res, 200, { ok: true, channelId: ch.id, channelName: ch.name });
        }

        // ---------------- Stats & Level-System ----------------
        case "GET /stats": {
          const topLevels = statsService.getTopLevels(guild.id, 20);
          const topVoice = statsService.getTopVoice(guild.id, 20);
          const topDuos = statsService.getTopDuos(guild.id, 10);
          const config = statsService.getConfig(guild.id);
          const textChannels = guild.channels.cache
            .filter((c) => c.isTextBased())
            .map((c) => ({ id: c.id, name: c.name }));

          return send(res, 200, {
            topLevels,
            topVoice,
            topDuos,
            config,
            textChannels: isLoggedIn ? textChannels : [],
            memberCount: guild.memberCount,
          });
        }
        case "GET /stats/user": {
          const qs = (req.url || "").split("?")[1] || "";
          const params = new URLSearchParams(qs);
          const userId = params.get("userId");
          if (!userId) return send(res, 400, { error: "Keine userId angegeben." });

          if (!/^\d{15,25}$/.test(userId)) return send(res, 400, { error: "Ungültige userId." });

          const profile = statsService.getUserProfile(guild.id, userId);
          // Öffentliche Besucher (ohne Login) sehen keine Moderationsfälle und keine Gesprächspartner
          const partners = isLoggedIn ? statsService.getTopTalkPartners(guild.id, userId, 10) : [];
          const cases = isLoggedIn ? moderationService.getCases(guild.id, userId) : [];
          const config = statsService.getConfig(guild.id);

          const messagesCount = profile?.stats.messagesCount || 0;
          const voiceMinutes = profile?.stats.voiceMinutes || 0;
          const avgMsgXp = Math.round(((config.messageXpMin || 15) + (config.messageXpMax || 25)) / 2);
          const estimatedChatXp = messagesCount * avgMsgXp;
          const estimatedVoiceXp = voiceMinutes * (config.voiceXpPerMinute || 5);
          const totalPenaltiesXp = cases.reduce((sum, c) => sum + (c.xpLost || 0), 0);

          return send(res, 200, {
            profile: profile ? { ...profile, dailyStreak: dailyService.getStreak(guild.id, userId) } : profile,
            partners,
            cases: cases.map((c) => ({
              id: c.id,
              action: c.action,
              reason: c.reason,
              xpLost: c.xpLost,
              createdAt: c.createdAt,
            })),
            breakdown: {
              messagesCount,
              avgMsgXp,
              estimatedChatXp,
              voiceMinutes,
              voiceXpPerMinute: config.voiceXpPerMinute || 5,
              estimatedVoiceXp,
              totalPenaltiesXp,
              penaltyCasesCount: cases.length,
            },
          });
        }
        case "POST /stats/config": {
          const body = await readBody(req);
          const patch: any = {};

          if (typeof body.levelUpNotifications === "boolean") patch.levelUpNotifications = body.levelUpNotifications;
          if (body.levelUpChannelId !== undefined) patch.levelUpChannelId = body.levelUpChannelId || undefined;
          if (body.levelUpMessage !== undefined) patch.levelUpMessage = String(body.levelUpMessage || "");

          if (typeof body.maxLevel === "number") patch.maxLevel = Math.max(1, Math.min(100, Math.floor(body.maxLevel)));
          if (typeof body.baseXp === "number") patch.baseXp = Math.max(50, Math.min(5000, Math.floor(body.baseXp)));
          if (typeof body.exponent === "number") patch.exponent = Math.max(1.0, Math.min(3.0, Number(body.exponent)));

          if (typeof body.messageXpMin === "number") patch.messageXpMin = Math.max(1, Math.floor(body.messageXpMin));
          if (typeof body.messageXpMax === "number") patch.messageXpMax = Math.max(1, Math.floor(body.messageXpMax));
          if (typeof body.messageCooldownSeconds === "number") patch.messageCooldownSeconds = Math.max(5, Math.floor(body.messageCooldownSeconds));

          if (typeof body.voiceXpPerMinute === "number") patch.voiceXpPerMinute = Math.max(1, Math.floor(body.voiceXpPerMinute));

          if (typeof body.warnPenaltyXp === "number") patch.warnPenaltyXp = Math.max(0, Math.floor(body.warnPenaltyXp));
          if (typeof body.timeoutPenaltyXp === "number") patch.timeoutPenaltyXp = Math.max(0, Math.floor(body.timeoutPenaltyXp));
          if (typeof body.prisonPenaltyXp === "number") patch.prisonPenaltyXp = Math.max(0, Math.floor(body.prisonPenaltyXp));
          if (typeof body.badNamePenaltyXp === "number") patch.badNamePenaltyXp = Math.max(0, Math.floor(body.badNamePenaltyXp));
          if (typeof body.blacklistPenaltyXp === "number") patch.blacklistPenaltyXp = Math.max(0, Math.floor(body.blacklistPenaltyXp));
          if (typeof body.kickPenaltyXp === "number") patch.kickPenaltyXp = Math.max(0, Math.floor(body.kickPenaltyXp));
          if (typeof body.banPenaltyXp === "number") patch.banPenaltyXp = Math.max(0, Math.floor(body.banPenaltyXp));

          if (body.roleRewards && typeof body.roleRewards === "object" && !Array.isArray(body.roleRewards)) {
            // Rollen-Belohnungen prüfen: gültiges Level, Rolle existiert, Bot kann sie vergeben,
            // keine Admin-/Verwaltungsrechte (außer für Owner & Administratoren), nur unter der eigenen Rolle
            const actor = await getActor();
            const actorIsAdmin = !!actor && (actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator));
            const maxLevel = Number(patch.maxLevel ?? statsService.getConfig(guild.id).maxLevel ?? 25);
            const botTop = guild.members.me?.roles.highest.position ?? 0;
            const DANGEROUS =
              PermissionFlagsBits.Administrator |
              PermissionFlagsBits.ManageGuild |
              PermissionFlagsBits.ManageRoles |
              PermissionFlagsBits.ManageChannels |
              PermissionFlagsBits.BanMembers |
              PermissionFlagsBits.KickMembers |
              PermissionFlagsBits.ManageWebhooks;
            const clean: Record<number, string> = {};
            for (const [lvlRaw, roleIdRaw] of Object.entries(body.roleRewards).slice(0, 25)) {
              const lvl = Math.floor(Number(lvlRaw));
              const roleId = String(roleIdRaw || "");
              if (!roleId) continue; // leer = entfernen
              if (!Number.isFinite(lvl) || lvl < 1 || lvl > maxLevel) return send(res, 400, { error: `Ungültiges Level ${lvlRaw} (1 bis ${maxLevel}).` });
              const role = guild.roles.cache.get(roleId);
              if (!role || role.managed || role.id === guild.id) return send(res, 400, { error: `Level ${lvl}: Rolle nicht gefunden oder nicht vergebbar.` });
              if (role.position >= botTop) return send(res, 400, { error: `Level ${lvl}: Die Rolle „${role.name}“ steht über der Bot-Rolle - der Bot kann sie nicht vergeben.` });
              if (!actorIsAdmin && (role.permissions.bitfield & DANGEROUS) !== BigInt(0)) {
                return send(res, 403, { error: `Level ${lvl}: Rollen mit Admin- oder Verwaltungsrechten dürfen nur Administratoren als Belohnung festlegen.` });
              }
              if (!(await outranks(role.position))) return send(res, 403, { error: `Level ${lvl}: Du kannst nur Rollen unter deiner höchsten Rolle festlegen.` });
              clean[lvl] = roleId;
            }
            patch.roleRewards = clean;
          }

          const updated = statsService.setConfig(guild.id, patch);
          return send(res, 200, { ok: true, config: updated });
        }
        case "POST /stats/sync-roles": {
          const body = await readBody(req);
          const userId = body.userId;
          if (userId) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return send(res, 404, { error: "Mitglied nicht gefunden." });
            const result = await statsService.syncUserRoleRewards(guild, member);
            return send(res, 200, { ok: true, added: result.added, roles: result.roles });
          } else {
            let totalAdded = 0;
            for (const member of guild.members.cache.values()) {
              if (member.user.bot) continue;
              const r = await statsService.syncUserRoleRewards(guild, member);
              totalAdded += r.added.length;
            }
            return send(res, 200, { ok: true, totalAdded });
          }
        }

        // ---------------- Moderation & Admin-Panel ----------------
        case "GET /moderation/members": {
          await guild.members.fetch().catch(() => null);
          const notes = loadAdminNotes();
          const membersList = guild.members.cache.map((m) => {
            const stats = statsService.getOrCreateUser(guild, m.user);
            const isPrisoner = prisonService.isImprisoned(guild.id, m.id);
            const prisonData = prisonService.getPrisonEntry(guild.id, m.id);
            const badNameCheck = blacklistService.isBadName(guild.id, m.displayName);
            const cases = moderationService.getCases(guild.id, m.id);

            return {
              userId: m.id,
              tag: m.user.tag || m.user.username,
              username: m.user.username,
              displayName: m.displayName,
              nickname: m.nickname,
              avatar: m.user.displayAvatarURL(),
              roles: m.roles.cache
                .filter((r) => r.id !== guild.id)
                .map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
              joinedAt: m.joinedAt?.toISOString() || null,
              createdAt: m.user.createdAt?.toISOString() || null,
              voiceMinutes: stats.voiceMinutes || 0,
              messagesCount: stats.messagesCount || 0,
              adminNote: notes[noteKey(guild.id, m.id)] || "",
              isBot: m.user.bot,
              isOwner: m.id === guild.ownerId,
              isModeratable: m.moderatable,
              xp: stats.xp,
              level: stats.level,
              casesCount: cases.length,
              isImprisoned: isPrisoner,
              prisonData: prisonData || null,
              isTimedOut: m.isCommunicationDisabled(),
              timeoutUntil: m.communicationDisabledUntil?.toISOString() || null,
              badName: badNameCheck,
            };
          });

          // Sortierung: Auffällige und Gefangene nach oben, danach nach XP
          membersList.sort((a, b) => {
            if (a.isImprisoned && !b.isImprisoned) return -1;
            if (!a.isImprisoned && b.isImprisoned) return 1;
            if (a.badName.isBad && !b.badName.isBad) return -1;
            if (!a.badName.isBad && b.badName.isBad) return 1;
            return b.xp - a.xp;
          });

          return send(res, 200, {
            members: membersList,
            total: membersList.length,
            prisonersCount: prisonService.getPrisonList(guild.id).length,
          });
        }

        case "POST /moderation/action": {
          const body = await readBody(req);
          const { action, targetId, reason = "Keine Begründung angegeben", duration = 300, deleteDays = 0 } = body;
          if (!action || !targetId) {
            return send(res, 400, { error: "Aktion und targetId sind erforderlich." });
          }

          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (targetMember) {
            if (targetMember.id === guild.ownerId) return send(res, 403, { error: "Der Server-Owner kann nicht moderiert werden." });
            if (targetMember.id === actorId) return send(res, 403, { error: "Du kannst dich nicht selbst moderieren." });
            if (!(await outranks(targetMember.roles.highest.position))) {
              return send(res, 403, { error: "Das Mitglied hat eine gleich hohe oder höhere Rolle als du." });
            }
          }
          const modName = by || "Web-Admin";
          // Als Moderator den tatsächlich eingeloggten Nutzer eintragen (nicht pauschal den Owner)
          const modUser =
            (actorId && (await client.users.fetch(actorId).catch(() => null))) ||
            (await client.users.fetch(guild.ownerId).catch(() => null)) ||
            client.user!;

          switch (action) {
            case "warn": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              const modCase = await moderationService.createCase(
                guild,
                modUser,
                targetMember.user,
                "WARN",
                reason,
                { client }
              );
              return send(res, 200, { ok: true, caseId: modCase.id, xpLost: modCase.xpLost, newLevel: modCase.newLevel });
            }

            case "timeout": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              if (!targetMember.moderatable) return send(res, 403, { error: "Mitglied kann nicht moderiert werden (Rollenrechte)." });

              const durationSeconds = Number(duration) || 300;
              const durationMs = durationSeconds === 0 ? null : durationSeconds * 1000;
              await targetMember.timeout(durationMs, reason);

              const modCase = await moderationService.createCase(
                guild,
                modUser,
                targetMember.user,
                "TIMEOUT",
                reason,
                { duration: durationSeconds === 0 ? "Aufgehoben" : `${durationSeconds / 60}m`, client }
              );
              return send(res, 200, { ok: true, caseId: modCase.id, xpLost: modCase.xpLost, newLevel: modCase.newLevel });
            }

            case "prison": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              const durationMinutes =
                typeof body.durationMinutes === "number" && body.durationMinutes > 0
                  ? body.durationMinutes
                  : null;
              const result = await prisonService.imprison(
                guild,
                targetMember,
                reason,
                { id: modUser.id, tag: modName, avatar: modUser.displayAvatarURL() },
                client,
                durationMinutes
              );
              if (!result.ok) return send(res, 400, { error: result.error });
              return send(res, 200, { ok: true, xpPenalty: result.xpPenalty });
            }

            case "unprison": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              const result = await prisonService.unprison(
                guild,
                targetMember,
                { id: modUser.id, tag: modName },
                client
              );
              if (!result.ok) return send(res, 400, { error: result.error });
              return send(res, 200, { ok: true });
            }

            case "bad_name": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              const result = await blacklistService.moderateBadName(guild, targetMember, modUser, client);
              if (!result.ok) return send(res, 400, { error: result.error });
              return send(res, 200, { ok: true, newNick: result.newNick });
            }

            case "kick": {
              if (!targetMember) return send(res, 404, { error: "Mitglied nicht gefunden." });
              if (!targetMember.kickable) return send(res, 403, { error: "Mitglied kann nicht gekickt werden (Rollenrechte)." });
              await targetMember.kick(reason);
              const modCase = await moderationService.createCase(
                guild,
                modUser,
                targetMember.user,
                "KICK",
                reason,
                { client }
              );
              return send(res, 200, { ok: true, caseId: modCase.id, xpLost: modCase.xpLost });
            }

            case "ban": {
              const targetUser = targetMember?.user || (await client.users.fetch(targetId).catch(() => null));
              if (!targetUser) return send(res, 404, { error: "Nutzer nicht gefunden." });
              await guild.members.ban(targetId, {
                reason,
                deleteMessageSeconds: Math.min(7, Math.max(0, Number(deleteDays) || 0)) * 86400,
              });
              const modCase = await moderationService.createCase(
                guild,
                modUser,
                targetUser,
                "BAN",
                reason,
                { client }
              );
              return send(res, 200, { ok: true, caseId: modCase.id, xpLost: modCase.xpLost });
            }

            case "unban": {
              await guild.members.unban(targetId, reason);
              const targetUser = (await client.users.fetch(targetId).catch(() => null)) || ({ id: targetId, tag: targetId } as any);
              const modCase = await moderationService.createCase(
                guild,
                modUser,
                targetUser,
                "UNBAN",
                reason,
                { client }
              );
              return send(res, 200, { ok: true, caseId: modCase.id });
            }

            default:
              return send(res, 400, { error: `Unbekannte Moderations-Aktion: ${action}` });
          }
        }

        case "GET /moderation/blacklist": {
          return send(res, 200, { config: blacklistService.getConfig(guild.id) });
        }

        case "POST /moderation/blacklist": {
          const body = await readBody(req);
          const updated = blacklistService.setConfig(guild.id, body);
          return send(res, 200, { ok: true, config: updated });
        }

        case "GET /moderation/cases": {
          const cases = moderationService.getCases(guild.id);
          return send(res, 200, { cases, total: cases.length });
        }

        case "GET /moderation/roles": {
          const roles = guild.roles.cache
            .filter((r) => r.id !== guild.id && !r.managed)
            .map((r) => ({
              id: r.id,
              name: r.name,
              color: r.hexColor,
              position: r.position,
            }))
            .sort((a, b) => b.position - a.position);
          return send(res, 200, { roles });
        }

        case "POST /moderation/member-roles": {
          const body = await readBody(req);
          const { userId, roleId, action } = body; // action: "add" | "remove"
          if (!userId || !roleId || !action) {
            return send(res, 400, { error: "userId, roleId und action (add/remove) erforderlich." });
          }
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return send(res, 404, { error: "Mitglied nicht gefunden." });
          const role = guild.roles.cache.get(roleId);
          if (!role) return send(res, 404, { error: "Rolle nicht gefunden." });
          if (role.managed || role.id === guild.id) return send(res, 400, { error: "Diese Rolle kann nicht vergeben werden." });

          // Schutz vor Rechteausweitung: Rollen nur unterhalb der eigenen höchsten Rolle,
          // gefährliche Rechte (Admin, Server/Rollen verwalten, Bannen …) nur für Owner & Administratoren
          const actor = await getActor();
          const actorIsAdmin = !!actor && (actor.id === guild.ownerId || actor.permissions.has(PermissionFlagsBits.Administrator));
          const DANGEROUS =
            PermissionFlagsBits.Administrator |
            PermissionFlagsBits.ManageGuild |
            PermissionFlagsBits.ManageRoles |
            PermissionFlagsBits.ManageChannels |
            PermissionFlagsBits.BanMembers |
            PermissionFlagsBits.KickMembers |
            PermissionFlagsBits.ManageWebhooks;
          if (!actorIsAdmin && (role.permissions.bitfield & DANGEROUS) !== BigInt(0)) {
            return send(res, 403, { error: "Rollen mit Admin- oder Verwaltungsrechten dürfen nur Administratoren vergeben." });
          }
          if (!(await outranks(role.position))) {
            return send(res, 403, { error: "Du kannst nur Rollen vergeben, die unter deiner höchsten Rolle stehen." });
          }
          if (member.id !== actorId && member.id !== guild.ownerId && !(await outranks(member.roles.highest.position))) {
            return send(res, 403, { error: "Das Mitglied hat eine gleich hohe oder höhere Rolle als du." });
          }
          if (member.id === guild.ownerId && !actorIsAdmin) return send(res, 403, { error: "Rollen des Owners darf nur ein Administrator ändern." });

          if (action === "add") {
            await member.roles.add(role, `Benutzerverwaltung Webinterface durch ${by || "Admin"}`);
          } else {
            await member.roles.remove(role, `Benutzerverwaltung Webinterface durch ${by || "Admin"}`);
          }
          return send(res, 200, { ok: true, action, roleId });
        }

        case "POST /moderation/member-nickname": {
          const body = await readBody(req);
          const { userId, nickname } = body;
          if (!userId) return send(res, 400, { error: "userId erforderlich." });
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return send(res, 404, { error: "Mitglied nicht gefunden." });

          if (member.id === guild.ownerId) return send(res, 403, { error: "Den Spitznamen des Owners kann der Bot nicht ändern." });
          if (member.id !== actorId && !(await outranks(member.roles.highest.position))) {
            return send(res, 403, { error: "Das Mitglied hat eine gleich hohe oder höhere Rolle als du." });
          }
          await member.setNickname(nickname ? String(nickname).slice(0, 32) : null, `Benutzerverwaltung durch ${by || "Admin"}`);
          return send(res, 200, { ok: true, nickname: member.nickname });
        }

        case "POST /moderation/adjust-xp": {
          const body = await readBody(req);
          const { userId, amount, mode } = body; // mode: "add" | "deduct" | "set"
          if (!userId || typeof amount !== "number") {
            return send(res, 400, { error: "userId und numerischer amount erforderlich." });
          }
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return send(res, 404, { error: "Mitglied nicht gefunden." });
          const stats = statsService.getOrCreateUser(guild, member.user);

          if (mode === "add") {
            stats.xp += Math.abs(amount);
          } else if (mode === "deduct") {
            stats.xp = Math.max(0, stats.xp - Math.abs(amount));
          } else if (mode === "set") {
            stats.xp = Math.max(0, amount);
          }
          const prog = statsService.calculateLevelProgress(stats.xp);
          stats.level = prog.level;
          return send(res, 200, { ok: true, xp: stats.xp, level: stats.level });
        }

        case "POST /moderation/notes": {
          const body = await readBody(req);
          const { userId, note } = body;
          if (!userId) return send(res, 400, { error: "userId erforderlich." });
          const notes = loadAdminNotes();
          notes[noteKey(guild.id, userId)] = String(note || "").trim();
          saveAdminNotes(notes);
          return send(res, 200, { ok: true, userId, note: notes[noteKey(guild.id, userId)] });
        }

        case "GET /radio/status": {
          const status = radioService.getStatus(guild.id);
          return send(res, 200, { status });
        }

        case "POST /radio/start": {
          if ((process.env.MUSIC_MODE || "embedded") === "disabled") {
            return send(res, 503, { error: "Musik ist deaktiviert (MUSIC_MODE=disabled)." });
          }
          const body = await readBody(req);
          const { url, name, channelId } = body;
          if (!url) return send(res, 400, { error: "url erforderlich." });
          let channel = null as import("discord.js").VoiceBasedChannel | null;
          if (channelId) {
            const fetched = await guild.channels.fetch(String(channelId)).catch(() => null);
            if (!fetched || !fetched.isVoiceBased()) {
              return send(res, 400, { error: "Der gewählte Kanal ist kein Sprachkanal." });
            }
            channel = fetched;
          } else {
            const member = actorId ? await guild.members.fetch(actorId).catch(() => null) : null;
            channel = member?.voice?.channel ?? null;
          }
          if (!channel) return send(res, 400, { error: "Kein Sprachkanal gefunden. Wähle im Dashboard einen Ziel-Sprachkanal oder betrete einen Voice-Kanal." });
          const status = await radioService.start(channel, String(url), String(name || "Web-Radio"), actorId || undefined);
          return send(res, 200, { status });
        }

        case "POST /music/play-local": {
          if ((process.env.MUSIC_MODE || "embedded") === "disabled") {
            return send(res, 503, { error: "Musik ist deaktiviert (MUSIC_MODE=disabled)." });
          }
          const body = await readBody(req);
          const { file, channelId } = body;
          if (!file) return send(res, 400, { error: "file erforderlich." });
          let channel = null as import("discord.js").VoiceBasedChannel | null;
          if (channelId) {
            const fetched = await guild.channels.fetch(String(channelId)).catch(() => null);
            if (!fetched || !fetched.isVoiceBased()) {
              return send(res, 400, { error: "Der gewählte Kanal ist kein Sprachkanal." });
            }
            channel = fetched;
          } else {
            const member = actorId ? await guild.members.fetch(actorId).catch(() => null) : null;
            channel = member?.voice?.channel ?? null;
          }
          if (!channel) return send(res, 400, { error: "Kein Sprachkanal gefunden. Wähle im Dashboard einen Ziel-Sprachkanal oder betrete einen Voice-Kanal." });
          const requester =
            (actorId && (await client.users.fetch(actorId).catch(() => null))) ||
            client.user;
          if (!requester) return send(res, 500, { error: "Anfragender Nutzer unbekannt." });
          try {
            const result = await musicService.play(channel, `local:${String(file)}`, requester);
            return send(res, 200, { ok: true, result: { status: result.status, title: result.item?.title, position: result.position } });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Konnte Datei nicht abspielen." });
          }
        }

        case "POST /music/play-playlist": {
          if ((process.env.MUSIC_MODE || "embedded") === "disabled") {
            return send(res, 503, { error: "Musik ist deaktiviert (MUSIC_MODE=disabled)." });
          }
          const body = await readBody(req);
          const { files, channelId } = body;
          if (!Array.isArray(files) || files.length === 0 || files.length > 100) {
            return send(res, 400, { error: "files (1–100) erforderlich." });
          }
          let channel = null as import("discord.js").VoiceBasedChannel | null;
          if (channelId) {
            const fetched = await guild.channels.fetch(String(channelId)).catch(() => null);
            if (!fetched || !fetched.isVoiceBased()) {
              return send(res, 400, { error: "Der gewählte Kanal ist kein Sprachkanal." });
            }
            channel = fetched;
          } else {
            const member = actorId ? await guild.members.fetch(actorId).catch(() => null) : null;
            channel = member?.voice?.channel ?? null;
          }
          if (!channel) return send(res, 400, { error: "Kein Sprachkanal gefunden. Wähle im Dashboard einen Ziel-Sprachkanal oder betrete einen Voice-Kanal." });
          const requester =
            (actorId && (await client.users.fetch(actorId).catch(() => null))) ||
            client.user;
          if (!requester) return send(res, 500, { error: "Anfragender Nutzer unbekannt." });
          const failed: Array<{ file: string; error: string }> = [];
          let added = 0;
          for (const f of files.slice(0, 100)) {
            try {
              await musicService.play(channel, `local:${String(f)}`, requester);
              added++;
            } catch (e: any) {
              failed.push({ file: String(f), error: e?.message || "Fehler" });
            }
          }
          return send(res, 200, { ok: true, added, failed });
        }

        case "POST /music/play-youtube": {
          if ((process.env.MUSIC_MODE || "embedded") === "disabled") {
            return send(res, 503, { error: "Musik ist deaktiviert (MUSIC_MODE=disabled)." });
          }
          const body = await readBody(req);
          const { query, channelId } = body;
          const cleanQuery = String(query || "").trim();
          if (!cleanQuery) return send(res, 400, { error: "query erforderlich (YouTube-Link oder Suchbegriff)." });

          let channel = null as import("discord.js").VoiceBasedChannel | null;
          if (channelId) {
            const fetched = await guild.channels.fetch(String(channelId)).catch(() => null);
            if (!fetched || !fetched.isVoiceBased()) {
              return send(res, 400, { error: "Der gewählte Kanal ist kein Sprachkanal." });
            }
            channel = fetched;
          } else {
            const member = actorId ? await guild.members.fetch(actorId).catch(() => null) : null;
            channel = member?.voice?.channel ?? null;
          }
          if (!channel) return send(res, 400, { error: "Kein Sprachkanal gefunden. Wähle im Dashboard einen Ziel-Sprachkanal oder betrete einen Voice-Kanal." });

          const requester =
            (actorId && (await client.users.fetch(actorId).catch(() => null))) ||
            client.user;
          if (!requester) return send(res, 500, { error: "Anfragender Nutzer unbekannt." });

          // YouTube-Playlist?
          const listId = musicService.extractPlaylistId(cleanQuery);
          if (listId) {
            try {
              const imp = await musicService.importYouTubePlaylist(channel, listId, requester);
              return send(res, 200, {
                ok: true,
                isPlaylist: true,
                name: imp.name,
                added: imp.added,
                failed: imp.failed,
              });
            } catch (plErr: any) {
              const { extractVideoId } = await import("../utils/ytDlpService");
              const vid = extractVideoId(cleanQuery);
              if (!vid) {
                return send(res, 400, { error: plErr?.message || "Playlist-Import fehlgeschlagen." });
              }
              // Hat Video-ID -> Fall-Through als Einzelvideo
            }
          }

          try {
            const result = await musicService.play(channel, cleanQuery, requester);
            return send(res, 200, {
              ok: true,
              isPlaylist: false,
              result: {
                status: result.status,
                title: result.item?.title,
                duration: result.item?.duration,
                thumbnail: result.item?.thumbnail,
                position: result.position,
              },
            });
          } catch (e: any) {
            return send(res, 400, { error: e?.message || "Konnte Song nicht abspielen." });
          }
        }

        case "POST /radio/setup-channel": {
          if ((process.env.MUSIC_MODE || "embedded") === "disabled") {
            return send(res, 503, { error: "Musik ist deaktiviert (MUSIC_MODE=disabled)." });
          }
          const body = await readBody(req);
          const { url, name, channelId, userLimit } = body;
          if (!url) return send(res, 400, { error: "url erforderlich." });
          const stationName = String(name || "Radio").slice(0, 60);
          const limit = Number.isFinite(Number(userLimit)) ? Math.max(0, Math.min(99, Number(userLimit))) : 0;
          let target: import("discord.js").VoiceBasedChannel | null = null;
          let created = false;
          if (channelId) {
            const fetched = await guild.channels.fetch(String(channelId)).catch(() => null);
            if (!fetched || !fetched.isVoiceBased()) {
              return send(res, 400, { error: "Der gewählte Kanal ist kein Sprachkanal." });
            }
            target = fetched;
            if (limit > 0 && "setUserLimit" in target) {
              await (target as import("discord.js").VoiceChannel).setUserLimit(limit).catch(() => null);
            }
          } else {
            const wanted = `📻・${stationName}`.toLowerCase();
            const existing = guild.channels.cache.find(
              (c) => c.isVoiceBased() && c.name.toLowerCase() === wanted,
            ) as import("discord.js").VoiceBasedChannel | undefined;
            if (existing) {
              target = existing;
            } else {
              let category = guild.channels.cache.find(
                (c) => c.type === ChannelType.GuildCategory && /musik|music|radio/i.test(c.name),
              );
              if (!category) {
                category = await guild.channels.create({
                  name: "🎵 Musik",
                  type: ChannelType.GuildCategory,
                  reason: "GLGBot: Radio-Einrichtung",
                });
              }
              // Beste Audioqualität (384 → 128 → Standard)
              const { createMusicVoiceChannel } = await import("../utils/voiceQuality");
              target = await createMusicVoiceChannel(guild, {
                name: `📻・${stationName}`,
                parent: category.id,
                userLimit: limit,
                reason: "GLGBot: Radio-Einrichtung",
              });
              created = true;
            }
          }
          // Kanal-Bitrate auf Musik-Niveau heben (gegen Lag durch Transcoding)
          try {
            const { ensureMusicBitrate } = await import("../utils/voiceQuality");
            await ensureMusicBitrate(target);
          } catch {}
          const status = await radioService.start(target, String(url), stationName);
          if (created) trackMusicChannel(guild.id, target.id, target.name, stationName, guild);
          return send(res, 200, { status, channelId: target.id, created });
        }

        case "POST /radio/probe": {
          const body = await readBody(req);
          const { url } = body;
          if (!url) return send(res, 400, { error: "url erforderlich." });
          const result = await radioService.probeUrl(String(url));
          return send(res, 200, result);
        }

        case "POST /radio/stop": {
          const ok = await radioService.stop(guild.id);
          return send(res, 200, { ok });
        }

        // ---------------- Wiedergabe-Steuerung (Radio ODER Musik) ----------------
        // Das Dashboard kann Musik starten, hatte aber nur Radio-Knöpfe - Musik ließ
        // sich darum nicht stoppen. Diese Route wirkt auf das, was gerade läuft.
        case "POST /playback/stop":
        case "POST /playback/pause":
        case "POST /playback/resume":
        case "POST /playback/skip": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const aktion = route.split("/")[2] as "stop" | "pause" | "resume" | "skip";
          const musikLaeuft = !!musicService.getStatus(guild.id);
          const radioLaeuft = !!radioService.getStatus(guild.id);
          if (!musikLaeuft && !radioLaeuft) {
            return send(res, 400, { error: "Es läuft gerade nichts." });
          }
          const quelle = musikLaeuft ? "musik" : "radio";
          let ok = false;
          if (aktion === "skip") {
            if (!musikLaeuft) return send(res, 400, { error: "Überspringen geht nur bei Musik, nicht beim Radio." });
            ok = musicService.skip(guild.id);
          } else if (musikLaeuft) {
            ok = aktion === "stop" ? musicService.stop(guild.id) : aktion === "pause" ? musicService.pause(guild.id) : musicService.resume(guild.id);
          } else {
            ok = aktion === "stop" ? await radioService.stop(guild.id) : aktion === "pause" ? radioService.pause(guild.id) : radioService.resume(guild.id);
          }
          console.log(`[Wiedergabe] ${by || actorId || "Dashboard"}: ${aktion} (${quelle}) auf ${guild.name}`);
          return send(res, 200, { ok, quelle });
        }

        case "POST /music/volume": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const body = await readBody(req);
          const percent = Number(body?.percent);
          if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
            return send(res, 400, { error: "Lautstärke muss zwischen 0 und 100 liegen." });
          }
          return send(res, 200, { ok: musicService.setVolume(guild.id, percent, body?.channelId || null, actorId || null) });
        }

        case "POST /music/shuffle": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, { ok: musicService.shuffle(guild.id) });
        }

        // ---------------- Ducking (Leiser beim Sprechen) ----------------
        case "GET /ducking": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, {
            settings: musicPrefsService.getDucking(guild.id),
            aktiv: voiceDuckingService.isActive(guild.id),
            geduckt: voiceDuckingService.isDucked(guild.id),
          });
        }

        case "POST /ducking": {
          const actor = await getActor();
          if (!actor?.permissions.has(PermissionFlagsBits.ManageGuild) && actor?.id !== guild.ownerId) {
            return send(res, 403, { error: "Dafür brauchst du „Server verwalten“." });
          }
          const body = await readBody(req);
          const settings = musicPrefsService.setDucking(guild.id, {
            enabled: body?.enabled === undefined ? undefined : !!body.enabled,
            level: body?.level === undefined ? undefined : Number(body.level),
            releaseMs: body?.releaseMs === undefined ? undefined : Number(body.releaseMs),
          });
          // Sofort auf eine laufende Wiedergabe anwenden
          voiceDuckingService.applySettings(guild.id, settings);
          console.log(`[Ducking] ${by || actor?.user.tag}: ${settings.enabled ? `an, ${settings.level} %` : "aus"} auf ${guild.name}`);
          return send(res, 200, { ok: true, settings, aktiv: voiceDuckingService.isActive(guild.id) });
        }

        case "POST /radio/pause": {
          const ok = radioService.pause(guild.id);
          return send(res, 200, { ok });
        }

        case "POST /radio/resume": {
          const ok = radioService.resume(guild.id);
          return send(res, 200, { ok });
        }

        case "POST /radio/volume": {
          const body = await readBody(req);
          const percent = Math.max(0, Math.min(100, Number(body?.volume ?? body?.percent ?? 100)));
          const channelId = typeof body?.channelId === "string" ? body.channelId : undefined;
          const ok = radioService.setVolume(guild.id, percent, channelId, actorId || undefined);
          if (!ok) return send(res, 400, { error: "Es läuft gerade kein Radio." });
          return send(res, 200, { ok: true, volume: percent });
        }

        case "GET /sounds": {
          const { soundboardService } = await import("../services/soundboardService");
          return send(res, 200, { sounds: soundboardService.list(), usage: soundboardService.usage() });
        }

        case "GET /musicbot/status": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          return send(res, 200, musicBotManager.status());
        }

        case "POST /musicbot/start":
        case "POST /musicbot/stop":
        case "POST /musicbot/restart": {
          const actor = await getActor();
          if (!actor || (actor.id !== guild.ownerId && !actor.permissions.has(PermissionFlagsBits.Administrator))) {
            return send(res, 403, { error: "Nur Owner und Administratoren dürfen den Musik-Bot steuern." });
          }
          if (route === "POST /musicbot/start") return send(res, 200, musicBotManager.start());
          if (route === "POST /musicbot/stop") return send(res, 200, await musicBotManager.stop());
          return send(res, 200, await musicBotManager.restart());
        }

        case "POST /music/upload-code": {
          const actor = await getActor();
          if (!actor || (actor.id !== guild.ownerId && !actor.permissions.has(PermissionFlagsBits.Administrator))) {
            return send(res, 403, { error: "Nur Owner und Administratoren können Upload-Codes erzeugen." });
          }
          const { musicUploadService } = await import("../services/musicUploadService");
          const code = musicUploadService.createCode(guild.id, actor.id);
          return send(res, 200, { code, expiresInSec: 600 });
        }

        case "GET /music/queue": {
          const status = musicService.getStatus(guild.id);
          return send(res, 200, {
            current: status?.current || null,
            queue: musicService.getQueue(guild.id),
            loop: status?.loop || "off",
            paused: status?.isPaused || false,
            volume: status?.volume ?? 100,
            channelId: status?.channelId || null,
            lastError: status?.lastError || null,
          });
        }

        default:
          return send(res, 404, { error: "Unbekannte Aktion." });
      }
    } catch (e: any) {
      if (e instanceof PayloadTooLargeError || e?.status === 413 || e?.message?.includes("zu groß")) {
        return send(res, 413, { error: e.message || "Anfrage zu groß (maximal 512 KB erlaubt)." });
      }
      if (e instanceof InvalidJsonError || e instanceof SyntaxError || e?.status === 400) {
        return send(res, 400, { error: e.message || "Ungültiges JSON-Format im Anfrage-Body." });
      }
      console.error(`[BotAPI] Fehler bei ${route}:`, e);
      return send(res, 500, { error: e?.message || "Interner Fehler." });
    }
  });

  server.on("error", (e) => console.error("[BotAPI] Server-Fehler:", e));
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`🔌 [BotAPI] Dashboard-Schnittstelle bereit auf 127.0.0.1:${PORT}`);
  });
}
