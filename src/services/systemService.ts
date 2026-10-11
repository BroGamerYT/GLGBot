import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ProcessStatus {
  name: string;
  pm_id: number;
  status: string;
  uptimeSeconds: number;
  restarts: number;
  memoryBytes: number;
  cpuPercent: number;
  nodeVersion: string;
  version: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  service: "bot" | "web";
  level: "info" | "warn" | "error";
  message: string;
}

export interface SystemLogsResponse {
  logs: SystemLogEntry[];
  processes: ProcessStatus[];
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    botUptimeSeconds: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

class SystemService {
  // In-Memory Ring-Buffer für Bot-Logs (falls keine PM2-Dateien vorhanden sind oder als Ergänzung)
  private memoryLogs: SystemLogEntry[] = [];
  private readonly maxMemoryLogs = 500;

  // Cache für feste Basis-Zeitstempel von Dateien ohne eigene Timestamps (verhindert das 'Mitlaufen' der Uhrzeit)
  private fileBaselineTimes: Map<string, string> = new Map();
  // Cache für Zeilen-Zeitstempel: Zeilen-Inhalt -> Zeitstempel
  private lineTimestamps: Map<string, string> = new Map();

  constructor() {
    this.hookConsole();
  }

  /**
   * Hookt console.log/warn/error um die Ausgaben im Speicher mitzuschneiden.
   */
  private hookConsole() {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args: any[]) => {
      origLog.apply(console, args);
      this.addMemoryLog("bot", "info", args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    };

    console.warn = (...args: any[]) => {
      origWarn.apply(console, args);
      this.addMemoryLog("bot", "warn", args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    };

    console.error = (...args: any[]) => {
      origError.apply(console, args);
      this.addMemoryLog("bot", "error", args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    };
  }

  private addMemoryLog(service: "bot" | "web", level: "info" | "warn" | "error", message: string) {
    if (!message || !message.trim()) return;
    const now = new Date().toISOString();
    const hash = crypto
      .createHash("md5")
      .update(`${service}:${message}:${now}`)
      .digest("hex")
      .slice(0, 10);
    const entry: SystemLogEntry = {
      id: `mem-${hash}`,
      timestamp: now,
      service,
      level,
      message: message.trim(),
    };
    this.memoryLogs.push(entry);
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.splice(0, this.memoryLogs.length - this.maxMemoryLogs);
    }
  }

  /**
   * Ermittelt den PM2-Status beider Prozesse (discord-bot, discord-web).
   */
  public async getProcesses(): Promise<ProcessStatus[]> {
    try {
      const { stdout } = await execAsync("pm2 jlist");
      const list = JSON.parse(stdout);
      if (!Array.isArray(list)) return [];

      return list
        .filter((p: any) => p.name === "discord-bot" || p.name === "discord-web")
        .map((p: any) => {
          const uptimeMs = p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0;
          return {
            name: p.name,
            pm_id: p.pm_id ?? 0,
            status: p.pm2_env?.status || "unknown",
            uptimeSeconds: Math.max(0, Math.floor(uptimeMs / 1000)),
            restarts: p.pm2_env?.restart_time ?? 0,
            memoryBytes: p.monit?.memory ?? 0,
            cpuPercent: Math.round((p.monit?.cpu ?? 0) * 10) / 10,
            nodeVersion: p.pm2_env?.node_version || process.version,
            version: p.pm2_env?.version || "2.21.0",
          };
        });
    } catch {
      // Fallback: Bot-Prozessdaten direkt aus Node
      return [
        {
          name: "discord-bot",
          pm_id: 0,
          status: "online",
          uptimeSeconds: Math.floor(process.uptime()),
          restarts: 0,
          memoryBytes: process.memoryUsage().rss,
          cpuPercent: 0,
          nodeVersion: process.version,
          version: "2.21.0",
        },
      ];
    }
  }

  /**
   * Findet den Pfad zu den PM2-Logdateien.
   */
  private getPm2LogDir(): string | null {
    const candidateDirs = [
      process.env.PM2_HOME ? path.join(process.env.PM2_HOME, "logs") : null,
      path.join(process.env.HOME || "/root", ".pm2", "logs"),
      "/root/.pm2/logs",
      path.join(process.cwd(), ".pm2", "logs"),
    ].filter(Boolean) as string[];

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) return dir;
    }
    return null;
  }

