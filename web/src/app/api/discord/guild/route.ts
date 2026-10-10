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

export async function GET() {
  const { token, guildId } = getEnvConfig();

  if (!token || !guildId) {
    return NextResponse.json(
      { error: "DISCORD_TOKEN oder GUILD_ID nicht konfiguriert." },
      { status: 500 }
    );
  }

  try {
    const headers = {
      Authorization: `Bot ${token}`,
    };

    // 1. Guild Info
    const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
      headers,
      next: { revalidate: 30 },
    });
    const guild = await guildRes.json();

    // 2. Channels
    const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers,
      next: { revalidate: 10 },
    });
    const channels: any[] = await channelsRes.json();

    // 3. Roles
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers,
      next: { revalidate: 30 },
    });
    const roles: any[] = await rolesRes.json();

    const voiceChannels = Array.isArray(channels) ? channels.filter((c) => c.type === 2) : [];
    const textChannels = Array.isArray(channels) ? channels.filter((c) => c.type === 0) : [];
    const categories = Array.isArray(channels) ? channels.filter((c) => c.type === 4) : [];

    return NextResponse.json({
      guild,
      channels,
      voiceChannels,
      textChannels,
      categories,
      roles: Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Fehler beim Abrufen der Discord-Daten." },
      { status: 500 }
    );
  }
}
