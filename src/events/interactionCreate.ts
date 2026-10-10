import { Events, Interaction } from "discord.js";
import { BotEvent } from "../types";

const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[Command] Unbekannter Befehl aufgerufen: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`[Command Error] Fehler bei Ausführung von /${interaction.commandName}:`, error);

      const errorMessage = {
        content: "❌ Bei der Ausführung dieses Befehls ist ein interner Fehler aufgetreten.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => null);
      } else {
        await interaction.reply(errorMessage).catch(() => null);
      }
    }
  },
};

export default interactionCreateEvent;
