import fs from "fs";
import path from "path";

/**
 * Tägliche Sicherung aller Bot-Daten (Level, Strafen, Einstellungen, Streamer …).
 * Kopiert alle JSON-Dateien aus data/ (inkl. data/rules/) nach data/_snapshots/<Datum>/
 * und behält die letzten KEEP_DAYS Tage. Server-Struktur-Backups (data/backups) und
 * Ticket-Transkripte sind schon eigene Sicherungen und werden nicht doppelt kopiert.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const SNAP_DIR = path.join(DATA_DIR, "_snapshots");
const KEEP_DAYS = Number(process.env.DATA_SNAPSHOT_DAYS || 7);
const INCLUDE_SUBDIRS = ["rules"];

function copyJsonFiles(from: string, to: string): number {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      fs.copyFileSync(path.join(from, entry.name), path.join(to, entry.name));
      count++;
    }
  }
  return count;
}

class DataSnapshotService {
  private interval: NodeJS.Timeout | null = null;

  /** Erstellt die Sicherung für heute (überschreibt eine bestehende von heute). */
  public createSnapshot(): { dir: string; files: number } {
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(SNAP_DIR, day);
    let files = copyJsonFiles(DATA_DIR, target);
    for (const sub of INCLUDE_SUBDIRS) files += copyJsonFiles(path.join(DATA_DIR, sub), path.join(target, sub));
    this.prune();
    return { dir: target, files };
  }

  /** Löscht Sicherungen, die älter als KEEP_DAYS Tage sind. */
  private prune() {
    if (!fs.existsSync(SNAP_DIR)) return;
    const days = fs
      .readdirSync(SNAP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort()
      .reverse();
    for (const old of days.slice(Math.max(1, KEEP_DAYS))) {
      fs.rmSync(path.join(SNAP_DIR, old), { recursive: true, force: true });
    }
  }

  public listSnapshots(): string[] {
    if (!fs.existsSync(SNAP_DIR)) return [];
    return fs
      .readdirSync(SNAP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
  }

  /** Sicherung beim Start (falls heute noch keine existiert) und danach alle 24 Stunden. */
  public start() {
    if (this.interval) return;
    const run = () => {
      try {
        const r = this.createSnapshot();
        console.log(`💾 [Daten-Sicherung] ${r.files} Dateien gesichert -> ${path.relative(process.cwd(), r.dir)}`);
      } catch (e) {
        console.error("[Daten-Sicherung] Fehler:", e);
      }
    };
    const today = new Date().toISOString().slice(0, 10);
    if (!this.listSnapshots().includes(today)) setTimeout(run, 30_000);
    this.interval = setInterval(run, 24 * 60 * 60 * 1000);
  }
}

export const dataSnapshotService = new DataSnapshotService();
