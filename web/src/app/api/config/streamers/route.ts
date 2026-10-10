import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");
const NOTIFS_FILE = path.join(DATA_DIR, "stream_notifications.json");

function getGuildId() {
  return process.env.GUILD_ID || "548842540074401802";
}

function loadNotifs(): any[] {
  try {
    if (fs.existsSync(NOTIFS_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFS_FILE, "utf-8"));
    }
  } catch (e) {
    // fallback
  }
  return [];
}

function saveNotifs(list: any[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(NOTIFS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function GET() {
  const guildId = getGuildId();
  const all = loadNotifs();
  const guildNotifs = all.filter((n) => n.guildId === guildId);
  return NextResponse.json(guildNotifs);
}

export async function POST(req: Request) {
  try {
    const guildId = getGuildId();
    const body = await req.json();
    const { platform = "twitch", channelName, displayName: passedDisplayName, profileImageUrl: passedAvatar, channelId: passedChannelId, discordChannelId, pingRoleId, linkedDiscordUserId, customMessage } = body;

    if (!channelName || !discordChannelId) {
      return NextResponse.json({ error: "Fehlende Pflichtangaben (Kanalname & Discord-Kanal)." }, { status: 400 });
    }

    const isYoutube = platform === "youtube";
    let cleanName = channelName.trim();
    if (!isYoutube) {
      cleanName = cleanName.toLowerCase().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/[^a-z0-9_]/gi, "");
    }

    let displayName = passedDisplayName || cleanName;
    let profileImageUrl = passedAvatar || "";
    let isLive = false;
    let currentStreamId = undefined;
    let youtubeChannelId = passedChannelId;

    if (!isYoutube) {
      // Twitch
      try {
        const query = `query { user(login: "${cleanName}") { id displayName profileImageURL(width: 300) stream { id title game { name } viewersCount previewImageURL(width: 640, height: 360) } } }`;
        const res = await fetch("https://gql.twitch.tv/gql", {
          method: "POST",
          headers: {
            "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          const json = await res.json();
          const user = json?.data?.user;
          if (user) {
            displayName = user.displayName || cleanName;
            profileImageUrl = user.profileImageURL || "";
            if (user.stream) {
              isLive = true;
              currentStreamId = user.stream.id;
            }
          }
        }
      } catch (e) {
        // Ignoriere Netzwerkfehler
      }
    } else {
      // YouTube
      try {
        const handle = cleanName.startsWith("@") ? cleanName : `@${cleanName}`;
        const ytRes = await fetch(`https://www.youtube.com/${handle}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (ytRes.ok) {
          const html = await ytRes.text();
          const chMatch = html.match(/channel_id=([a-zA-Z0-9_-]+)/) || html.match(/"channelId":"([a-zA-Z0-9_-]+)"/);
          const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
          const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
          if (chMatch) youtubeChannelId = chMatch[1];
          if (titleMatch && !passedDisplayName) displayName = titleMatch[1];
          if (imageMatch && !profileImageUrl) profileImageUrl = imageMatch[1];
        }
      } catch (e) {
        // Ignoriere
      }
    }

    const all = loadNotifs();
    const existingIndex = all.findIndex((n) => n.guildId === guildId && n.platform === platform && n.channelName.toLowerCase() === cleanName.toLowerCase());

    const item = {
      id: existingIndex >= 0 ? all[existingIndex].id : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      guildId,
      platform,
      channelName: cleanName,
      displayName,
      profileImageUrl,
      youtubeChannelId,
      discordChannelId,
      pingRoleId: pingRoleId || undefined,
      linkedDiscordUserId: linkedDiscordUserId || undefined,
      customMessage: customMessage || undefined,
      lastNotified: existingIndex >= 0 ? all[existingIndex].lastNotified : undefined,
      isLive,
      currentStreamId,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = item;
    } else {
      all.push(item);
    }

    saveNotifs(all);
    return NextResponse.json({ success: true, notification: item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guildId = getGuildId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Fehlende ID." }, { status: 400 });
    }

    let all = loadNotifs();
    all = all.filter((n) => !(n.guildId === guildId && n.id === id));
    saveNotifs(all);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
