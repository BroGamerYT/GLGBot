import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { rulesService } from "../../services/rulesService";
import { rolePanelService } from "../../services/rolePanelService";

const setupRulesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-rules")
    .setDescription("Regelkanal, Berechtigungskanal & Regel-Sperre einrichten.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName("post").setDescription("Erstellt #regeln & #berechtigungen (falls nötig) und postet die Nachrichten neu.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("lock")
        .setDescription("Nur wer die Regeln akzeptiert hat, sieht den Server. Bestehende Mitglieder bekommen die Gast-Rolle.")
        .addBooleanOption((opt) =>
          opt.setName("bestaetigen").setDescription("Ja, den Server jetzt sperren.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("unlock").setDescription("Hebt die Regel-Sperre wieder auf (alle sehen wieder alle Kanäle).")
    ),

  execute: async (interaction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();

    if (sub === "post") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { rules, perms } = await rulesService.setupChannels(guild);
        const locked = rolePanelService.getConfig(guild.id)?.serverLocked;
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("✅ Regel-System eingerichtet")
              .addFields(
                { name: "📜 Regelkanal", value: `${rules.channel} ${rules.created ? "*(neu erstellt)*" : "*(vorhanden)*"}`, inline: true },
                { name: "🔔 Berechtigungen", value: `${perms.channel} ${perms.created ? "*(neu erstellt)*" : "*(vorhanden)*"}`, inline: true }
              )
              .setDescription(
                locked
                  ? "Die Regel-Sperre ist aktiv: Neue Mitglieder sehen nur den Regelkanal."
                  : "⚠️ Die Regel-Sperre ist **noch nicht** aktiv. Mit `/setup-rules lock bestaetigen:True` sehen neue Mitglieder nur noch den Regelkanal, bis sie akzeptieren."
              ),
          ],
        });
      } catch (e: any) {
        await interaction.editReply({ content: `❌ ${e.message || "Fehler beim Einrichten."}` });
      }
      return;
    }

    if (sub === "lock") {
      if (!interaction.options.getBoolean("bestaetigen", true)) {
        await interaction.reply({ content: "ℹ️ Abgebrochen - nichts geändert.", ephemeral: true });
        return;
      }
      if (!rolePanelService.getConfig(guild.id)?.rulesChannelId) {
        await interaction.reply({ content: "❌ Bitte zuerst `/setup-rules post` ausführen, damit der Regelkanal existiert.", ephemeral: true });
        return;
      }
      const problem = rulesService.checkLockPrerequisites(guild);
      if (problem) {
        await interaction.reply({ content: `❌ ${problem}`, ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const { granted, adjusted } = await rulesService.lockServer(guild);
      await interaction.editReply({
        content:
          `🔒 **Regel-Sperre aktiv!** Neue Mitglieder sehen jetzt nur noch den Regelkanal.\n` +
          `• ${granted} bestehende Mitglieder haben die Gast-Rolle bekommen (niemand wurde ausgesperrt)\n` +
          `• ${adjusted} Kanäle mit eigener @everyone-Freigabe wurden auf die Gast-Rolle umgestellt\n\n` +
          `Rückgängig machen: \`/setup-rules unlock\``,
      });
      return;
    }

    if (sub === "unlock") {
      await interaction.deferReply({ ephemeral: true });
      await rulesService.unlockServer(guild);
      await interaction.editReply({ content: "🔓 Regel-Sperre aufgehoben - alle sehen wieder alle Kanäle." });
      return;
    }
  },
};

export default setupRulesCommand;
