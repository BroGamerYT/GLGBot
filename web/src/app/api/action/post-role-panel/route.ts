import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function getBotToken() {
  const rootEnvPath = path.join(process.cwd(), "../.env");
  if (fs.existsSync(rootEnvPath)) {
    const parsed = dotenv.parse(fs.readFileSync(rootEnvPath));
    return parsed.DISCORD_TOKEN || process.env.DISCORD_TOKEN || "";
  }
  return process.env.DISCORD_TOKEN || "";
}

export async function POST(req: Request) {
  try {
    const token = getBotToken();
    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "Keine channelId angegeben." }, { status: 400 });
    }

    const payload = {
      embeds: [
        {
          title: "🛡️ Berechtigungs- & Benachrichtigungs-Zentrum",
          description:
            "Wähle hier deine Rollen und Benachrichtigungen aus, um Kanäle freizuschalten:\n\n" +
            "📜 **1. Regeln akzeptieren (`Gast-Rolle`)**\n" +
            "Klicke auf den grünen Button, um die Serverregeln zu bestätigen und als **Gast** Zugriff auf den Server zu erhalten.\n\n" +
            "🔴 **2. Live-Stream Benachrichtigungen (`bn.live`)**\n" +
            "Erhalte Stream-Pings und Zugriff auf den Live-Stream Kanal, sobald jemand streamt.\n\n" +
            "🎁 **3. Free-Games Alerts (`bn.free`)**\n" +
            "Werde benachrichtigt, sobald Epic Games oder Steam 100% kostenlose Vollversionen anbieten und schalte den `#free-games` Kanal frei!",
          color: 0x5865f2,
          thumbnail: {
            url: "https://cdn.discordapp.com/emojis/849312521948823562.png",
          },
          footer: {
            text: "GLGBot Rollen-System | 1-Klick Toggle",
          },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // Success / Grün
              custom_id: "role_btn_rules",
              label: "Regeln akzeptieren (Gast)",
              emoji: { name: "✅" },
            },
            {
              type: 2,
              style: 1, // Primary / Blau
              custom_id: "role_btn_live",
              label: "Live-Stream Alerts (bn.live)",
              emoji: { name: "🔴" },
            },
            {
              type: 2,
              style: 2, // Secondary / Grau
              custom_id: "role_btn_free",
              label: "Free-Games Alerts (bn.free)",
              emoji: { name: "🎮" },
            },
            {
              type: 2,
              style: 2,
              custom_id: "role_btn_status",
              label: "Meine Rollen",
              emoji: { name: "👤" },
            },
          ],
        },
      ],
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Discord API Fehler: ${err}` }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
