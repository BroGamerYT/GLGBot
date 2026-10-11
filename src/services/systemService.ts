import fs from "fs";
import path from "path";
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
    const entry: SystemLogEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
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
   * Liest die letzten Zeilen einer Datei.
   */
  private readLastLines(filePath: string, maxLines: number): string[] {
    if (!fs.existsSync(filePath)) return [];
    try {
      const stats = fs.statSync(filePath);
      // Maximal die letzten 512 KB lesen
      const readSize = Math.min(stats.size, 512 * 1024);
      const buffer = Buffer.alloc(readSize);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, readSize, stats.size - readSize);
      fs.closeSync(fd);

      const content = buffer.toString("utf-8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      return lines.slice(-maxLines);
    } catch (e) {
      console.error(`[SystemService] Fehler beim Lesen von ${filePath}:`, e);
      return [];
    }
  }

  /**
   * Parst eine Zeile aus PM2 Logdateien in ein strukturiertes Objekt.
   */
  private parseLine(
    line: string,
    service: "bot" | "web",
    defaultLevel: "info" | "warn" | "error"
  ): SystemLogEntry {
    let timestamp = new Date().toISOString();
    let message = line;
    let level = defaultLevel;

    // Erkennung typischer PM2 Timestamps z. B. "2026-10-11T18:35:34: ..." oder "[2026-10-11 18:35:34]"
    const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?):?\s*(.*)$/);
    if (isoMatch) {
      timestamp = new Date(isoMatch[1].replace(" ", "T")).toISOString();
      message = isoMatch[2];
    }

    const lower = message.toLowerCase();
    if (defaultLevel === "error" || lower.includes("error") || lower.includes("fehler") || lower.includes("fatal") || lower.includes("exception")) {
      level = "error";
    } else if (lower.includes("warn") || lower.includes("achtung") || lower.includes("warning")) {
      level = "warn";
    }

    return {
      id: `log-${service}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      service,
      level,
      message,
    };
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

        const outLines = this.readLastLines(botOut, limit);
        for (const line of outLines) {
          allEntries.push(this.parseLine(line, "bot", "info"));
        }

        const errLines = this.readLastLines(botErr, limit);
        for (const line of errLines) {
          allEntries.push(this.parseLine(line, "bot", "error"));
        }
      }

      // Web Logs
      if (serviceFilter === "all" || serviceFilter === "web") {
        const webOut = path.join(logDir, "discord-web-out.log");
        const webErr = path.join(logDir, "discord-web-error.log");

        const outLines = this.readLastLines(webOut, limit);
        for (const line of outLines) {
          allEntries.push(this.parseLine(line, "web", "info"));
        }

        const errLines = this.readLastLines(webErr, limit);
        for (const line of errLines) {
          allEntries.push(this.parseLine(line, "web", "error"));
        }
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
