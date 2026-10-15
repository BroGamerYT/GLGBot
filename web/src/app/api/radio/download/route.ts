import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "../data");
const MUSIC_DIR = path.join(DATA_DIR, "music");

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rel = (searchParams.get("file") || "").replace(/\\/g, "/");
    const parts = rel.split("/").filter(Boolean);
    if (parts.length < 1 || parts.length > 2) {
      return NextResponse.json({ error: "Ungültiger Pfad." }, { status: 400 });
    }
    for (const p of parts) {
      if (p === "." || p === ".." || p.startsWith(".") || p.includes("..")) {
        return NextResponse.json({ error: "Ungültiger Pfad." }, { status: 400 });
      }
    }
    const target = path.join(MUSIC_DIR, ...parts);
    if (!target.startsWith(MUSIC_DIR + path.sep)) {
      return NextResponse.json({ error: "Ungültiger Pfad." }, { status: 400 });
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    }
    const buf = fs.readFileSync(target);
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(target)}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Download fehlgeschlagen." }, { status: 500 });
  }
}
