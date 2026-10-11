import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getBaseUrl, isSecureUrl, verifySessionToken } from "@/lib/auth";
import { ACTIVE_GUILD_COOKIE, pickActiveGuild } from "@/lib/activeGuild";
import { fetchBotGuilds } from "@/lib/guilds";

export const dynamic = "force-dynamic";

/** Server, die der eingeloggte Nutzer verwalten darf, plus aktiver Server. */
export async function GET(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const active = pickActiveGuild(session, req.cookies.get(ACTIVE_GUILD_COOKIE)?.value);
  const allowed = session.g?.length ? session.g : [active];
  const botGuilds = (await fetchBotGuilds()) || [];
  const guilds = allowed.map((id) => {
    const g = botGuilds.find((b) => b.id === id);
    return { id, name: g?.name || id, icon: g?.icon || null, main: !!g?.main };
  });
  return NextResponse.json({ active, guilds });
}

/** Aktiven Server wechseln (nur auf einen Server, den der Nutzer verwalten darf). */
export async function POST(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const guildId = String(body?.guildId || "");
  const allowed = session.g?.length ? session.g : [pickActiveGuild(session, null)];
  if (!allowed.includes(guildId)) {
    return NextResponse.json({ error: "Diesen Server darfst du nicht verwalten." }, { status: 403 });
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
