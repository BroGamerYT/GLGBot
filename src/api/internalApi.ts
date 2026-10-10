import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client, PermissionFlagsBits, EmbedBuilder } from "discord.js";
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
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 512 * 1024) throw new Error("Anfrage zu groß");
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

const NOTES_FILE = path.join(__dirname, "../../data/admin_notes.json");
function loadAdminNotes(): Record<string, string> {
  try {
    if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8"));
  } catch {}
  return {};
}
function saveAdminNotes(notes: Record<string, string>) {
  try {
    const dir = path.dirname(NOTES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
  } catch {}
}

export function startInternalApi(client: Client) {
  const token = getToken();
  if (!token) {
    console.warn("⚠️ [BotAPI] Kein SESSION_SECRET/INTERNAL_API_TOKEN (min. 32 Zeichen) - Dashboard-Aktionen sind deaktiviert.");
    return;
  }

  const server = http.createServer(async (req, res) => {
    const given = String(req.headers["x-bot-token"] || "");
    if (!safeEqual(given, token)) return send(res, 401, { error: "Nicht autorisiert." });

    const guildId = process.env.GUILD_ID || "";
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return send(res, 503, { error: "Bot ist nicht mit dem Server verbunden (GUILD_ID prüfen)." });

    const route = `${req.method} ${(req.url || "").split("?")[0]}`;
    // Wer im Dashboard eingeloggt ist (für den Verlauf)
    const by = decodeURIComponent(String(req.headers["x-dashboard-user"] || "")).slice(0, 64) || undefined;
    const isLoggedIn = req.headers["x-dashboard-auth"] === "1";
    const actorId = String(req.headers["x-dashboard-user-id"] || "");
    /** Eingeloggtes Dashboard-Mitglied (für Rangprüfungen). */
    const getActor = async () => (actorId ? await guild.members.fetch(actorId).catch(() => null) : null);
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

    try {
      switch (route) {
        case "GET /health":
          return send(res, 200, { ok: true, bot: client.user?.tag, guild: guild.name });

        // ---------------- Free-Games ----------------
        // ---------------- Komplett-Einrichtung ----------------
        case "GET /setup": {
          if (!isLoggedIn) return send(res, 401, { error: "Bitte einloggen." });
          const me = guild.members.me;
          return send(res, 200, {
            modules: SETUP_MODULES.map((id) => ({ id, ...MODULE_INFO[id] })),
            status: setupService.getStatus(guild),
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
          return send(res, 200, {
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
          const error = await gameNewsService.postLatest(guild, String(body.id));
          return error ? send(res, 400, { error }) : send(res, 200, { ok: true });
        }
        case "POST /news/steam-lookup": {
          const body = await readBody(req);
          const result = await gameNewsService.lookupSteam(String(body.input || ""));
          return typeof result === "string" ? send(res, 400, { error: result }) : send(res, 200, result);
        }

        // ---------------- Regeln ----------------
        case "GET /rules": {
          const cfg = rolePanelService.getConfig(guild.id) || {};
          return send(res, 200, {
            rules: rulesService.getRules(),
            customized: rulesService.isCustomized(),
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
          const error = rulesService.saveRules(body.rules);
          if (error) return send(res, 400, { error });
          return send(res, 200, { ok: true, rules: rulesService.getRules() });
        }
        case "POST /rules/reset": {
          rulesService.resetRules();
          return send(res, 200, { ok: true, rules: rulesService.getRules() });
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
          const backups = backupService.listBackups(guild.id);
          return send(res, 200, { backups });
        }
        case "POST /backups/create": {
          const body = await readBody(req);
          const backup = await backupService.createBackup(guild, body.creator || "Web-Dashboard");
          return send(res, 200, { ok: true, backup });
        }
        case "POST /backups/restore": {
          const body = await readBody(req);
          if (!body.backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          const result = await backupService.restoreBackup(guild, body.backupId, body.options);
          return send(res, 200, { ok: true, result });
        }
        case "POST /backups/delete":
        case "DELETE /backups/delete": {
          const body = await readBody(req);
          if (!body.backupId) return send(res, 400, { error: "Keine backupId angegeben." });
          const ok = backupService.deleteBackup(body.backupId);
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
            profile,
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

          const updated = statsService.setConfig(guild.id, patch);
          return send(res, 200, { ok: true, config: updated });
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
              adminNote: notes[m.id] || "",
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
              const result = await prisonService.imprison(
                guild,
                targetMember,
                reason,
                { id: modUser.id, tag: modName, avatar: modUser.displayAvatarURL() },
                client
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
          notes[userId] = String(note || "").trim();
          saveAdminNotes(notes);
          return send(res, 200, { ok: true, userId, note: notes[userId] });
        }

        default:
          return send(res, 404, { error: "Unbekannte Aktion." });
      }
    } catch (e: any) {
      console.error(`[BotAPI] Fehler bei ${route}:`, e);
      return send(res, 500, { error: e?.message || "Interner Fehler." });
    }
  });

  server.on("error", (e) => console.error("[BotAPI] Server-Fehler:", e));
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`🔌 [BotAPI] Dashboard-Schnittstelle bereit auf 127.0.0.1:${PORT}`);
  });
}
