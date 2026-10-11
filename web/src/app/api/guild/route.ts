import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getBaseUrl, isSecureUrl, verifySessionToken } from "@/lib/auth";
import { ACTIVE_GUILD_COOKIE, pickActiveGuild } from "@/lib/activeGuild";
import { fetchBotGuilds } from "@/lib/guilds";

export const dynamic = "force-dynamic";

/** Server, die der Nutzer auswählen darf, plus aktiver Server. */
export async function GET(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const botGuilds = (await fetchBotGuilds()) || [];

  if (!session) {
    const cookieGuild = req.cookies.get(ACTIVE_GUILD_COOKIE)?.value;
    const active = (cookieGuild && botGuilds.some((b) => b.id === cookieGuild))
      ? cookieGuild
      : (botGuilds[0]?.id || process.env.GUILD_ID || "");
    const guilds = botGuilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon || null,
      main: !!g.main,
    }));
    return NextResponse.json({ active, guilds });
  }

  const active = pickActiveGuild(session, req.cookies.get(ACTIVE_GUILD_COOKIE)?.value);
  const allowed = session.g?.length ? session.g : [active];
  const guilds = allowed.map((id) => {
    const g = botGuilds.find((b) => b.id === id);
    return { id, name: g?.name || id, icon: g?.icon || null, main: !!g?.main };
  });
  return NextResponse.json({ active, guilds });
}

/** Aktiven Server wechseln. */
export async function POST(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const body = await req.json().catch(() => ({}));
  const guildId = String(body?.guildId || "");
  const botGuilds = (await fetchBotGuilds()) || [];

  if (!session) {
    if (!botGuilds.some((b) => b.id === guildId)) {
      return NextResponse.json({ error: "Server nicht gefunden." }, { status: 404 });
    }
  } else {
    const allowed = session.g?.length ? session.g : [pickActiveGuild(session, null)];
    if (!allowed.includes(guildId)) {
      return NextResponse.json({ error: "Auf diesen Server hast du keinen Zugriff." }, { status: 403 });
    }
  }

  const res = NextResponse.json({ ok: true, active: guildId });
  res.cookies.set(ACTIVE_GUILD_COOKIE, guildId, {
    httpOnly: true,
    secure: isSecureUrl(getBaseUrl(req.nextUrl.origin)),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
