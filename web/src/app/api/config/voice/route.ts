import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getActiveGuildId } from "@/lib/serverGuild";

const DATA_DIR = path.join(process.cwd(), "../data");
const CONFIG_FILE = path.join(DATA_DIR, "voice_config.json");

async function getGuildId() {
  return getActiveGuildId();
}

export async function GET() {
  try {
    const guildId = await getGuildId();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return NextResponse.json(data[guildId] || {});
    }
    return NextResponse.json({});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guildId = await getGuildId();
    const body = await req.json();

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let allConfig: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      allConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }

    allConfig[guildId] = {
      masterChannelId: body.masterChannelId,
      categoryId: body.categoryId || undefined,
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true, config: allConfig[guildId] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
