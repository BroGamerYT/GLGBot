import fs from "fs";
import path from "path";

/**
 * Löscht die Daten von Servern, deren Freigabe vor mehr als PURGE_AFTER_DAYS Tagen entfernt wurde
 * (oder die im Dashboard zum sofortigen Löschen markiert wurden).
 *
 * Läuft beim Bot-Start, BEVOR die Dienste ihre Daten laden - sonst würden sie die
 * gelöschten Einträge aus dem Arbeitsspeicher wieder in die Dateien schreiben.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const ACCESS_FILE = path.join(DATA_DIR, "guild_access.json");
const PURGE_AFTER_DAYS = Number(process.env.PURGE_REMOVED_GUILDS_DAYS || 30);

function purgeValue(value: any, guildId: string): { value: any; removed: number } {
  let removed = 0;
  if (Array.isArray(value)) {
    const next = value.filter((item) => {
      const hit =
        (item && typeof item === "object" && item.guildId === guildId) ||
        (typeof item === "string" && (item.startsWith(`${guildId}:`) || item.startsWith(`${guildId}_`)));
      if (hit) removed++;
      return !hit;
    });
    return { value: next, removed };
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key === guildId || key.startsWith(`${guildId}:`)) {
        delete value[key];
        removed++;
        continue;
      }
      // eine Ebene tiefer: Listen mit guildId-Einträgen (z. B. { cases: [...] })
      if (Array.isArray(value[key])) {
        const r = purgeValue(value[key], guildId);
        value[key] = r.value;
        removed += r.removed;
      }
    }
  }
  return { value, removed };
}

function purgeGuild(guildId: string): number {
  let total = 0;
  for (const name of fs.readdirSync(DATA_DIR)) {
    const file = path.join(DATA_DIR, name);
    if (!name.endsWith(".json") || name === "guild_access.json" || !fs.statSync(file).isFile()) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      const r = purgeValue(data, guildId);
      if (r.removed > 0) {
        fs.writeFileSync(file + ".tmp", JSON.stringify(r.value, null, 2), "utf-8");
        fs.renameSync(file + ".tmp", file);
        total += r.removed;
      }
    } catch {
      // beschädigte/fremde Dateien überspringen
    }
  }
  // Regeln dieses Servers
  const rulesFile = path.join(DATA_DIR, "rules", `${guildId}.json`);
  if (fs.existsSync(rulesFile)) {
    fs.rmSync(rulesFile, { force: true });
    total++;
  }
  // Server-Struktur-Backups dieses Servers
  const backupsDir = path.join(DATA_DIR, "backups");
  if (fs.existsSync(backupsDir)) {
    for (const f of fs.readdirSync(backupsDir).filter((n) => n.endsWith(".json"))) {
      try {
        if (JSON.parse(fs.readFileSync(path.join(backupsDir, f), "utf-8"))?.guildId === guildId) {
          fs.rmSync(path.join(backupsDir, f), { force: true });
          total++;
        }
      } catch {
        /* überspringen */
      }
    }
  }
  return total;
}

export function purgeRemovedGuilds() {
  try {
    if (!fs.existsSync(ACCESS_FILE)) return;
    const access = JSON.parse(fs.readFileSync(ACCESS_FILE, "utf-8"));
    const removed: { id: string; name?: string; removedAt: number; purgeNow?: boolean }[] = access.removed || [];
    const allowed = new Set<string>((access.allowed || []).map((a: any) => a.id));
    const limit = Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const keep: typeof removed = [];
    const purged: any[] = access.purged || [];
    for (const r of removed) {
      if (allowed.has(r.id)) continue; // wieder freigegeben
      if (r.purgeNow || r.removedAt < limit) {
        const n = purgeGuild(r.id);
        purged.push({ id: r.id, name: r.name, purgedAt: Date.now(), entries: n });
        console.log(`🧹 [Daten] Daten von ${r.name || r.id} gelöscht (${n} Einträge).`);
      } else {
        keep.push(r);
      }
    }
    if (keep.length !== removed.length) {
      access.removed = keep;
      access.purged = purged.slice(-50);
      fs.writeFileSync(ACCESS_FILE + ".tmp", JSON.stringify(access, null, 2), "utf-8");
      fs.renameSync(ACCESS_FILE + ".tmp", ACCESS_FILE);
    }
  } catch (e) {
    console.error("[Daten] Aufräumen entfernter Server fehlgeschlagen:", e);
  }
}
