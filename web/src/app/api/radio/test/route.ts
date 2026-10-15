import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("url") || "").trim();
    if (!/^https?:\/\//i.test(raw)) {
      return NextResponse.json({ ok: false, error: "Nur http(s)-URLs erlaubt." }, { status: 400 });
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    try {
      const res = await fetch(raw, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "GLGBot-Radio/1.0" },
      });
      if (res.status >= 500) {
        return NextResponse.json({ ok: false, error: `Stream antwortet nicht (HTTP ${res.status}).` });
      }
      const icyName = res.headers.get("icy-name");
      return NextResponse.json({ ok: true, status: res.status, icyName });
    } finally {
      clearTimeout(timer);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return NextResponse.json({ ok: false, error: "Timeout – Stream nicht erreichbar." });
    }
    return NextResponse.json({ ok: false, error: "Stream nicht erreichbar." });
  }
}
