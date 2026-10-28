import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * JSON sicher lesen: Ist die Datei beschädigt (z. B. Absturz mitten im Schreiben),
 * wird sie als *.corrupt-<Zeit>.json gesichert, statt beim nächsten Speichern
 * mit leeren Daten überschrieben zu werden (sonst wären z. B. alle XP weg).
 */
export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch (e) {
    if (fs.existsSync(file)) {
      const backup = file.replace(/\.json$/, "") + `.corrupt-${Date.now()}.json`;
      try {
        fs.copyFileSync(file, backup);
        console.error(`⚠️ [Daten] ${file} ist beschädigt - Kopie gesichert unter ${backup}`);
      } catch {
        /* ignorieren */
      }
    }
    return fallback;
  }
}

/** JSON atomar schreiben: erst eindeutige Temp-Datei, dann umbenennen -> kein Dateikonflikt, keine halb geschriebene Datei. */
export function writeJsonAtomic(file: string, data: unknown) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const rand = crypto.randomBytes(4).toString("hex");
  const tmp = `${file}.${process.pid}.${Date.now()}.${rand}.tmp`;

  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    try {
      fs.renameSync(tmp, file);
    } catch (renameErr: any) {
      if (process.platform === "win32" && (renameErr.code === "EPERM" || renameErr.code === "EBUSY")) {
        fs.copyFileSync(tmp, file);
        try { fs.unlinkSync(tmp); } catch {}
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    if (fs.existsSync(tmp)) {
      try { fs.unlinkSync(tmp); } catch {}
    }
    throw err;
  }
}
