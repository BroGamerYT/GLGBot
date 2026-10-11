import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  createSessionToken,
  getBaseUrl,
  isSecureUrl,
} from "@/lib/auth";
import { checkDashboardAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Discord leitet nach dem Login hierher zurück
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req.nextUrl.origin);
  const fail = (error: string) => {
    const res = NextResponse.redirect(`${baseUrl}/login?error=${error}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(STATE_COOKIE)?.value;

  if (req.nextUrl.searchParams.get("error")) return fail("cancelled");
  if (!code || !state || !savedState || state !== savedState) return fail("state");

  try {
    // 1. Code gegen Access-Token tauschen
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri: `${baseUrl}/api/auth/callback`,
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) {
      console.error("[Auth] Token-Tausch fehlgeschlagen:", tokenRes.status, await tokenRes.text());
      return fail("token");
    }
    const { access_token } = await tokenRes.json();

    // 2. Wer ist der Nutzer?
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });
    if (!userRes.ok) return fail("token");
    const user = await userRes.json();

    // 3. Darf der Nutzer ins Dashboard bzw. den Shop?
    const access = await checkDashboardAccess(user.id);
    let isAdmin = false;
    let guilds = access.guilds;

    if (access.allowed) {
      isAdmin = true;
      console.log(`[Auth] Admin-Login: ${user.username} (${user.id}) via ${access.reason}`);
    } else {
      // Prüfen, ob der Nutzer Mitglied auf dem Discord-Server ist (damit Mitglieder im Shop einkaufen können)
      const mainGuildId = (process.env.GUILD_ID || "").trim();
      const botToken = process.env.DISCORD_TOKEN;
      let isMember = false;

      if (mainGuildId && botToken) {
        const memRes = await fetch(`https://discord.com/api/v10/guilds/${mainGuildId}/members/${user.id}`, {
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store",
        });
        if (memRes.ok) isMember = true;
      }

      if (!isMember) {
        console.warn(`[Auth] Zugriff verweigert für ${user.username} (${user.id}): ${access.reason}`);
        return fail(access.reason);
      }

      isAdmin = false;
      guilds = [];
      console.log(`[Auth] Community-Mitglied Login: ${user.username} (${user.id}) für Shop/Profil`);
    }

    // 4. Session-Cookie setzen
    const token = await createSessionToken({
      uid: user.id,
      name: user.global_name || user.username,
      avatar: user.avatar || null,
      g: guilds,
      isAdmin,
    });

    const targetUrl = isAdmin ? `${baseUrl}/` : `${baseUrl}/economy`;
    const res = NextResponse.redirect(targetUrl);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureUrl(baseUrl),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  } catch (e) {
    console.error("[Auth] Fehler im Callback:", e);
    return fail("token");
  }
}
