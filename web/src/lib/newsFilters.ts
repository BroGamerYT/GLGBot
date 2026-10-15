export type NewsArticleFilter = "all" | "games" | "patchnotes" | "drivers" | "nas" | "tech";

const SOURCE_TYPES: Record<Exclude<NewsArticleFilter, "all" | "patchnotes">, ReadonlySet<string>> = {
  games: new Set(["steam", "minecraft"]),
  drivers: new Set(["nvidia", "amd-gpu", "amd-chipset", "intel-gpu", "software-amp", "software-codecs", "software-obs", "software-handbrake"]),
  nas: new Set(["nas-synology", "nas-truenas", "nas-unraid", "nas-qnap", "nas-ugreen"]),
  tech: new Set(["tech-computerbase", "tech-hardwareluxx", "tech-heise", "tech-golem", "tech-winfuture"]),
};

export function matchesNewsArticleFilter(
  article: { sourceType: string; isPatchnotes?: boolean },
  filter: NewsArticleFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "patchnotes") return Boolean(article.isPatchnotes);
  return SOURCE_TYPES[filter].has(article.sourceType);
}