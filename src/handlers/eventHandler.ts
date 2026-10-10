import fs from "fs";
import path from "path";
import { BotClient } from "../client/BotClient";
import { BotEvent } from "../types";

export async function loadEvents(client: BotClient, eventsPath: string = path.join(__dirname, "../events")) {
  if (!fs.existsSync(eventsPath)) {
    return;
  }

  const files = fs.readdirSync(eventsPath).filter((file) => 
    (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts")
  );

  for (const file of files) {
    const fullPath = path.join(eventsPath, file);
    try {
      const eventModule = await import(fullPath);
      const event: BotEvent = eventModule.default || eventModule;

      if (event && event.name && typeof event.execute === "function") {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
          client.on(event.name, (...args) => event.execute(client, ...args));
        }
        console.log(`[Event Loader] Event registriert: ${event.name} (${file})`);
      } else {
        console.warn(`[Event Loader] Ungültige Event-Struktur in Datei: ${file}`);
      }
    } catch (error) {
      console.error(`[Event Loader] Fehler beim Laden von ${file}:`, error);
    }
  }
}
