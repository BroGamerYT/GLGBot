/**
 * Vorschläge für Game-News im Dashboard.
 * Eigene Steam-Spiele können zusätzlich per Link oder App-ID hinzugefügt werden.
 */

export type NewsSourceType = "steam" | "minecraft" | "nvidia" | "amd-gpu" | "amd-chipset" | "intel-gpu";

export interface CatalogEntry {
  key: string; // eindeutiger Schlüssel, z. B. "steam:271590" oder "nvidia"
  type: NewsSourceType;
  appId?: string;
  name: string;
  category: "game" | "gpu" | "cpu";
  description?: string;
  beta?: boolean; // Quelle wird von der Hersteller-Webseite gelesen und kann sich ändern
}

/** Was wird gemeldet? (Detailansicht im Dashboard) */
export const NEWS_INCLUDES: Record<NewsSourceType, string[]> = {
  steam: [
    "Alle offiziellen Ankündigungen der Entwickler auf Steam",
    "Patchnotes und Updates (Hotfixes, große Content-Updates)",
    "Events, neue Seasons und Wochen-Boni",
    "Mit „Nur Patchnotes“ kommen ausschließlich Updates",
    "Jeder Post mit Bild, kurzer Zusammenfassung und Button „In Steam öffnen“",
  ],
  minecraft: [
    "Jede neue Vollversion der Java Edition (z. B. 1.21 → 1.21.1)",
    "Optional: Snapshots (Testversionen, meist wöchentlich)",
    "Link zur Changelog-Seite im Minecraft-Wiki",
  ],
  nvidia: [
    "Jeder neue GeForce Game Ready Treiber (WHQL) für GTX- und RTX-Karten",
    "Versionsnummer und Veröffentlichungsdatum",
    "Buttons zu Release-Notes und Direkt-Download",
  ],
  "amd-gpu": [
    "Jede neue AMD Software: Adrenalin Edition für Radeon-Grafikkarten",
    "Versionsnummer und Link zu den Release-Notes",
  ],
  "intel-gpu": [
    "Jeder neue Grafiktreiber für Intel Arc und Iris Xe",
    "Versionsnummer und Link zur Download-Seite",
  ],
  "amd-chipset": [
    "Jeder neue AMD Chipsatz-Treiber für Ryzen-Mainboards (AM4 & AM5)",
    "Versionsnummer, Release-Notes und Direkt-Download",
  ],
};

const steam = (appId: string, name: string): CatalogEntry => ({ key: `steam:${appId}`, type: "steam", appId, name, category: "game" });

export const NEWS_CATALOG: CatalogEntry[] = [
  // ---------------- Spiele ----------------
  steam("271590", "Grand Theft Auto V"),
  { key: "minecraft", type: "minecraft", name: "Minecraft (Java Edition)", category: "game", description: "Neue Versionen (optional auch Snapshots)" },
  steam("730", "Counter-Strike 2"),
  steam("252490", "Rust"),
  steam("578080", "PUBG: Battlegrounds"),
  steam("1172470", "Apex Legends"),
  steam("1938090", "Call of Duty"),
  steam("359550", "Rainbow Six Siege"),
  steam("252950", "Rocket League"),
  steam("1085660", "Destiny 2"),
  steam("2767030", "Marvel Rivals"),
  steam("570", "Dota 2"),
  steam("1091500", "Cyberpunk 2077"),
  steam("1086940", "Baldur's Gate 3"),
  steam("1623730", "Palworld"),
  steam("553850", "HELLDIVERS 2"),
  steam("526870", "Satisfactory"),
  steam("227300", "Euro Truck Simulator 2"),
  steam("230410", "Warframe"),
  steam("1245620", "ELDEN RING"),

  // ---------------- Grafikkarten-Treiber ----------------
  { key: "nvidia", type: "nvidia", name: "NVIDIA GeForce Game Ready", category: "gpu", description: "Neue GeForce-Treiber (WHQL)" },
  { key: "amd-gpu", type: "amd-gpu", name: "AMD Radeon (Adrenalin)", category: "gpu", description: "Neue AMD-Software: Adrenalin Edition", beta: true },
  { key: "intel-gpu", type: "intel-gpu", name: "Intel Arc Grafik", category: "gpu", description: "Neue Intel Arc / Iris Xe Treiber", beta: true },

  // ---------------- CPU / Chipsatz ----------------
  { key: "amd-chipset", type: "amd-chipset", name: "AMD Ryzen Chipsatz", category: "cpu", description: "Chipsatz-Treiber für AM4 & AM5", beta: true },
];

export function steamImage(appId: string) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}
