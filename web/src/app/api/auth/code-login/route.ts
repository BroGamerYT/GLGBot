import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getBaseUrl,
  isSecureUrl,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
      const err = await verifyRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Der Login-Code ist ungültig oder abgelaufen." },
        { status: 400 }
      );
    }

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
