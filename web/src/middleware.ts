import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

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

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // DASHBOARD_URL nutzen, damit hinter Caddy auf https://… statt http://localhost umgeleitet wird
  const base = process.env.DASHBOARD_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", base));
}

export const config = {
  // Alles außer Login, Auth-API und statische Next.js-Dateien
  // /go/… = öffentliche Weiterleitung aus Discord in Steam/Epic (siehe app/go)
  matcher: ["/((?!login|api/auth|go/|_next/static|_next/image|favicon.ico).*)"],
};
