import { Events, Interaction } from "discord.js";
import { BotEvent } from "../types";
import { 
  handleVoiceSelectMenu, 
  handleVoiceModalSubmit, 
  handleVoiceButton 
} from "../handlers/voicePanelHandler";

const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    // 1. Slash-Befehle
    if (interaction.isChatInputCommand()) {
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
      return;
    }

    // 2. Dropdown Menüs (Voice Panel)
    if (interaction.isStringSelectMenu()) {
      if (
        interaction.customId === "voice_settings_menu" ||
        interaction.customId === "voice_permissions_menu"
      ) {
        await handleVoiceSelectMenu(interaction);
      }
      return;
    }

    // 3. Modals (Texteingaben für Name & Limit)
    if (interaction.isModalSubmit()) {
      if (
        interaction.customId === "modal_voice_name" ||
        interaction.customId === "modal_voice_limit"
      ) {
        await handleVoiceModalSubmit(interaction);
      }
      return;
    }

    // 4. Buttons (Refresh / Info)
    if (interaction.isButton()) {
      if (interaction.customId === "voice_btn_refresh") {
        await handleVoiceButton(interaction);
      }
      return;
    }
  },
};

export default interactionCreateEvent;
