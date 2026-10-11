import fs from "fs";
import path from "path";

export type BotModuleId =
  | "voice"
  | "live"
  | "levels"
  | "tickets"
  | "moderation"
  | "prison"
  | "freeGames"
  | "gameNews"
  | "auditLogs"
  | "rules"
  | "roles"
  | "sticky"
  | "suggestions"
  | "giveaways"
  | "daily"
  | "statsChannels"
  | "birthdays"
  | "announcements"
  | "lfg"
  | "customCommands"
  | "welcome";

export interface BotModuleInfo {
  id: BotModuleId;
  name: string;
  description: string;
  emoji: string;
  category: "community" | "management" | "gaming" | "security";
  commands: string[];
}

export const BOT_MODULES: BotModuleInfo[] = [
  {
    id: "voice",
    name: "Temporäre Sprachkanäle",
    description: "Join-to-Create Lobbys mit interaktivem VoiceMaster-Steuerungs-Panel",
    emoji: "🔊",
    category: "community",
    commands: ["voice", "voice-panel", "top-voice", "voice-stats", "setup-voice"],
  },
  {
    id: "live",
    name: "Live-Streamer Suite",
    description: "Twitch- & YouTube-Alerts, automatische Live-Kanäle mit Passwort/Limit & Streamer-Panel",
    emoji: "🔴",
    category: "gaming",
    commands: ["streamer", "setup-live", "twitch-live", "stream-panel"],
  },
  {
    id: "levels",
    name: "Level- & XP-System",
    description: "Chat- & Voice-XP, Ränge, Bestenlisten und automatische Level-Rollen-Belohnungen",
    emoji: "⭐",
    category: "community",
    commands: ["rank", "level", "leaderboard"],
  },
  {
    id: "tickets",
    name: "Support-Tickets",
    description: "Privates Support-Ticket-System mit Chat-Transkripten und Dashboard-Sync",
    emoji: "🎫",
    category: "management",
    commands: ["setup-tickets"],
  },
  {
    id: "moderation",
    name: "Moderation & Auto-Mod",
    description: "Verwarnungen, Timeouts, Kicks, Banns, Chat-Clear und Phishing-/Wortfilter",
    emoji: "🛡️",
    category: "security",
    commands: ["warn", "timeout", "kick", "ban", "unban", "clear", "cases"],
  },
  {
    id: "prison",
    name: "Gefängnis (/knast)",
    description: "Isolierung problematischer Nutzer in einem gesperrten Gefängnis-Kanal",
    emoji: "🔒",
    category: "security",
    commands: ["knast", "prison"],
  },
  {
    id: "freeGames",
    name: "Free Games Tracker",
    description: "Automatische Benachrichtigungen über kostenlose Spiele auf Epic, Steam und GOG",
    emoji: "🎁",
    category: "gaming",
    commands: ["free-games"],
  },
  {
    id: "gameNews",
    name: "Game News & Treiber",
    description: "Automatische Patchnotes (Steam, Minecraft) und Grafikkarten-Treiber-Feeds",
    emoji: "📰",
    category: "gaming",
    commands: [],
  },
  {
    id: "auditLogs",
    name: "Audit-Logging",
    description: "Stilles Server-Audit-Logging (Voice-Events, Moderation, Rollen, Kanäle)",
    emoji: "📜",
    category: "management",
    commands: ["setup-logs", "logs"],
  },
  {
    id: "rules",
    name: "Regeln & Regel-Sperre",
    description: "Regel-Verifizierung mit 'Regeln akzeptieren'-Button und Server-Sperre für Neulinge",
    emoji: "📜",
    category: "management",
    commands: ["setup-rules"],
  },
  {
    id: "roles",
    name: "Rollen-Panels",
    description: "Reaktions- & Button-Rollen für Benachrichtigungen und Interessen",
    emoji: "🏷️",
    category: "management",
    commands: ["setup-roles"],
  },
  {
    id: "sticky",
    name: "Sticky Messages",
    description: "Festgepinnte Nachrichten am Ende aktiver Kanäle",
    emoji: "📌",
    category: "management",
    commands: ["sticky"],
  },
  {
    id: "suggestions",
    name: "Vorschläge",
    description: "Community-Vorschläge mit Abstimmungs-Buttons",
    emoji: "💡",
    category: "community",
    commands: ["suggest"],
  },
  {
    id: "giveaways",
    name: "Giveaways",
    description: "Verlosungen mit Teilnahmeknopf, Countdown und automatischer Gewinnerziehung",
    emoji: "🎉",
    category: "community",
    commands: ["giveaway"],
  },
  {
    id: "daily",
    name: "Tägliche Belohnungen",
    description: "Täglicher /daily-Befehl mit ansteigendem Streak-Bonus und Belohnungs-XP",
    emoji: "📅",
    category: "community",
    commands: ["daily"],
  },
  {
    id: "birthdays",
    name: "Geburtstage",
    description: "Mitglieder tragen ihren Geburtstag ein - der Bot gratuliert und vergibt für 24 Std. eine Geburtstags-Rolle",
    emoji: "🎂",
    category: "community",
    commands: ["birthday"],
  },
  {
    id: "statsChannels",
    name: "Statistik-Kanäle",
    description: "Gesperrte Kanäle ganz oben mit Live-Zählern (Mitglieder, Online, Im Voice, Gerade live, Boosts)",
    emoji: "📊",
    category: "management",
    commands: ["server-stats"],
  },
  {
    id: "announcements",
    name: "Geplante Ankündigungen",
    description: "Nachrichten und Embeds zu einem festen Zeitpunkt senden - einmalig, täglich oder wöchentlich",
    emoji: "⏰",
    category: "management",
    commands: [],
  },
  {
    id: "lfg",
    name: "Mitspieler-Suche (LFG)",
    description: "Gruppen mit freien Plätzen - ist die Gruppe voll, gibt es eine eigene Lobby und alle werden verschoben",
    emoji: "👥",
    category: "gaming",
    commands: ["lfg"],
  },
  {
    id: "welcome",
    name: "Willkommens-Karte",
    description: "Grafische Willkommens-Karte für neue Mitglieder im eingestellten Kanal, optional automatische Rolle",
    emoji: "👋",
    category: "community",
    commands: [],
  },
  {
    id: "customCommands",
    name: "Eigene Befehle",
    description: "Eigene /Befehle mit Text- oder Embed-Antwort, im Dashboard angelegt - optional auch als !Befehl",
    emoji: "⚡",
    category: "management",
    commands: [],
  },
];

