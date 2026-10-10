import { User, GuildMember, BaseMessageOptions } from "discord.js";

/**
 * Sendet eine Direktnachricht an einen Benutzer und fängt Fehler (z. B. geschlossene DMs) sicher ab.
 */
export async function sendDirectMessage(
  target: User | GuildMember,
  content: string | BaseMessageOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = "user" in target ? target.user : target;

    // Keine DMs an Bots senden
    if (user.bot) {
      return { success: false, error: "Empfänger ist ein Bot" };
    }

    await user.send(content);
    return { success: true };
  } catch (error: any) {
    if (error.code === 50007) {
      return {
        success: false,
        error: "Der Benutzer hat Direktnachrichten deaktiviert oder den Bot blockiert.",
      };
    }
    return {
      success: false,
      error: error.message || "Unbekannter Fehler beim Senden der Direktnachricht.",
    };
  }
}
