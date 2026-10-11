import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getActiveGuildId } from "@/lib/serverGuild";

const DATA_DIR = path.join(process.cwd(), "..", "data");
const NOTIFS_FILE = path.join(DATA_DIR, "stream_notifications.json");

async function getGuildId() {
  return getActiveGuildId();
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
  const guildId = await getGuildId();
  const all = loadNotifs();

  // Live-Status kommt aus stream_live_state.json (wird nur vom Bot geschrieben)
  let state: Record<string, { isLive?: boolean; lastNotified?: string }> = {};
  try {
    const stateFile = path.join(DATA_DIR, "stream_live_state.json");
    if (fs.existsSync(stateFile)) state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    // ignorieren
  }

  const guildNotifs = all
    .filter((n) => n.guildId === guildId)
    .map((n) => (state[n.id] ? { ...n, isLive: state[n.id].isLive, lastNotified: state[n.id].lastNotified } : n));
  return NextResponse.json(guildNotifs);
}

export async function POST(req: Request) {
  try {
    const guildId = await getGuildId();
    const body = await req.json();
    const { id, platform = "twitch", channelName, displayName: passedDisplayName, profileImageUrl: passedAvatar, channelId: passedChannelId, discordChannelId, pingRoleId, linkedDiscordUserId, customMessage, silent } = body;

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
            displayName = passedDisplayName || user.displayName || cleanName;
            profileImageUrl = profileImageUrl || user.profileImageURL || "";
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
        const ytUrl = youtubeChannelId ? `https://www.youtube.com/channel/${youtubeChannelId}` : `https://www.youtube.com/${handle}`;
        const ytRes = await fetch(ytUrl, {
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
    let existingIndex = -1;
    if (id) {
      existingIndex = all.findIndex((n) => n.id === id);
    }
    if (existingIndex < 0) {
      existingIndex = all.findIndex((n) => n.guildId === guildId && n.platform === platform && n.channelName.toLowerCase() === cleanName.toLowerCase());
    }

    const item = {
      id: id || (existingIndex >= 0 ? all[existingIndex].id : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      guildId,
      platform,
      channelName: cleanName,
      displayName: passedDisplayName || displayName,
      profileImageUrl: profileImageUrl || (existingIndex >= 0 ? all[existingIndex].profileImageUrl : ""),
      youtubeChannelId,
      discordChannelId,
      pingRoleId: pingRoleId || undefined,
      linkedDiscordUserId: linkedDiscordUserId || undefined,
      customMessage: customMessage !== undefined ? (customMessage.trim().length > 0 ? customMessage.trim() : undefined) : (existingIndex >= 0 ? all[existingIndex].customMessage : undefined),
      silent: typeof silent === "boolean" ? silent : (existingIndex >= 0 ? Boolean(all[existingIndex].silent) : false),
      lastNotified: existingIndex >= 0 ? all[existingIndex].lastNotified : undefined,
      isLive: existingIndex >= 0 ? all[existingIndex].isLive : isLive,
      currentStreamId: currentStreamId !== undefined ? currentStreamId : (existingIndex >= 0 ? all[existingIndex].currentStreamId : undefined),
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
    const guildId = await getGuildId();
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
