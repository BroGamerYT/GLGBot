import { NextResponse } from "next/server";

export interface StreamerSearchResult {
  platform: "twitch" | "youtube";
  channelName: string;
  displayName: string;
  channelId?: string;
  avatar: string;
  url: string;
}

// 1. Twitch Suche (Exact Match + Vorschläge via GQL)
async function searchTwitch(queryStr: string): Promise<StreamerSearchResult[]> {
  const clean = queryStr
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/[^a-z0-9_]/gi, "");

  if (!clean) return [];
  const results: StreamerSearchResult[] = [];

  try {
    // A. Direkter Match für den eingegebenen Namen
    const q1 = `query { user(login: "${clean}") { id login displayName profileImageURL(width: 70) } }`;
    const res1 = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q1 }),
      next: { revalidate: 60 },
    });

    if (res1.ok) {
      const d1 = await res1.json();
      const user = d1?.data?.user;
      if (user) {
        results.push({
          platform: "twitch",
          channelName: user.login,
          displayName: user.displayName,
          avatar: user.profileImageURL || "",
          url: `https://twitch.tv/${user.login}`,
        });
      }
    }

    // B. Autocomplete Vorschläge für Twitch
    const q2 = `query { searchSuggestions(queryFragment: "${clean}") { edges { node { text } } } }`;
    const res2 = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q2 }),
      next: { revalidate: 60 },
    });

    if (res2.ok) {
      const d2 = await res2.json();
      const edges = d2?.data?.searchSuggestions?.edges || [];
      for (const e of edges.slice(0, 4)) {
        const sug = e.node?.text?.toLowerCase();
        if (sug && !results.some((r) => r.channelName === sug)) {
          results.push({
            platform: "twitch",
            channelName: sug,
            displayName: e.node.text,
            avatar: "",
            url: `https://twitch.tv/${sug}`,
          });
        }
      }
    }
  } catch (e) {
    console.error("[SearchStreamers] Twitch Suchfehler:", e);
  }

  return results;
}

// 2. YouTube Suche (Kanal-Suche & Handle-Erkennung)
async function searchYouTube(queryStr: string): Promise<StreamerSearchResult[]> {
  const clean = queryStr
    .trim()
    .replace(/^https?:\/\/(www\.)?youtube\.com\//i, "")
    .replace(/^@/, "");

  if (!clean) return [];
  const results: StreamerSearchResult[] = [];

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}&sp=EgIQAg%253D%253D`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const items =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents || [];

        for (const item of items) {
          const cr = item.channelRenderer;
          if (!cr) continue;

          const handle =
            cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace(/^\//, "") ||
            `@${cr.title?.simpleText?.toLowerCase().replace(/\s+/g, "")}` ||
            cr.channelId;

          const rawAvatar = cr.thumbnail?.thumbnails?.[0]?.url || "";
          const avatar = rawAvatar.startsWith("//") ? "https:" + rawAvatar : rawAvatar;

          results.push({
            platform: "youtube",
            channelName: handle,
            displayName: cr.title?.simpleText || handle,
            channelId: cr.channelId,
            avatar,
            url: `https://youtube.com/${handle.startsWith("@") ? handle : "@" + handle}`,
          });

          if (results.length >= 4) break;
        }
      }
    }
  } catch (e) {
    console.error("[SearchStreamers] YouTube Suchfehler:", e);
  }

  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const platform = searchParams.get("platform") || "all";

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const promises: Promise<StreamerSearchResult[]>[] = [];

    if (platform === "all" || platform === "twitch") {
      promises.push(searchTwitch(q));
    }
    if (platform === "all" || platform === "youtube") {
      promises.push(searchYouTube(q));
    }

    const settled = await Promise.all(promises);
    const combined = settled.flat();

    return NextResponse.json(combined);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
