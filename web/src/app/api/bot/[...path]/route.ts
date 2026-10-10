import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

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
]);

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!ALLOWED.has(`${req.method} ${path}`)) {
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 404 });
  }

  const token = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
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
