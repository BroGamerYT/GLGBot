import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "../data");
const MUSIC_DIR = path.join(DATA_DIR, "music");

const ALLOWED_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a"]);
const MAX_BYTES = 25 * 1024 * 1024;

function cleanPart(part: string): string | null {
  if (!part || part === "." || part === ".." || part.startsWith(".")) return null;
  const clean = part.replace(/[^a-zA-Z0-9._\- äöüÄÖÜß]/g, "_").slice(0, 60);
  return clean || null;
}

function sanitize(name: string, relPath?: string): { rel: string; folder: string } | null {
  let folder = "";
  if (relPath) {
    const parts = relPath.replace(/\\/g, "/").split("/").filter(Boolean);
    // Erster Teil = Ordner, Rest Pfad – max. eine Ordnerebene
    if (parts.length === 2) {
      const f = cleanPart(parts[0]);
      if (!f) return null;
      folder = f;
    } else if (parts.length !== 1) {
      return null;
    }
  }
  const base = path.basename(name.trim());
  if (!base || base.startsWith(".") || base.includes("..")) return null;
  const clean = base.replace(/[^a-zA-Z0-9._\- äöüÄÖÜß]/g, "_").slice(0, 100);
  if (!ALLOWED_EXT.has(path.extname(clean).toLowerCase())) return null;
  return { rel: folder ? `${folder}/${clean}` : clean, folder };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const relPath = typeof form.get("path") === "string" ? (form.get("path") as string) : undefined;
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Keine Datei empfangen." }, { status: 400 });
    }
    const clean = sanitize((file as File).name, relPath);
    if (!clean) {
      return NextResponse.json({ error: "Nur MP3/WAV/OGG/M4A erlaubt (max. eine Ordnerebene)." }, { status: 400 });
    }
    const buf = Buffer.from(await (file as File).arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Datei leer oder größer als 25 MB." }, { status: 400 });
    }
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
    if (clean.folder && !fs.existsSync(path.join(MUSIC_DIR, clean.folder))) {
      fs.mkdirSync(path.join(MUSIC_DIR, clean.folder), { recursive: true });
    }
    const target = path.join(MUSIC_DIR, clean.rel);
    if (!target.startsWith(MUSIC_DIR + path.sep)) {
      return NextResponse.json({ error: "Ungültiger Pfad." }, { status: 400 });
    }
    if (fs.existsSync(target)) {
      return NextResponse.json({ error: "Datei existiert bereits (Duplikat)." }, { status: 409 });
    }
    fs.writeFileSync(target, buf);
    return NextResponse.json({ ok: true, file: clean.rel, folder: clean.folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload fehlgeschlagen." }, { status: 500 });
  }
}
