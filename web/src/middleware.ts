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
    if (origin && origin !== expected) {
      return NextResponse.json({ error: "Ungültige Herkunft der Anfrage." }, { status: 403 });
    }
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
    pathname.startsWith("/go/");

  const isPublicApi =
    pathname.startsWith("/api/auth/") ||
    (pathname.startsWith("/api/bot/stats") && (req.method === "GET" || req.method === "HEAD"));

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    const now = Math.floor(Date.now() / 1000);
    if (session.chk && now - session.chk < ACCESS_RECHECK_SECONDS) return NextResponse.next();

    // Rechte erneut bei Discord prüfen: Admin entzogen / Server verlassen -> sofort ausloggen
    const access = await checkDashboardAccess(session.uid).catch(() => ({ allowed: false as const, reason: "config_error" as const }));
    if (!access.allowed && access.reason !== "config_error") {
      const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
      const res = isApi
        ? NextResponse.json({ error: "Deine Dashboard-Rechte wurden entzogen." }, { status: 401 })
        : NextResponse.redirect(new URL("/login?error=revoked", base));
      res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
      console.warn(`[Auth] ${session.name} (${session.uid}) automatisch ausgeloggt: ${access.reason}`);
      return res;
    }

    const res = NextResponse.next();
    // Bei Discord-Störungen (config_error) nicht aussperren - in einer Minute erneut prüfen
    const token = await createSessionToken({ uid: session.uid, name: session.name, avatar: session.avatar, exp: session.exp });
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
