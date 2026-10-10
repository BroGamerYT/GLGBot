import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { env, validateEnv } from "./config/env";
import { Command } from "./types";

async function deploy() {
  if (!validateEnv()) {
    console.error("❌ Bitte trage DISCORD_TOKEN und CLIENT_ID in deiner .env Datei ein.");
    process.exit(1);
  }

  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  const commandsPath = path.join(__dirname, "commands");

  async function collectCommands(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await collectCommands(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
        !entry.name.endsWith(".d.ts")
      ) {
        const fileUrl = pathToFileURL(fullPath).href;
        const mod = await import(fileUrl);
        const command: Command = mod.default || mod;
        if (command && command.data) {
          commands.push(command.data.toJSON());
        }
      }
    }
  }

  await collectCommands(commandsPath);

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  try {
    console.log(`🚀 Starte Registrierung von ${commands.length} Slash-Befehl(en)...`);

    if (env.GUILD_ID && env.GUILD_ID.trim().length > 0) {
      await rest.put(
        Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Slash-Befehle erfolgreich für Test-Guild (${env.GUILD_ID}) registriert!`);
    } else {
      await rest.put(
        Routes.applicationCommands(env.CLIENT_ID),
        { body: commands }
      );
      console.log("✅ Slash-Befehle erfolgreich global registriert (kann bis zu 1 Std. dauern).");
    }
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Slash-Befehle:", error);
  }
}

deploy();
