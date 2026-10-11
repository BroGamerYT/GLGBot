import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  createSessionToken,
  getBaseUrl,
  isSecureUrl,
} from "@/lib/auth";
import { ACTIVE_GUILD_COOKIE } from "@/lib/activeGuild";
import { fetchBotGuilds } from "@/lib/guilds";
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

    // 3. Auf welchen Servern des Bots existiert der Nutzer? (Gegen-Check)
    const botToken = process.env.DISCORD_TOKEN;
    const botGuilds = (await fetchBotGuilds()) || [];
    const mainGuildId = (process.env.GUILD_ID || "").trim();
    const envAllowed = (process.env.ALLOWED_GUILD_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Alle aktiven Guild-IDs sammeln
    const allGuildIds = Array.from(
      new Set([
        ...botGuilds.map((g) => g.id),
        ...(mainGuildId ? [mainGuildId] : []),
        ...envAllowed,
      ])
    ).filter(Boolean);

    const memberGuilds: string[] = [];
    if (botToken && allGuildIds.length > 0) {
      await Promise.all(
        allGuildIds.map(async (gid) => {
          try {
            const memRes = await fetch(`https://discord.com/api/v10/guilds/${gid}/members/${user.id}`, {
              headers: { Authorization: `Bot ${botToken}` },
              cache: "no-store",
            });
            if (memRes.ok) {
              memberGuilds.push(gid);
            }
          } catch {
            // Ignorieren falls Server nicht erreichbar
          }
        })
      );
    }

    // 4. Prüfen, ob der Nutzer Admin-Rechte hat
    const access = await checkDashboardAccess(user.id);
    let isAdmin = false;
    let userGuilds: string[] = [];

    if (access.allowed) {
      isAdmin = true;
      userGuilds = access.guilds;
      console.log(`[Auth] Admin-Login: ${user.username} (${user.id}) via ${access.reason} auf Server(n):`, userGuilds);
    } else {
      // Normaler Benutzer: Darf sich einloggen, wenn er Mitglied auf MINDESTENS einem Bot-Server ist
      if (memberGuilds.length === 0) {
        console.warn(`[Auth] Zugriff verweigert für ${user.username} (${user.id}): Auf keinem Bot-Server Mitglied.`);
        return fail("not_member");
      }

      isAdmin = false;
      userGuilds = memberGuilds;
      console.log(`[Auth] Community-Mitglied Login: ${user.username} (${user.id}) für Shop/Profil auf Server(n):`, userGuilds);
    }

    // 5. Session-Cookie setzen
    const token = await createSessionToken({
      uid: user.id,
      name: user.global_name || user.username,
      avatar: user.avatar || null,
      g: userGuilds,
      isAdmin,
    });

    const activeGuild = userGuilds[0] || mainGuildId;
    const targetUrl = isAdmin ? `${baseUrl}/` : `${baseUrl}/economy`;
    const res = NextResponse.redirect(targetUrl);

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureUrl(baseUrl),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    if (activeGuild) {
      res.cookies.set(ACTIVE_GUILD_COOKIE, activeGuild, {
        httpOnly: true,
        secure: isSecureUrl(baseUrl),
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }

    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  } catch (e) {
    console.error("[Auth] Fehler im Callback:", e);
    return fail("token");
  }
}
