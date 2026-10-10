import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function getEnvConfig() {
  const rootEnvPath = path.join(process.cwd(), "../.env");
  if (fs.existsSync(rootEnvPath)) {
    const parsed = dotenv.parse(fs.readFileSync(rootEnvPath));
    return {
      token: parsed.DISCORD_TOKEN || process.env.DISCORD_TOKEN || "",
      guildId: parsed.GUILD_ID || process.env.GUILD_ID || "",
    };
  }
  return {
    token: process.env.DISCORD_TOKEN || "",
    guildId: process.env.GUILD_ID || "",
  };
}

const DATA_DIR = path.join(process.cwd(), "..", "data");
const ROLE_CONFIG_FILE = path.join(DATA_DIR, "role_panel_config.json");
const LIVE_CONFIG_FILE = path.join(DATA_DIR, "live_stream_config.json");

export async function POST() {
  const { token, guildId } = getEnvConfig();

  if (!token || !guildId) {
    return NextResponse.json({ error: "Fehlende Discord Credentials." }, { status: 500 });
  }

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Rollen & Kanäle abrufen
    const [rolesRes, channelsRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers }),
    ]);

    const roles: any[] = await rolesRes.json();
    const channels: any[] = await channelsRes.json();

    // 2. Gast-Rolle prüfen / erstellen
    let guestRole = roles.find((r) =>
      r.name.toLowerCase() === "gast" ||
      r.name.toLowerCase() === "gäste" ||
      r.name.toLowerCase().includes("gast")
    );
    let guestCreated = false;
    if (!guestRole) {
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Gast",
          color: 0x2ecc71,
          reason: "GLGBot Auto-Setup: Regel-Bestätigung",
        }),
      });
      if (createRes.ok) {
        guestRole = await createRes.json();
        guestCreated = true;
      }
    }

    // 3. Live-Stream Alert Rolle (bn.live) prüfen / erstellen
    let streamAlertRole = roles.find((r) =>
      r.name.toLowerCase() === "bn.live" ||
      r.name.toLowerCase().includes("live-stream alert") ||
      r.name.toLowerCase().includes("stream alert")
    );
    let streamAlertCreated = false;
    if (!streamAlertRole) {
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "🔴 Live-Stream Alerts (bn.live)",
          color: 0xe91e63,
          mentionable: true,
          reason: "GLGBot Auto-Setup: Live-Stream Alerts",
        }),
      });
      if (createRes.ok) {
        streamAlertRole = await createRes.json();
        streamAlertCreated = true;
      }
    }

    // 4. Free-Games Alert Rolle (bn.free) prüfen / erstellen
    let freeGamesRole = roles.find((r) =>
      r.name.toLowerCase() === "bn.free" ||
      r.name.toLowerCase().includes("free-game") ||
      r.name.toLowerCase().includes("free game")
    );
    let freeGamesCreated = false;
    if (!freeGamesRole) {
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "🎮 Free-Games Alerts (bn.free)",
          color: 0x0078f2,
          mentionable: true,
          reason: "GLGBot Auto-Setup: Free-Games Alerts",
        }),
      });
      if (createRes.ok) {
        freeGamesRole = await createRes.json();
        freeGamesCreated = true;
      }
    }

    // 5. Live-Streamer Rolle (@Live) prüfen / erstellen
    let liveRole = roles.find((r) =>
      r.name.toLowerCase() === "live" ||
      r.name.toLowerCase() === "🔴 live"
    );
    let liveCreated = false;
    if (!liveRole) {
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "🔴 Live",
          color: 0x9146ff,
          reason: "GLGBot Auto-Setup: Live-Streamer Rolle",
        }),
      });
      if (createRes.ok) {
        liveRole = await createRes.json();
        liveCreated = true;
      }
    }

    // 6. Free-Games Kanal (#free-games) prüfen / erstellen
    let freeGamesChannel = channels.find((c) =>
      c.type === 0 && (c.name.toLowerCase().includes("free-game") || c.name.toLowerCase().includes("gratis-spiel"))
    );
    let channelCreated = false;
    if (!freeGamesChannel) {
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "🎮・free-games",
          type: 0,
          topic: "Wöchentliche 100% kostenlose PC-Spiele & Giveaways | Benachrichtigungen mit @bn.free",
          reason: "GLGBot Auto-Setup: Free-Games Kanal",
        }),
      });
      if (createRes.ok) {
        freeGamesChannel = await createRes.json();
        channelCreated = true;
      }
    }

    // 7. Konfigurationen lokal speichern
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // A. Role-Panel Config
    let roleConfig: any = {};
    if (fs.existsSync(ROLE_CONFIG_FILE)) {
      try { roleConfig = JSON.parse(fs.readFileSync(ROLE_CONFIG_FILE, "utf-8")); } catch (e) {}
    }
    roleConfig[guildId] = {
      rulesRoleId: guestRole?.id,
      streamAlertRoleId: streamAlertRole?.id,
      freeGamesRoleId: freeGamesRole?.id,
      freeGamesChannelId: freeGamesChannel?.id,
    };
    fs.writeFileSync(ROLE_CONFIG_FILE, JSON.stringify(roleConfig, null, 2), "utf-8");

    // B. Live-Stream Config
    let liveConfig: any = {};
    if (fs.existsSync(LIVE_CONFIG_FILE)) {
      try { liveConfig = JSON.parse(fs.readFileSync(LIVE_CONFIG_FILE, "utf-8")); } catch (e) {}
    }
    const streamChannel = channels.find((c) => c.type === 0 && c.name.toLowerCase().includes("stream"));
    liveConfig[guildId] = {
      liveRoleId: liveRole?.id,
      announcementChannelId: liveConfig[guildId]?.announcementChannelId || (streamChannel ? streamChannel.id : undefined),
      categoryId: liveConfig[guildId]?.categoryId,
      channelType: liveConfig[guildId]?.channelType || "voice",
      autoRole: true,
    };
    fs.writeFileSync(LIVE_CONFIG_FILE, JSON.stringify(liveConfig, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      data: {
        guestRole: { id: guestRole?.id, name: guestRole?.name, created: guestCreated },
        streamAlertRole: { id: streamAlertRole?.id, name: streamAlertRole?.name, created: streamAlertCreated },
        freeGamesRole: { id: freeGamesRole?.id, name: freeGamesRole?.name, created: freeGamesCreated },
        liveRole: { id: liveRole?.id, name: liveRole?.name, created: liveCreated },
        freeGamesChannel: { id: freeGamesChannel?.id, name: freeGamesChannel?.name, created: channelCreated },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
