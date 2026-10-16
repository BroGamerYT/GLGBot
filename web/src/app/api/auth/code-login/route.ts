import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getBaseUrl,
  isSecureUrl,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Versuchsbremse: pro IP höchstens MAX_FAILS Fehlversuche je Zeitfenster.
 * Verhindert, dass jemand Login-Codes durchprobiert.
 */
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { fails: number; until: number }>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || req.headers.get("x-real-ip") || "unbekannt").trim();
}

function checkLimit(ip: string): { blocked: boolean; retryInMinutes: number } {
  const now = Date.now();
  // Gelegenheit zum Aufräumen, damit die Liste nicht unbegrenzt wächst
  if (attempts.size > 5000) {
    attempts.forEach((v, key) => {
      if (v.until <= now) attempts.delete(key);
    });
  }
  const entry = attempts.get(ip);
  if (!entry || entry.until <= now) return { blocked: false, retryInMinutes: 0 };
  if (entry.fails < MAX_FAILS) return { blocked: false, retryInMinutes: 0 };
  return { blocked: true, retryInMinutes: Math.max(1, Math.ceil((entry.until - now) / 60000)) };
}

function noteFail(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.until <= now) {
    attempts.set(ip, { fails: 1, until: now + WINDOW_MS });
  } else {
    entry.fails++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limit = checkLimit(ip);
    if (limit.blocked) {
      console.warn(`[Auth] Zu viele falsche Login-Codes von ${ip} - vorübergehend gesperrt.`);
      return NextResponse.json(
        { error: `Zu viele Fehlversuche. Bitte versuche es in ${limit.retryInMinutes} Minuten erneut.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();

    if (!code) {
      return NextResponse.json(
        { error: "Bitte gib einen Login-Code ein." },
        { status: 400 }
      );
    }

    const port = process.env.BOT_API_PORT || "3101";
    const botToken = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
    if (!botToken || botToken.length < 32) {
      return NextResponse.json(
        { error: "Sicherheitsfehler: SESSION_SECRET oder INTERNAL_API_TOKEN ist nicht oder zu kurz konfiguriert (min. 32 Zeichen)." },
        { status: 500 }
      );
    }

    const verifyRes = await fetch(`http://127.0.0.1:${port}/auth/verify-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-token": botToken,
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });

    if (!verifyRes.ok) {
      noteFail(ip);
      const err = await verifyRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Der Login-Code ist ungültig oder abgelaufen." },
        { status: 400 }
      );
    }

    // Erfolgreich: Fehlversuche dieser IP zurücksetzen
    attempts.delete(ip);

    const { user } = await verifyRes.json();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Konnte Benutzerdaten nicht abrufen." },
        { status: 500 }
      );
    }

    const token = await createSessionToken({
      uid: user.id,
      name: user.global_name || user.username,
      avatar: user.avatar || null,
      g: user.guilds || [],
      isAdmin: !!user.isAdmin,
    });

    const baseUrl = getBaseUrl(req.nextUrl.origin);
    const redirectUrl = user.isAdmin ? `${baseUrl}/` : `${baseUrl}/economy`;

    const res = NextResponse.json({
      success: true,
      user,
      redirectUrl,
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureUrl(baseUrl),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (error) {
    console.error("[Auth] Fehler beim Code-Login:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler beim Anmelden." },
      { status: 500 }
    );
  }
}
