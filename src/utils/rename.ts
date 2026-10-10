import { GuildChannel } from "discord.js";

/**
 * Kanal umbenennen, ohne dass die Interaktion abläuft.
 * Discord erlaubt nur 2 Umbenennungen pro Kanal in 10 Minuten - danach wartet discord.js still,
 * und der Nutzer sähe "Interaktion fehlgeschlagen". Hier wird nach kurzer Zeit geantwortet,
 * die Umbenennung läuft im Hintergrund weiter und wird gesetzt, sobald Discord es erlaubt.
 *
 * @returns "done" wenn sofort umbenannt, "queued" wenn das Discord-Limit greift
 */
export async function renameSafely(channel: GuildChannel, name: string): Promise<"done" | "queued"> {
  const rename = channel.setName(name).then(() => "done" as const);
  rename.catch((e) => console.error(`[Rename] Konnte ${channel.id} nicht umbenennen:`, e?.message || e));
  const timeout = new Promise<"queued">((resolve) => setTimeout(() => resolve("queued"), 2500));
  return Promise.race([rename, timeout]).catch(() => "queued" as const);
}

export const RENAME_LIMIT_HINT =
  "⏳ Discord erlaubt nur **2 Umbenennungen pro 10 Minuten**. Der neue Name wird automatisch gesetzt, sobald das Limit vorbei ist.";