  /**
   * Liest und parst eine PM2-Logdatei mit deterministischen, stabilen Zeitstempeln und IDs.
   * Zeilen ohne eigenen Zeitstempel behalten einen festen, gecachten Zeitstempel
   * und laufen bei Auto-Refresh nicht mit der aktuellen Uhrzeit mit.
   */
  private readAndParseLogFile(
    filePath: string,
    service: "bot" | "web",
    defaultLevel: "info" | "error",
    maxLines: number
  ): SystemLogEntry[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) return [];

      // Bis zu 1 MB vom Dateiende lesen
      const readSize = Math.min(stats.size, 1024 * 1024);
      const buffer = Buffer.alloc(readSize);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, readSize, stats.size - readSize);
      fs.closeSync(fd);

      let content = buffer.toString("utf-8");
      // Falls wir mitten in der Datei begonnen haben, die erste (möglicherweise unvollständige) Zeile verwerfen
      if (stats.size > readSize) {
        const firstNewline = content.indexOf("\n");
        if (firstNewline !== -1) {
          content = content.slice(firstNewline + 1);
        }
      }

      const rawLines = content
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.trim().length > 0);

      if (rawLines.length === 0) return [];

      // Regex für PM2-Timestamps:
      // z. B. "2026-10-11T19:00:08: ...", "2026-10-11 19:00:08: ...", "[2026-10-11 19:00:08] ...", "[2026-10-11T19:00:08.123Z] ..."
      const timestampRegex = /^\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?:?\s*(.*)$/;

      // Baseline ermitteln: Der erste gefundene Zeitstempel im Puffer
      let firstDetectedTimestamp: string | null = null;
      for (const line of rawLines) {
        const m = line.match(timestampRegex);
        if (m) {
          const dt = new Date(m[1].replace(" ", "T"));
          if (!isNaN(dt.getTime())) {
            firstDetectedTimestamp = dt.toISOString();
            break;
          }
        }
      }

      // Falls die Datei gar keine Zeitstempel enthält, nutzen wir das statische mtime der Datei (gecacht)
      if (!this.fileBaselineTimes.has(filePath)) {
        this.fileBaselineTimes.set(
          filePath,
          firstDetectedTimestamp || stats.mtime.toISOString()
        );
      }
      const baseline =
        firstDetectedTimestamp ||
        this.fileBaselineTimes.get(filePath) ||
        stats.mtime.toISOString();

      let currentTimestamp = baseline;
      const seenHashes = new Map<string, number>();
      const parsedEntries: SystemLogEntry[] = [];

      for (const line of rawLines) {
        let message = line;
        const match = line.match(timestampRegex);
        if (match) {
          const parsed = new Date(match[1].replace(" ", "T"));
          if (!isNaN(parsed.getTime())) {
            currentTimestamp = parsed.toISOString();
            message = match[2];
          }
        }

        // Falls Message leer ist (z. B. Zeile war nur Zeitstempel), weitergehen
        if (!message || !message.trim()) continue;

        // Zeilen-Cache: Zeilen ohne Zeitstempel bekommen einen fest zugeordneten Zeitstempel
        const lineKey = `${filePath}:${message.trim()}`;
        if (!match) {
          if (!this.lineTimestamps.has(lineKey)) {
            this.lineTimestamps.set(lineKey, currentTimestamp);
          }
          currentTimestamp = this.lineTimestamps.get(lineKey) || currentTimestamp;
        }

        // Level-Erkennung
        const lower = message.toLowerCase();
        let level: "info" | "warn" | "error" = defaultLevel;
        if (
          defaultLevel === "error" ||
          lower.includes("error") ||
          lower.includes("fehler") ||
          lower.includes("fatal") ||
          lower.includes("exception") ||
          lower.includes("uncaught")
        ) {
          level = "error";
        } else if (
          lower.includes("warn") ||
          lower.includes("achtung") ||
          lower.includes("warning")
        ) {
          level = "warn";
        }

        // Deterministische ID generieren (stabil über Refreshes)
        const hash = crypto
          .createHash("md5")
          .update(`${service}:${message}:${currentTimestamp}`)
          .digest("hex")
          .slice(0, 12);

        const count = (seenHashes.get(hash) || 0) + 1;
        seenHashes.set(hash, count);
        const id = `log-${service}-${hash}-${count}`;

        parsedEntries.push({
          id,
          timestamp: currentTimestamp,
          service,
          level,
          message,
        });
      }

      return parsedEntries.slice(-maxLines);
    } catch (e) {
      console.error(`[SystemService] Fehler beim Lesen von ${filePath}:`, e);
      return [];
    }
  }

  /**
   * Holt Logs für Bot und Webinterface.
   */
  public async getLogs(options: {
    service?: "all" | "bot" | "web";
    limit?: number;
    query?: string;
    level?: "all" | "info" | "warn" | "error";
  }): Promise<SystemLogsResponse> {
    const serviceFilter = options.service || "all";
    const limit = Math.max(10, Math.min(500, options.limit || 150));
    const query = options.query?.toLowerCase().trim() || "";
    const levelFilter = options.level || "all";

    const allEntries: SystemLogEntry[] = [];
    const logDir = this.getPm2LogDir();

    if (logDir) {
      // Bot Logs
      if (serviceFilter === "all" || serviceFilter === "bot") {
        const botOut = path.join(logDir, "discord-bot-out.log");
        const botErr = path.join(logDir, "discord-bot-error.log");

        allEntries.push(...this.readAndParseLogFile(botOut, "bot", "info", limit));
        allEntries.push(...this.readAndParseLogFile(botErr, "bot", "error", limit));
      }

      // Web Logs
      if (serviceFilter === "all" || serviceFilter === "web") {
        const webOut = path.join(logDir, "discord-web-out.log");
        const webErr = path.join(logDir, "discord-web-error.log");

        allEntries.push(...this.readAndParseLogFile(webOut, "web", "info", limit));
        allEntries.push(...this.readAndParseLogFile(webErr, "web", "error", limit));
      }
    }

    // Wenn keine Datei-Logs gefunden wurden oder wenige vorhanden sind: Memory-Logs dazumischen
    if (allEntries.length === 0) {
      for (const m of this.memoryLogs) {
        if (serviceFilter === "all" || m.service === serviceFilter) {
          allEntries.push(m);
        }
      }
    }

    // Sortieren nach Zeitstempel
    allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter anwenden
    let filtered = allEntries;
    if (serviceFilter !== "all") {
      filtered = filtered.filter((e) => e.service === serviceFilter);
    }
    if (levelFilter !== "all") {
      filtered = filtered.filter((e) => e.level === levelFilter);
    }
    if (query) {
      filtered = filtered.filter((e) => e.message.toLowerCase().includes(query));
    }

    const finalLogs = filtered.slice(-limit);
    const processes = await this.getProcesses();

    return {
      logs: finalLogs,
      processes,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        botUptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  /**
   * Leert alle Logdateien (pm2 flush).
   */
  public async clearLogs(): Promise<{ success: boolean; message: string }> {
    this.memoryLogs = [];
    this.fileBaselineTimes.clear();
    this.lineTimestamps.clear();
    try {
      await execAsync("pm2 flush");
      return { success: true, message: "PM2 Logs wurden erfolgreich geleert." };
    } catch {
      const logDir = this.getPm2LogDir();
      if (logDir) {
        const files = [
          "discord-bot-out.log",
          "discord-bot-error.log",
          "discord-web-out.log",
          "discord-web-error.log",
        ];
        for (const f of files) {
          const p = path.join(logDir, f);
          if (fs.existsSync(p)) fs.writeFileSync(p, "", "utf-8");
        }
      }
      return { success: true, message: "Logs wurden geleert." };
    }
  }

  /**
   * Führt einen Neustart des Bots, des Webinterfaces oder beider aus.
   */
  public async restart(target: "bot" | "web" | "all" = "bot"): Promise<{ success: boolean; message: string }> {
    console.log(`[SystemService] Neustart angefordert für Ziel: ${target}`);

    let cmd = "";
    if (target === "web") {
      cmd = "pm2 restart discord-web";
    } else if (target === "all") {
      cmd = "pm2 restart discord-bot discord-web";
    } else {
      cmd = "pm2 restart discord-bot";
    }

    // Nicht-blockierend im Hintergrund ausführen mit kleiner Verzögerung,
    // damit die API-Antwort noch sauber an den Client gesendet werden kann!
    setTimeout(() => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`[SystemService] PM2 Restart Fehler (${cmd}):`, err);
          // Fallback für den Bot falls PM2 fehlschlägt:
          if (target === "bot" || target === "all") {
            console.log("[SystemService] Verwende Fallback: process.exit(0)");
            process.exit(0);
          }
        } else {
          console.log(`[SystemService] PM2 Restart erfolgreich:\n${stdout}`);
        }
      });
    }, 800);

    const targetNames = {
      bot: "Discord Bot (discord-bot)",
      web: "Webinterface (discord-web)",
      all: "Discord Bot & Webinterface",
    };

    return {
      success: true,
      message: `Neustart für ${targetNames[target] || target} wurde erfolgreich angestoßen. Der Prozess startet in Kürze neu.`,
    };
  }
}

export const systemService = new SystemService();
