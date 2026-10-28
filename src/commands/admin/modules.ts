import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../types";
import { moduleService, BOT_MODULES, BotModuleId } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const moduleChoices = BOT_MODULES.map((m) => ({
  name: `${m.emoji} ${m.name}`,
  value: m.id,
}));

const modulesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("modules")
    .setDescription("Verwalte und aktiviere/deaktiviere die modularen Features des Bots.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt die Übersicht aller Module und deren Aktivierungsstatus an.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Aktiviert ein bestimmtes Modul auf diesem Server.")
        .addStringOption((opt) =>
          opt
            .setName("modul")
            .setDescription("Das Modul, das aktiviert werden soll.")
            .setRequired(true)
            .addChoices(...moduleChoices.slice(0, 25))
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert ein bestimmtes Modul auf diesem Server.")
        .addStringOption((opt) =>
          opt
            .setName("modul")
            .setDescription("Das Modul, das deaktiviert werden soll.")
            .setRequired(true)
            .addChoices(...moduleChoices.slice(0, 25))
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Schaltet ein bestimmtes Modul an oder aus.")
        .addStringOption((opt) =>
          opt
            .setName("modul")
            .setDescription("Das Modul, das umgeschaltet werden soll.")
            .setRequired(true)
            .addChoices(...moduleChoices.slice(0, 25))
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "status") {
      const list = moduleService.getModules(guildId);
      const activeCount = list.filter((m) => m.enabled).length;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🧩 Modul-Übersicht – ${interaction.guild.name}`)
        .setDescription(
          `Hier kannst du alle Features des Bots einzeln an- und ausschalten.\n` +
          `Aktuell sind **${activeCount} von ${list.length} Modulen aktiv**.\n\n` +
          list
            .map(
              (m) =>
                `${m.enabled ? "🟢" : "🔴"} **${m.emoji} ${m.name}**\n` +
                `└ *${m.description}*`
            )
            .join("\n\n")
        )
        .setFooter({ text: `${BRANDING.bot} • Befehle: /modules enable | disable | toggle` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const targetModuleId = interaction.options.getString("modul", true) as BotModuleId;
    const info = moduleService.getModuleById(targetModuleId);

    if (!info) {
      await interaction.reply({
        content: "❌ Unbekanntes Modul ausgewählt.",
        ephemeral: true,
      });
      return;
    }

    if (sub === "enable") {
      moduleService.enableModule(guildId, targetModuleId);
      await interaction.reply({
        content: `🟢 Das Modul **${info.emoji} ${info.name}** wurde **aktiviert**!`,
      });
      return;
    }

    if (sub === "disable") {
      moduleService.disableModule(guildId, targetModuleId);
      await interaction.reply({
        content: `🔴 Das Modul **${info.emoji} ${info.name}** wurde **deaktiviert**. Die zugehörigen Befehle und Funktionen sind nun pausiert.`,
      });
      return;
    }

    if (sub === "toggle") {
      const newState = moduleService.toggleModule(guildId, targetModuleId);
      await interaction.reply({
        content: `${newState ? "🟢" : "🔴"} Das Modul **${info.emoji} ${info.name}** ist nun **${newState ? "aktiviert" : "deaktiviert"}**.`,
      });
      return;
    }
  },
};

export default modulesCommand;
