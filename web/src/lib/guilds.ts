/**
 * Multi-Guild (max. 5 Server): Liste der freigegebenen Server, auf denen der Bot ist.
 * Kommt von der internen Bot-Schnittstelle (127.0.0.1). Nur serverseitig verwenden.
 */
export interface BotGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number;
  main: boolean;
}

export async function fetchBotGuilds(): Promise<BotGuild[] | null> {
  const token = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  if (!token || token.length < 32) return null;
  const port = process.env.BOT_API_PORT || "3101";
  try {
    const res = await fetch(`http://127.0.0.1:${port}/guilds`, {
      headers: { "x-bot-token": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.guilds) ? json.guilds : null;
  } catch {
    return null; // Bot nicht erreichbar
  }
}
