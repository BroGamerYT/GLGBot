import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder 
} from "discord.js";
import { Command } from "../../types";
import { rolePanelService } from "../../services/rolePanelService";

const setupRolesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-roles")
    .setDescription("Konfiguriert die Verifikations- (Gast) und Benachrichtigungs-Rollen (bn.live, bn.free).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Richtet die Rollen und Kanäle ein.")
        .addRoleOption((opt) =>
          opt
            .setName("gast_rolle")
            .setDescription("Die Rolle, die neue Mitglieder nach dem Lesen der Regeln erhalten (@Gast).")
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName("stream_rolle")
            .setDescription("Rolle für Live-Stream Benachrichtigungen (bn.live).")
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName("freegames_rolle")
            .setDescription("Rolle für Free-Games Benachrichtigungen (bn.free).")
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("freegames_kanal")
            .setDescription("Textkanal für automatische Gratis-Spiele Benachrichtigungen (#free-games).")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Sendet das interaktive Verifikations- und Benachrichtigungs-Panel in einen Textkanal.")
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Der Kanal, in den das Panel gesendet werden soll (z. B. #regeln oder #rollen).")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("auto")
        .setDescription("Erstellt und weist fehlende Rollen (@Gast, bn.live, bn.free, Live) & Kanäle automatisch zu!")
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt die aktuelle Rollen- und Benachrichtigungskonfiguration an.")
    ),

  execute: async (interaction) => {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server ausgeführt werden.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const current = rolePanelService.getConfig(interaction.guildId) || {};
      const rulesRole = interaction.options.getRole("gast_rolle", false);
      const streamRole = interaction.options.getRole("stream_rolle", false);
      const freeRole = interaction.options.getRole("freegames_rolle", false);
      const freeChannel = interaction.options.getChannel("freegames_kanal", false);

      rolePanelService.setConfig(
        interaction.guildId,
        rulesRole ? rulesRole.id : current.rulesRoleId,
        streamRole ? streamRole.id : current.streamAlertRoleId,
        freeRole ? freeRole.id : current.freeGamesRoleId,
        freeChannel ? freeChannel.id : current.freeGamesChannelId
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Berechtigungs- & Benachrichtigungs-Rollen gespeichert!")
        .setDescription("Die Rollen-Konfiguration wurde erfolgreich aktualisiert.")
        .addFields(
          { name: "📜 Gast-Rolle (Regeln)", value: rulesRole ? `<@&${rulesRole.id}>` : (current.rulesRoleId ? `<@&${current.rulesRoleId}>` : "*Nicht gesetzt*"), inline: true },
          { name: "🔴 Stream-Alerts (bn.live)", value: streamRole ? `<@&${streamRole.id}>` : (current.streamAlertRoleId ? `<@&${current.streamAlertRoleId}>` : "*Nicht gesetzt*"), inline: true },
          { name: "🎮 Free-Games (bn.free)", value: freeRole ? `<@&${freeRole.id}>` : (current.freeGamesRoleId ? `<@&${current.freeGamesRoleId}>` : "*Nicht gesetzt*"), inline: true },
          { name: "🎁 Free-Games Kanal", value: freeChannel ? `<#${freeChannel.id}>` : (current.freeGamesChannelId ? `<#${current.freeGamesChannelId}>` : "*Nicht gesetzt*"), inline: true }
        )
        .setFooter({ text: "Nutze '/setup-roles panel', um das Auswahl-Panel zu posten!" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "panel") {
      const channel = interaction.options.getChannel("kanal", true);
      const targetChannel = interaction.guild.channels.cache.get(channel.id);

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({ content: "❌ Ungültiger Textkanal ausgewählt.", ephemeral: true });
        return;
      }

      const embed = rolePanelService.createPanelEmbed();
      const components = rolePanelService.createPanelComponents();

      await (targetChannel as any).send({
        embeds: [embed],
        components,
      });

      await interaction.reply({
        content: `✅ Das Berechtigungs- & Benachrichtigungs-Panel wurde erfolgreich in <#${channel.id}> gepostet!`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "auto") {
      await interaction.deferReply();
      const result = await rolePanelService.ensureAndAutoSetupRoles(interaction.guild);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("⚡ Rollen & Kanäle automatisch eingerichtet!")
        .setDescription("Alle für den Bot benötigten Rollen und Kanäle wurden geprüft, bei Bedarf neu erstellt und automatisch zugewiesen:")
        .addFields(
          { 
            name: "📜 Gast-Rolle (Regeln)", 
            value: `<@&${result.guestRole.id}> ${result.guestRole.created ? "*(Neu erstellt)*" : "*(Vorhanden & Verknüpft)*"}`, 
            inline: false 
          },
          { 
            name: "🔴 Live-Stream Alerts (bn.live)", 
            value: `<@&${result.streamAlertRole.id}> ${result.streamAlertRole.created ? "*(Neu erstellt)*" : "*(Vorhanden & Verknüpft)*"}`, 
            inline: false 
          },
          { 
            name: "🎮 Free-Games Alerts (bn.free)", 
            value: `<@&${result.freeGamesRole.id}> ${result.freeGamesRole.created ? "*(Neu erstellt)*" : "*(Vorhanden & Verknüpft)*"}`, 
            inline: false 
          },
          { 
            name: "🔴 Live-Streamer Rolle (@Live)", 
            value: `<@&${result.liveRole.id}> ${result.liveRole.created ? "*(Neu erstellt)*" : "*(Vorhanden & Verknüpft)*"}`, 
            inline: false 
          },
          { 
            name: "🎁 Free-Games Kanal", 
            value: `<#${result.freeGamesChannel.id}> ${result.freeGamesChannel.created ? "*(Neu erstellt)*" : "*(Vorhanden & Verknüpft)*"}`, 
            inline: false 
          }
        )
        .setFooter({ text: "Tipp: Nutze '/setup-roles panel', um das Rollen-Auswahl-Panel im Regel- oder Rollenkanal zu posten!" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "status") {
      const cfg = rolePanelService.getConfig(interaction.guildId);

      if (!cfg) {
        await interaction.reply({
          content: "ℹ️ Auf diesem Server sind noch keine Rollen konfiguriert. Nutze `/setup-roles set`.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🛡️ Aktuelle Rollen- & Berechtigungskonfiguration")
        .addFields(
          { name: "📜 Gast-Rolle (Regeln)", value: cfg.rulesRoleId ? `<@&${cfg.rulesRoleId}>` : "*Nicht gesetzt*", inline: true },
          { name: "🔴 Stream-Alerts (bn.live)", value: cfg.streamAlertRoleId ? `<@&${cfg.streamAlertRoleId}>` : "*Nicht gesetzt*", inline: true },
          { name: "🎮 Free-Games (bn.free)", value: cfg.freeGamesRoleId ? `<@&${cfg.freeGamesRoleId}>` : "*Nicht gesetzt*", inline: true },
          { name: "🎁 Free-Games Kanal", value: cfg.freeGamesChannelId ? `<#${cfg.freeGamesChannelId}>` : "*Nicht gesetzt*", inline: true }
        )
        .setFooter({ text: "GLGBot Rollen-System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default setupRolesCommand;