/** Grundmodule, die auf neu freigegebenen Servern sofort an sind */
export const CORE_MODULES: BotModuleId[] = ["rules", "roles", "moderation", "voice"];

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "modules_config.json");

class ModuleService {
  /** guildId -> Record<moduleId, boolean> */
  private config: Record<string, Record<string, boolean>> = {};

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      }
    } catch (e) {
      this.config = {};
    }
  }

  private saveConfig() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE + ".tmp", JSON.stringify(this.config, null, 2), "utf-8");
      fs.renameSync(CONFIG_FILE + ".tmp", CONFIG_FILE);
    } catch (e) {
      console.error("[ModuleService] Fehler beim Speichern der Modul-Konfiguration:", e);
    }
  }

  public isEnabled(guildId: string, moduleId: BotModuleId): boolean {
    const guildCfg = this.config[guildId];
    if (guildCfg && typeof guildCfg[moduleId] === "boolean") return guildCfg[moduleId];
    return this.isDefaultEnabled(guildId, moduleId);
  }

  /**
   * Standard, solange nichts umgeschaltet wurde:
   * Haupt-Server (GUILD_ID) bzw. Einzel-Installation -> alle Module an,
   * weitere freigegebene Server -> nur die Grundmodule (Rest schaltet der Server-Admin selbst ein).
   */
  public isDefaultEnabled(guildId: string, moduleId: BotModuleId): boolean {
    const main = (process.env.GUILD_ID || "").trim();
    if (!main || guildId === main) return true;
    return CORE_MODULES.includes(moduleId);
  }

  public enableModule(guildId: string, moduleId: BotModuleId): boolean {
    if (!this.config[guildId]) this.config[guildId] = {};
    this.config[guildId][moduleId] = true;
    this.saveConfig();
    return true;
  }

  public disableModule(guildId: string, moduleId: BotModuleId): boolean {
    if (!this.config[guildId]) this.config[guildId] = {};
    this.config[guildId][moduleId] = false;
    this.saveConfig();
    return false;
  }

  public toggleModule(guildId: string, moduleId: BotModuleId): boolean {
    const current = this.isEnabled(guildId, moduleId);
    if (current) {
      this.disableModule(guildId, moduleId);
      return false;
    } else {
      this.enableModule(guildId, moduleId);
      return true;
    }
  }

  public getModules(guildId: string): (BotModuleInfo & { enabled: boolean })[] {
    return BOT_MODULES.map((m) => ({
      ...m,
      enabled: this.isEnabled(guildId, m.id),
    }));
  }

  public getModuleById(moduleId: string): BotModuleInfo | undefined {
    return BOT_MODULES.find((m) => m.id === moduleId);
  }

  /**
   * Zu welchem Modul gehört ein Button / Dropdown / Formular (customId)?
   * null = gehört zu keinem abschaltbaren Modul.
   * Ticket schließen & Transkript bleiben immer nutzbar, damit offene Tickets nicht hängen bleiben.
   */
  public moduleForComponent(customId: string): BotModuleId | null {
    const id = customId.toLowerCase();
    if (id === "role_btn_rules") return "rules";
    if (id.startsWith("role_btn_")) return "roles";
    if (id.startsWith("voice_") || id.startsWith("modal_voice_")) return "voice";
    if (id.startsWith("stream_") || id.startsWith("modal_stream_")) return "live";
    if (id === "btn_ticket_create") return "tickets";
    if (id.startsWith("btn_sugg_")) return "suggestions";
    if (id.startsWith("giveaway_")) return "giveaways";
    if (id.startsWith("lfg_")) return "lfg";
    return null;
  }

  public isCommandEnabled(
    guildId: string,
    commandName: string
  ): { enabled: boolean; moduleName?: string; moduleId?: BotModuleId } {
    const mod = BOT_MODULES.find((m) => m.commands.includes(commandName.toLowerCase()));
    if (!mod) {
      return { enabled: true };
    }
    const enabled = this.isEnabled(guildId, mod.id);
    return { enabled, moduleName: mod.name, moduleId: mod.id };
  }
}

export const moduleService = new ModuleService();
