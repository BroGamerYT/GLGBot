/**
 * Vorschläge für Game-, Treiber-, NAS- & Software-News im Dashboard.
 * Eigene Steam-Spiele können zusätzlich per Link oder App-ID hinzugefügt werden.
 */

export type NewsSourceType =
  | "steam"
  | "minecraft"
  | "nvidia"
  | "amd-gpu"
  | "amd-chipset"
  | "intel-gpu"
  | "nas-synology"
  | "nas-qnap"
  | "nas-truenas"
  | "nas-unraid"
  | "software-amp"
  | "software-codecs"
  | "software-obs"
  | "software-handbrake";

export interface CatalogEntry {
  key: string; // eindeutiger Schlüssel, z. B. "steam:271590" oder "nvidia"
  type: NewsSourceType;
  appId?: string;
  name: string;
  category: "game" | "gpu" | "cpu" | "nas" | "software";
  description?: string;
  beta?: boolean; // Quelle wird von der Hersteller-Webseite gelesen und kann sich ändern
  image?: string;
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
  "nas-synology": [
    "Neue Versionen & Updates von Synology DiskStation Manager (DSM 7.x)",
    "Sicherheits-Patches, Fehlerbehebungen und neue Paket-Features",
    "Direktlink zu den offiziellen Synology Release Notes",
  ],
  "nas-truenas": [
    "Releases & Updates für TrueNAS SCALE und TrueNAS CORE",
    "Versionsnummern, Changelogs und Download-Links",
  ],
  "nas-unraid": [
    "Neue Unraid OS Stable- und Release-Candidate Versionen",
    "Changelogs zu Kernel, Docker-Engine und ZFS/Btrfs-Treibern",
  ],
  "nas-qnap": [
    "Neue Firmware-Updates für QNAP QTS & QuTS hero",
    "Sicherheitshinweise und offizielle Release Notes",
  ],
  "software-amp": [
    "CubeCoders AMP (Application Management Panel für Game Server)",
    "Neue Core-Releases, Modul-Updates und Feature-Changelogs",
    "Wichtig für alle Server-Admins mit dedizierten Game-Servern",
  ],
  "software-codecs": [
    "K-Lite Codec Pack (Standard/Mega) & LAV Filters Updates",
    "Neue Audio- und Video-Decoder-Versionen (x265, AV1, VP9)",
    "Download-Links und Changelogs",
  ],
  "software-obs": [
    "Neue Versionen von OBS Studio (Open Broadcaster Software)",
    "Changelogs zu NVENC/AV1-Streaming, Audio-Filtern und Plugin-Schnittstellen",
  ],
  "software-handbrake": [
    "Neue Releases des Open-Source Video Transcoders HandBrake",
    "Changelog zu GPU-Encodern (NVENC, QSV, VCE) und Presets",
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

  // ---------------- NAS-Systeme & Server-Updates ----------------
  { key: "nas-synology", type: "nas-synology", name: "Synology DSM", category: "nas", description: "DiskStation Manager Updates & Patches" },
  { key: "nas-truenas", type: "nas-truenas", name: "TrueNAS SCALE & CORE", category: "nas", description: "System-Releases & Sicherheits-Updates" },
  { key: "nas-unraid", type: "nas-unraid", name: "Unraid OS", category: "nas", description: "Stable Releases & Changelogs" },
  { key: "nas-qnap", type: "nas-qnap", name: "QNAP QTS / QuTS", category: "nas", description: "Firmware-Updates & Security Notes", beta: true },

  // ---------------- Software & Codecs ----------------
  { key: "software-amp", type: "software-amp", name: "CubeCoders AMP", category: "software", description: "Application Management Panel für Game Server" },
  { key: "software-codecs", type: "software-codecs", name: "K-Lite & LAV Codecs", category: "software", description: "Audio- & Video-Codec Packs für Windows" },
  { key: "software-obs", type: "software-obs", name: "OBS Studio", category: "software", description: "Streaming- & Recording-Software Updates" },
  { key: "software-handbrake", type: "software-handbrake", name: "HandBrake Video Transcoder", category: "software", description: "Open-Source Video Encoder Releases" },
];

export function steamImage(appId: string) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}
