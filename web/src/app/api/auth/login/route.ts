import { NextRequest, NextResponse } from "next/server";
import { STATE_COOKIE, getBaseUrl, isSecureUrl, randomState } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Startet den Discord-Login: leitet zu Discord weiter
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req.nextUrl.origin);
  const clientId = process.env.CLIENT_ID;

  if (!clientId || !process.env.DISCORD_CLIENT_SECRET || !process.env.SESSION_SECRET) {
    return NextResponse.redirect(`${baseUrl}/login?error=config`);
  }

  const state = randomState();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: `${baseUrl}/api/auth/callback`,
    scope: "identify",
    state,
    prompt: "none",
  });

  const res = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
  // State-Cookie schützt gegen CSRF beim Login (wird im Callback geprüft)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureUrl(baseUrl),
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
