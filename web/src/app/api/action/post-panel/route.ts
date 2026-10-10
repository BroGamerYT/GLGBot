import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { BRANDING } from "@/lib/branding";

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

    // Nur Kanäle des eigenen Servers erlauben
    const guildId = process.env.GUILD_ID;
    const chRes = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    const ch = chRes.ok ? await chRes.json() : null;
    if (!ch || !guildId || ch.guild_id !== guildId) {
      return NextResponse.json({ error: "Kanal gehört nicht zu diesem Server." }, { status: 400 });
    }

    // Embed & Components payload
    const payload = {
      embeds: [
        {
          title: "⚙️ Steuerung temporärer Kanäle",
          description:
            "Steuere deinen Sprachkanal bequem über die Menüs unten.\n" +
            "• **Dropdowns** für Einstellungen und Berechtigungen nutzen.\n" +
            "• Alternativ kannst du die Befehle mit `/voice` ausführen.",
          color: 0x5865f2,
          thumbnail: {
            url: "https://cdn.discordapp.com/emojis/849312521948823562.png",
          },
          footer: {
            text: `${BRANDING.bot} Voice-Manager`,
          },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "voice_settings_menu",
              placeholder: "Kanal-Einstellungen ändern...",
              options: [
                { label: "Name ändern", value: "name", emoji: { name: "✏️" } },
                { label: "Nutzerlimit ändern", value: "limit", emoji: { name: "👥" } },
                { label: "Aktuelles Spiel", value: "game", emoji: { name: "🎮" } },
                { label: "Temporärer Textkanal", value: "text", emoji: { name: "💬" } },
                { label: "Kanalbesitz übernehmen", value: "claim", emoji: { name: "👑" } },
              ],
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "voice_permissions_menu",
              placeholder: "Kanal-Berechtigungen ändern...",
              options: [
                { label: "Sperren (Lock)", value: "lock", emoji: { name: "🔒" } },
                { label: "Entsperren (Unlock)", value: "unlock", emoji: { name: "🔓" } },
                { label: "Verstecken (Hide)", value: "hide", emoji: { name: "🙈" } },
                { label: "Sichtbar machen (Unhide)", value: "unhide", emoji: { name: "👁️" } },
              ],
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              custom_id: "voice_btn_refresh",
              label: "Status & Info",
              emoji: { name: "🔄" },
            },
            ...(/^https?:\/\//i.test(BRANDING.dashboardUrl)
              ? [{ type: 2, style: 5, label: "Web-Dashboard", emoji: { name: "🌐" }, url: BRANDING.dashboardUrl }]
              : []),
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
