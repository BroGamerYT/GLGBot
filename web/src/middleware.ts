import { NextRequest, NextResponse } from "next/server";
import { ACCESS_RECHECK_SECONDS, SESSION_COOKIE, createSessionToken, isSecureUrl, verifySessionToken } from "@/lib/auth";
import { checkDashboardAccess } from "@/lib/permissions";

/**
 * Schützt das gesamte Dashboard: Seiten UND API-Routen.
 * Frei erreichbar sind nur /login, /api/auth/* (Login-Ablauf) und /go/* (App-Links aus Discord).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Schreibende API-Anfragen nur von der eigenen Seite (zusätzlicher CSRF-Schutz)
  if (isApi && req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const expected = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
    if (origin) {
      if (origin !== expected) {
        return NextResponse.json({ error: "Ungültige Herkunft der Anfrage." }, { status: 403 });
      }
    } else {
      // Kein Origin-Header: Browser senden ihn bei schreibenden Anfragen immer mit.
      // Ersatzweise den Referer prüfen, damit die Lücke nicht offen bleibt.
      const referer = req.headers.get("referer") || "";
      if (referer && !referer.startsWith(expected)) {
        return NextResponse.json({ error: "Ungültige Herkunft der Anfrage." }, { status: 403 });
      }
    }
  }

  // Direkte Server-Kurz-URLs (z. B. /bot1, /bot2, /server1, /server2)
  const botMatch = pathname.match(/^\/(bot|server)([1-5])(\/.*)?$/i);
  if (botMatch) {
    const num = botMatch[2];
    const sub = botMatch[3] || "";
    const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
    let targetUrl = `/s/bot${num}`;
    if (sub && sub !== "/") {
      targetUrl += `?to=${encodeURIComponent(sub)}`;
    } else if (req.nextUrl.search) {
      targetUrl += req.nextUrl.search;
    }
    return NextResponse.redirect(new URL(targetUrl, base));
  }

  // Öffentliche Seiten & Read-Only APIs (ohne Discord-Login für Community-Mitglieder)
  const isPublicPage =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/hilfe" ||
    pathname.startsWith("/hilfe/") ||
    pathname === "/changelog" ||
    pathname.startsWith("/changelog/") ||
    pathname === "/stats" ||
    pathname.startsWith("/stats/") ||
    pathname === "/free-games" ||
    pathname.startsWith("/free-games/") ||
    pathname === "/news" ||
    pathname.startsWith("/news/") ||
    pathname === "/releases" ||
    pathname.startsWith("/releases/") ||
    pathname === "/economy" ||
    pathname.startsWith("/economy/") ||
    pathname === "/radio" ||
    pathname.startsWith("/radio/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/server/") ||
    pathname.startsWith("/go/");

  const isPublicApi =
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/guild") ||
    pathname.startsWith("/api/discord/guild") ||
    pathname.startsWith("/api/radio/download") ||
    ((pathname === "/api/config/radio" ||
      pathname === "/api/config/musicbot" ||
      pathname.startsWith("/api/bot/stats") ||
      pathname.startsWith("/api/bot/free-games") ||
      pathname.startsWith("/api/bot/news") ||
      pathname.startsWith("/api/bot/live/active") ||
      pathname.startsWith("/api/bot/releases") ||
      pathname.startsWith("/api/bot/economy") ||
      pathname.startsWith("/api/bot/rules") ||
      pathname.startsWith("/api/bot/radio") ||
      pathname.startsWith("/api/bot/sounds") ||
      pathname.startsWith("/api/bot/music/queue") ||
      pathname.startsWith("/api/bot/musicbot/status")) &&
      (req.method === "GET" || req.method === "HEAD"));

  if (isPublicApi) {
    return NextResponse.next();
  }

  const isMemberApi =
    pathname === "/api/bot/economy/shop/buy" ||
    pathname === "/api/bot/economy/exchange-xp";

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPublicPage && !session) {
    return NextResponse.next();
  }

  if (isMemberApi) {
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    return NextResponse.next();
  }

  if (session) {
    // Wenn der Nutzer ein reguläres Community-Mitglied ist (kein Admin):
    if (session.isAdmin === false) {
      if (isPublicPage) {
        return NextResponse.next();
      }
      const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
      return isApi
        ? NextResponse.json({ error: "Dieser Bereich ist Administratoren vorbehalten." }, { status: 403 })
        : NextResponse.redirect(new URL("/economy", base));
    }

    const now = Math.floor(Date.now() / 1000);
    if (session.chk && now - session.chk < ACCESS_RECHECK_SECONDS) {
      return NextResponse.next();
    }

    // Rechte erneut bei Discord prüfen: Admin entzogen / Server verlassen -> sofort reagieren
    const access = await checkDashboardAccess(session.uid).catch(() => ({ allowed: false as const, reason: "config_error" as const, guilds: [] as string[] }));
    if (!access.allowed && access.reason !== "config_error") {
      console.warn(`[Auth] ${session.name} (${session.uid}) Admin-Rechte entzogen: ${access.reason}`);
      const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;

      if (access.reason === "no_permission") {
        // Ist weiterhin Discord-Mitglied, hat aber keine Admin-Rechte mehr:
        // Zu regulärem Mitglied herabstufen, damit er Shop/Rangliste/News weiter nutzen kann:
        const token = await createSessionToken({
          uid: session.uid,
          name: session.name,
          avatar: session.avatar,
          exp: session.exp,
          g: session.g,
          isAdmin: false,
        });
        const res = isPublicPage
          ? NextResponse.next()
          : (isApi
              ? NextResponse.json({ error: "Deine Admin-Rechte wurden entzogen." }, { status: 403 })
              : NextResponse.redirect(new URL("/economy?notice=admin_revoked", base)));
        res.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: isSecureUrl(base),
          sameSite: "lax",
          path: "/",
          maxAge: Math.max(0, session.exp - now),
        });
        return res;
      } else {
        // Gar kein Server-Mitglied mehr -> komplett ausloggen
        const res = isApi
          ? NextResponse.json({ error: "Deine Dashboard-Rechte wurden entzogen." }, { status: 401 })
          : NextResponse.redirect(new URL("/login?error=revoked", base));
        res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
        return res;
      }
    }

    if (isPublicPage) {
      return NextResponse.next();
    }

    const res = NextResponse.next();
    // Bei Discord-Störungen (config_error) nicht aussperren - in einer Minute erneut prüfen
    // Server-Liste aktualisieren (Multi-Guild); bei Discord-Störung die alte Liste behalten
    const guilds = access.allowed ? access.guilds : session.g;
    const token = await createSessionToken({ uid: session.uid, name: session.name, avatar: session.avatar, exp: session.exp, g: guilds, isAdmin: true });
    const base = process.env.DASHBOARD_URL || req.nextUrl.origin;
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureUrl(base),
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, session.exp - now),
    });
    return res;
  }

  if (isApi) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // DASHBOARD_URL nutzen, damit hinter Caddy auf https://… statt http://localhost umgeleitet wird
  const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", base));
}

export const config = {
  // Statische Next.js-Dateien und Icons ausnehmen
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
