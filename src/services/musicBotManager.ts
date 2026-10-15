import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Verwaltet den separaten Mini-Musik-Bot (musicbot/) als Kindprozess:
 * starten, stoppen, neustarten, überwachen (Auto-Restart bei Absturz).
 * Der Hauptbot bleibt für Musik unangetastet – ein Bot pro Voice-Kanal (Discord-Limit).
 */

const MUSICBOT_DIR = path.join(__dirname, "../../musicbot");
const ENTRY = path.join(MUSICBOT_DIR, "dist", "index.js");

const MAX_RESTARTS_PER_MIN = 5;

export interface MusicBotStatus {
  configured: boolean;
  running: boolean;
  pid: number | null;
  uptimeSec: number;
  restarts: number;
  lastExit: string | null;
}

class MusicBotManager {
  private child: ChildProcess | null = null;
  private startedAt: number | null = null;
  private restarts = 0;
  private lastExit: string | null = null;
  private wantRunning = false;
  private restartStamps: number[] = [];

  isConfigured(): boolean {
    return !!process.env.MUSICBOT_TOKEN && fs.existsSync(ENTRY);
  }

  missingReason(): string | null {
    if (!process.env.MUSICBOT_TOKEN) return "MUSICBOT_TOKEN fehlt in der .env.";
    if (!fs.existsSync(ENTRY)) return "musicbot/dist fehlt – erst bauen (sync_server.bat).";
    return null;
  }

  status(): MusicBotStatus {
    return {
      configured: this.isConfigured(),
      running: !!this.child && !this.child.killed && this.child.exitCode === null,
      pid: this.child?.pid || null,
      uptimeSec: this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0,
      restarts: this.restarts,
      lastExit: this.lastExit,
    };
  }

  /** Beim Hauptbot-Start: Worker automatisch mitstarten (wenn konfiguriert). */
  autostart() {
    if ((process.env.MUSICBOT_AUTOSTART || "true") !== "true") return;
    if (!this.isConfigured()) {
      console.log(`[MusicBotManager] Deaktiviert: ${this.missingReason()}`);
      return;
    }
    this.start();
  }

  start(): { ok: boolean; message: string } {
    if (this.status().running) return { ok: true, message: "Musik-Bot läuft bereits." };
    const missing = this.missingReason();
    if (missing) return { ok: false, message: missing };
    this.wantRunning = true;
    this.spawn();
    return { ok: true, message: "Musik-Bot gestartet." };
  }

  async stop(): Promise<{ ok: boolean; message: string }> {
    this.wantRunning = false;
    const child = this.child;
    this.child = null;
    this.startedAt = null;
    if (!child || child.killed || child.exitCode !== null) {
      return { ok: true, message: "Musik-Bot war nicht aktiv." };
    }
    child.kill("SIGTERM");
    const exited = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 8_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!exited) child.kill("SIGKILL");
    return { ok: true, message: "Musik-Bot gestoppt." };
  }

  async restart(): Promise<{ ok: boolean; message: string }> {
    await this.stop();
    return this.start();
  }

  private spawn() {
    const child = spawn(process.execPath, [ENTRY], {
      cwd: MUSICBOT_DIR,
      env: { ...process.env },
      stdio: "inherit",
    });
    this.child = child;
    this.startedAt = Date.now();
    this.lastExit = null;
    console.log(`[MusicBotManager] Musik-Bot gestartet (PID ${child.pid}).`);

    child.on("exit", (code, signal) => {
      if (this.child !== child) return;
      this.child = null;
      this.startedAt = null;
      this.lastExit = `Code ${code ?? "?"}${signal ? ` (${signal})` : ""} um ${new Date().toLocaleString("de-DE")}`;
      console.warn(`[MusicBotManager] Musik-Bot beendet: ${this.lastExit}`);
      if (!this.wantRunning) return;
      const now = Date.now();
      this.restartStamps = this.restartStamps.filter((t) => now - t < 60_000);
      if (this.restartStamps.length >= MAX_RESTARTS_PER_MIN) {
        console.error("[MusicBotManager] Zu viele Abstürze – Auto-Restart pausiert. Manuell über Dashboard neu starten.");
        this.wantRunning = false;
        return;
      }
      this.restartStamps.push(now);
      this.restarts++;
      console.log(`[MusicBotManager] Starte Musik-Bot neu (Versuch ${this.restarts}) …`);
      setTimeout(() => {
        if (this.wantRunning && !this.status().running) this.spawn();
      }, 5_000);
    });
  }
}

export const musicBotManager = new MusicBotManager();
