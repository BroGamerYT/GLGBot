import fs from "fs";

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

/** JSON atomar schreiben: erst Temp-Datei, dann umbenennen -> die Datei ist nie halb geschrieben. */
export function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}
