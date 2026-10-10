import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getBaseUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST statt GET, damit fremde Seiten dich nicht per Link ausloggen können
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(`${getBaseUrl(req.nextUrl.origin)}/login`, 303);
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
