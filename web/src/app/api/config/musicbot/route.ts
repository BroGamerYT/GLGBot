import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const ENV_FILE = path.join(process.cwd(), "../.env");

function readEnv(): Record<string, string> {
  try {
    if (fs.existsSync(ENV_FILE)) return dotenv.parse(fs.readFileSync(ENV_FILE));
  } catch {}
  return {};
}

export async function GET() {
  try {
    const env = readEnv();
    const token = env.MUSICBOT_TOKEN || "";
    return NextResponse.json({
      tokenSet: token.length >= 20,
      tokenHint: token.length >= 8 ? `••••${token.slice(-4)}` : null,
      clientId: env.MUSICBOT_CLIENT_ID || "",
      guildId: env.MUSIC_GUILD_ID || env.MUSICBOT_GUILD_ID || env.GUILD_ID || "",
      autostart: (env.MUSICBOT_AUTOSTART || "true") !== "false",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lines: string[] = fs.existsSync(ENV_FILE)
      ? fs.readFileSync(ENV_FILE, "utf-8").split("\n")
      : [];
    const next: Record<string, string> = {};
    if (body.token !== undefined) {
      const token = String(body.token || "").trim();
      if (token && token.length < 50) {
        return NextResponse.json({ error: "Token sieht unvollständig aus (zu kurz). Bitte komplett kopieren." }, { status: 400 });
      }
      next.MUSICBOT_TOKEN = token;
    }
    if (body.clientId !== undefined) next.MUSICBOT_CLIENT_ID = String(body.clientId || "").trim();
    if (body.guildId !== undefined) {
      const gId = String(body.guildId || "").trim();
      next.MUSIC_GUILD_ID = gId;
      next.MUSICBOT_GUILD_ID = gId;
    }
    if (body.autostart !== undefined) next.MUSICBOT_AUTOSTART = body.autostart ? "true" : "false";

    const seen = new Set<string>();
    const out = lines.map((line) => {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m && m[1] in next) {
        seen.add(m[1]);
        return `${m[1]}=${next[m[1]]}`;
      }
      return line;
    });
    for (const [k, v] of Object.entries(next)) {
      if (!seen.has(k)) out.push(`${k}=${v}`);
    }
    fs.writeFileSync(ENV_FILE, out.join("\n"), "utf-8");
    return NextResponse.json({ success: true, restartRequired: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
