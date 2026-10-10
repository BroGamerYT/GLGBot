import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { BotClient } from "../client/BotClient";
import { Command } from "../types";

export async function loadCommands(client: BotClient, commandsPath: string = path.join(__dirname, "../commands")) {
  if (!fs.existsSync(commandsPath)) {
    return;
  }

  const entries = fs.readdirSync(commandsPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(commandsPath, entry.name);

    if (entry.isDirectory()) {
      await loadCommands(client, fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) && !entry.name.endsWith(".d.ts")) {
      try {
        let commandModule: any;
        try {
          commandModule = require(fullPath);
        } catch {
          commandModule = await import(pathToFileURL(fullPath).href);
        }

        const command: Command = commandModule.default || commandModule;

        if (command && command.data && typeof command.execute === "function") {
          client.commands.set(command.data.name, command);
          console.log(`[Command Loader] Befehl registriert: /${command.data.name}`);
        } else {
          console.warn(`[Command Loader] Ungültige Befehlsstruktur in Datei: ${entry.name}`);
        }
      } catch (error) {
        console.error(`[Command Loader] Fehler beim Laden von ${entry.name}:`, error);
      }
    }
  }
}
