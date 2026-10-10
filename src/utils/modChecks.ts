import { ChatInputCommandInteraction, GuildMember } from "discord.js";

/**
 * Darf der ausführende Moderator dieses Mitglied bestrafen?
 * Discord prüft bei bannable/kickable/moderatable nur den Rang des BOTS - nicht den des Moderators.
 * Ohne diese Prüfung könnte ein Moderator z. B. einen Admin bannen, der über ihm steht.
 *
 * @returns Fehlermeldung oder null, wenn alles in Ordnung ist
 */
export async function checkModeration(interaction: ChatInputCommandInteraction, target: GuildMember | null): Promise<string | null> {
  if (!interaction.guild) return "Nur auf einem Server möglich.";
  if (!target) return null; // z. B. Bann eines Nutzers, der nicht (mehr) auf dem Server ist

  if (target.id === interaction.user.id) return "Du kannst dich nicht selbst bestrafen.";
  if (target.id === interaction.guild.ownerId) return "Der Server-Owner kann nicht bestraft werden.";
  if (target.id === interaction.client.user.id) return "Ich kann mich nicht selbst bestrafen.";

  if (interaction.user.id === interaction.guild.ownerId) return null;
  const moderator = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!moderator) return "Dein Mitgliedsprofil konnte nicht geladen werden.";
  if (target.roles.highest.position >= moderator.roles.highest.position) {
    return "Dieses Mitglied hat eine gleich hohe oder höhere Rolle als du.";
  }
  return null;
}
