export interface BotGuildSlugInfo {
  id: string;
  name: string;
  index: number;
  primarySlug: string;
  nameSlug: string;
  allSlugs: string[];
}

/**
 * Normalisiert einen String: Wandelt mathematische Unicode-Zeichen (z. B. 𝑮𝒆𝒓𝒎𝒂𝒏𝒚)
 * per NFKD in normale ASCII-Buchstaben um, entfernt Sonderzeichen und macht Kleinbuchstaben.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD") // Wandelt 𝑮𝒆𝒓𝒎𝒂𝒏𝒚 -> Germany um!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Kompakte Version ohne Bindestriche (z. B. "meinserver").
 */
export function compactSlug(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Erzeugt für einen Server alle gültigen Kurz-URLs und den Standard-Slug.
 */
export function getGuildSlugInfo(
  guild: { id: string; name: string; alias?: string },
  index: number
): BotGuildSlugInfo {
  const num = index + 1;
  const primarySlug = `bot${num}`;
  const nameSlug = slugify(guild.name) || `server${num}`;
  const nameCompact = compactSlug(guild.name);

  const slugs = new Set<string>([
    primarySlug, // bot1
    `server${num}`, // server1
    String(num), // 1
    guild.id, // 123456789012345678
    nameSlug, // mein-server
    nameCompact, // meinserver
  ]);

  if (guild.alias) {
    slugs.add(slugify(guild.alias));
    slugs.add(compactSlug(guild.alias));
  }

  return {
    id: guild.id,
    name: guild.name,
    index,
    primarySlug,
    nameSlug,
    allSlugs: Array.from(slugs).filter(Boolean),
  };
}

/**
 * Löst einen eingegebenen Pfad / Slug (z. B. "bot1", "bot2", "mein-server")
 * zum passenden Server auf.
 */
export function resolveGuildFromSlug<T extends { id: string; name: string; alias?: string }>(
  inputSlug: string,
  guilds: T[]
): { guild: T; info: BotGuildSlugInfo } | null {
  if (!inputSlug || guilds.length === 0) return null;
  const normalized = slugify(inputSlug);
  const compact = compactSlug(inputSlug);

  for (let i = 0; i < guilds.length; i++) {
    const g = guilds[i];
    const info = getGuildSlugInfo(g, i);

    if (
      info.allSlugs.includes(normalized) ||
      info.allSlugs.includes(compact) ||
      info.allSlugs.includes(inputSlug.toLowerCase())
    ) {
      return { guild: g, info };
    }
  }

  return null;
}
