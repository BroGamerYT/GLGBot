import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { ACTIVE_GUILD_COOKIE, pickActiveGuild } from "@/lib/activeGuild";

export const dynamic = "force-dynamic";

/**
 * Leitet Dashboard-Aktionen an die interne Bot-Schnittstelle weiter (127.0.0.1).
 * Der Zugriff auf /api/* ist bereits durch die Login-Middleware geschützt.
 */

const ALLOWED = new Set([
  "GET free-games",
  "POST free-games/settings",
  "POST free-games/post",
  "GET rules",
  "PUT rules",
  "POST rules/reset",
  "POST rules/post",
  "POST rules/lock",
  "POST rules/unlock",
  "GET health",
  "GET news",
  "POST news/feeds",
  "POST news/feeds/update",
  "POST news/feeds/delete",
  "POST news/feeds/test",
  "POST news/steam-lookup",
  "POST news/setup",
  "POST news/preview",
  "GET logs",
  "POST logs/config",
  "POST logs/setup",
  "GET backups",
  "GET backups/download",
  "POST backups/upload",
  "POST backups/create",
  "POST backups/restore",
  "POST backups/delete",
  "DELETE backups/delete",
  "GET embeds/channels",
  "POST embeds/send",
  "GET tickets",
  "GET tickets/transcript",
  "GET tickets/messages",
  "POST tickets/config",
  "POST tickets/post-panel",
  "POST tickets/close",
  "POST tickets/send-message",
  "POST tickets/ensure-support-channel",
  "GET stats",
  "GET stats/user",
  "POST stats/config",
  "POST stats/sync-roles",
  "GET live/active",
  "GET modules",
  "POST modules/toggle",
  "GET moderation/members",
  "POST moderation/action",
  "GET moderation/blacklist",
  "POST moderation/blacklist",
  "GET moderation/cases",
  "GET moderation/roles",
  "POST moderation/member-roles",
  "POST moderation/member-nickname",
  "POST moderation/adjust-xp",
  "POST moderation/notes",
  "GET setup",
  "POST setup/run",
  "GET guilds",
  "GET guild-access",
  "POST guild-access/add",
  "POST guild-access/remove",
  "POST guild-access/purge",
  "GET stats-channels",
  "POST stats-channels",
  "GET birthdays",
  "POST birthdays/config",
  "POST birthdays/test",
  "GET announcements",
  "POST announcements",
  "POST announcements/delete",
  "POST announcements/send-now",
  "GET custom-commands",
  "POST custom-commands",
  "POST custom-commands/delete",
  "GET welcome",
  "POST welcome",
  "POST welcome/preview",
  "POST welcome/test",
  "GET game-servers",
  "POST game-servers",
  "POST game-servers/delete",
  "GET clips",
  "POST clips/config",
  "POST clips/award",
  "GET console/channels",
  "GET console/messages",
  "POST console/send",
  "POST console/delete",
  "GET releases",
  "POST releases/config",
  "POST releases/add",
  "POST releases/update",
  "POST releases/delete",
  "POST releases/post-week",
  "GET economy",
  "POST economy/config",
  "POST economy/shop/add",
  "POST economy/shop/update",
  "POST economy/shop/delete",
  "POST economy/shop/buy",
  "POST economy/exchange-xp",
  "POST economy/setup-colors",
  "POST economy/admin/balance",
  "GET templates",
  "POST templates/apply",
  "POST channels/rename-style",
  "GET system/logs",
  "POST system/restart",
  "POST system/logs/clear",
]);

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!ALLOWED.has(`${req.method} ${path}`)) {
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 404 });
  }

  const token = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  if (!token || token.length < 32) {
    return NextResponse.json(
      { error: "Sicherheitsfehler: SESSION_SECRET oder INTERNAL_API_TOKEN ist nicht oder zu kurz konfiguriert (min. 32 Zeichen)." },
      { status: 500 }
    );
  }
  const port = process.env.BOT_API_PORT || "3101";
  const search = req.nextUrl.search || "";
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/${path}${search}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-bot-token": token,
        "x-dashboard-user": encodeURIComponent(session?.name || "Dashboard-User"),
        // Für Rechteprüfungen im Bot: wer ist eingeloggt? (leer = öffentlicher Besucher ohne Login)
        "x-dashboard-user-id": session?.uid || "",
        "x-dashboard-auth": session ? "1" : "0",
        // Multi-Guild: gewählter Server (nur einer, den der Nutzer verwalten darf; sonst Haupt-Server)
        "x-guild-id": pickActiveGuild(session, req.cookies.get(ACTIVE_GUILD_COOKIE)?.value),
      },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Ungültige Antwort vom Bot." }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Der Bot ist nicht erreichbar. Läuft er (pm2 status) und ist er auf dem neuesten Stand?" },
      { status: 503 }
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
