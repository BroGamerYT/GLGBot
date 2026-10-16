import { NextRequest, NextResponse } from "next/server";
import { fetchBotGuilds } from "@/lib/guilds";
import { ACTIVE_GUILD_COOKIE } from "@/lib/activeGuild";
import { resolveGuildFromSlug } from "@/lib/serverSlugs";
import { getBaseUrl, isSecureUrl, verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { safeInternalPath } from "@/lib/safePath";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const baseUrl = getBaseUrl(req.nextUrl.origin);
  const botGuilds = (await fetchBotGuilds()) || [];

  const matched = resolveGuildFromSlug(slug, botGuilds);
  if (!matched) {
    // Unbekannter Server -> auf Startseite leiten
    return NextResponse.redirect(new URL("/?error=server_not_found", baseUrl));
  }

  // Zielpfad bestimmen (Query-Parameter ?to=... oder Standard)
  let destination = safeInternalPath(req.nextUrl.searchParams.get("to"));

  if (!destination) {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    destination = session?.isAdmin ? "/" : "/economy";
  }

  const res = NextResponse.redirect(new URL(destination, baseUrl));
  res.cookies.set(ACTIVE_GUILD_COOKIE, matched.guild.id, {
    httpOnly: true,
    secure: isSecureUrl(baseUrl),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
