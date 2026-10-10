import { BotClient } from "./client/BotClient";
import { env, validateEnv } from "./config/env";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";

async function bootstrap() {
  console.log("⚡ Initialisiere Discord-Bot...");

  if (!validateEnv()) {
    console.error("❌ Bitte fülle die .env Datei aus, bevor du den Bot startest!");
    console.log("ℹ️ Benötigte Werte: DISCORD_TOKEN und CLIENT_ID");
    process.exit(1);
  }

  const client = new BotClient();
  client.on("error", (e) => console.error("⚠️ Discord-Client-Fehler:", e));
  client.on("shardError", (e) => console.error("⚠️ Verbindungsfehler zum Discord-Gateway:", e));

  try {
    console.log("📦 Lade Befehle und Events...");
    await loadCommands(client);
    await loadEvents(client);

    console.log("🔑 Verbinde mit dem Discord Gateway...");
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    console.error("❌ Fataler Fehler beim Starten des Bots:", error);
    process.exit(1);
  }
}

// Unerwartete Fehler loggen statt den ganzen Bot abstürzen zu lassen
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unbehandelter Promise-Fehler:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("⚠️ Unbehandelter Fehler:", error);
});

bootstrap();
