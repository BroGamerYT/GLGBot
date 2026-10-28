import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: "Nicht eingeloggt." }, { status: 401 });
  }

  const userData = {
    id: session.uid,
    name: session.name,
    avatar: session.avatar,
    isAdmin: Boolean(session.isAdmin),
    guilds: session.g || [],
  };

  return NextResponse.json({
    authenticated: true,
    ...userData,
    user: userData,
  });
}
