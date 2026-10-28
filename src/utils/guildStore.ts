import fs from "fs";
import path from "path";
import { readJsonFile, writeJsonAtomic } from "./jsonFile";

/**
 * Einfacher Speicher "pro Server" in einer JSON-Datei unter data/:
 *   { "<guildId>": <Daten des Servers>, ... }
 * Schreibt atomar und legt den Ordner bei Bedarf an.
 */
export class GuildStore<T> {
  private file: string;
  private data: Record<string, T>;

  constructor(fileName: string, private readonly defaults: () => T) {
    this.file = path.join(process.cwd(), "data", fileName);
    this.data = readJsonFile<Record<string, T>>(this.file, {});
  }

  /** Daten eines Servers (mit Standardwerten ergänzt). */
  public get(guildId: string): T {
    const current = this.data[guildId];
    const base = this.defaults();
    if (!current) return base;
    return typeof base === "object" && base !== null && !Array.isArray(base) ? { ...base, ...current } : current;
  }

  public set(guildId: string, value: T) {
    this.data[guildId] = value;
    this.save();
  }

  public update(guildId: string, fn: (value: T) => T | void): T {
    const current = this.get(guildId);
    const next = (fn(current) as T | undefined) ?? current;
    this.set(guildId, next);
    return next;
  }

  public guildIds(): string[] {
    return Object.keys(this.data);
  }

  public save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    writeJsonAtomic(this.file, this.data);
  }
}
