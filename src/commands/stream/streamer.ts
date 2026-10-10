import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ChannelType
} from "discord.js";
import { Command } from "../../types";
import { streamNotificationService } from "../../services/streamNotificationService";

const streamerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("streamer")
    .setDescription("Verwalte Twitch-Streamer Benachrichtigungen (wie bei Streamcord)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Fügt einen Twitch-Streamer zur Benachrichtigungsliste hinzu")
        .addStringOption((opt) =>
          opt
            .setName("twitch_name")
            .setDescription("Der Twitch-Kanalname des Streamers (z. B. derbrogameryt)")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("In welchen Discord-Kanal soll der Live-Alert gepostet werden?")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("ping_rolle")
            .setDescription("Rolle, die beim Stream-Start gepingt werden soll (z. B. @Live-Alerts)")
            .setRequired(false)
        )
        .addUserOption((opt) =>
          opt
            .setName("discord_nutzer")
            .setDescription("Discord-Mitglied verknüpfen (bekommt @Live-Rolle und Live-Voice-Raum)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Entfernt einen Twitch-Streamer aus der Benachrichtigungsliste")
        .addStringOption((opt) =>
          opt
            .setName("twitch_name")
            .setDescription("Der Twitch-Kanalname zum Entfernen")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Listet alle aktuell eingerichteten Streamer-Benachrichtigungen auf")
    )
    .addSubcommand((sub) =>
      sub
        .setName("check")
        .setDescription("Prüft alle eingerichteten Streamer sofort auf ihren aktuellen Live-Status")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Dieser Befehl kann nur auf einem Server genutzt werden.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      await interaction.deferReply();
      const twitchName = interaction.options.getString("twitch_name", true);
      const channel = interaction.options.getChannel("kanal", true);
      const pingRole = interaction.options.getRole("ping_rolle");
      const discordUser = interaction.options.getUser("discord_nutzer");

      const result = await streamNotificationService.addOrUpdateNotification({
        guildId: interaction.guild.id,
        channelName: twitchName,
        discordChannelId: channel.id,
        pingRoleId: pingRole ? pingRole.id : undefined,
        linkedDiscordUserId: discordUser ? discordUser.id : undefined,
      });

      if (!result.success || !result.notification) {
        await interaction.editReply({
          content: `❌ ${result.message || "Fehler beim Hinzufügen des Streamers."}`,
        });
        return;
      }

      const notif = result.notification;
      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle(`✅ Streamer-Benachrichtigung eingerichtet!`)
        .setThumbnail(notif.profileImageUrl || null)
        .setDescription(`Sobald **${notif.displayName}** auf Twitch live geht, postet der Bot automatisch einen Alert!`)
        .addFields(
          { name: "📺 Twitch-Kanal", value: `[${notif.displayName}](https://twitch.tv/${notif.channelName})`, inline: true },
          { name: "📢 Ziel-Kanal", value: `<#${notif.discordChannelId}>`, inline: true },
          { name: "🔔 Ping-Rolle", value: notif.pingRoleId ? `<@&${notif.pingRoleId}>` : "*Keine*", inline: true },
          { name: "👤 Verknüpfter Discord-Nutzer", value: notif.linkedDiscordUserId ? `<@${notif.linkedDiscordUserId}>` : "*Keiner*", inline: true },
          { name: "🔴 Aktueller Status", value: notif.isLive ? "**LIVE auf Twitch!**" : "Offline", inline: true }
        )
        .setFooter({ text: "GLGBot Live-Streamer Suite" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "remove") {
      const twitchName = interaction.options.getString("twitch_name", true);
      const removed = streamNotificationService.removeNotification(interaction.guild.id, twitchName);

      if (removed) {
        await interaction.reply({
          content: `✅ Die Benachrichtigung für Twitch-Streamer **${twitchName}** wurde gelöscht.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `❌ Kein Streamer mit dem Namen **${twitchName}** gefunden.`,
          ephemeral: true,
        });
      }
      return;
    }

    if (sub === "list") {
      const list = streamNotificationService.getByGuild(interaction.guild.id);
      if (list.length === 0) {
        await interaction.reply({
          content: "ℹ️ Es sind aktuell keine Twitch-Streamer eingerichtet. Füge welche mit `/streamer add` oder über das Web-Dashboard hinzu!",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle(`📺 Eingerichtete Streamer-Benachrichtigungen (${list.length})`)
        .setDescription(`Hier sind alle Streamer, die automatisch überwacht werden:`)
        .setFooter({ text: "GLGBot Live-Streamer Suite | https://glgbot.brogameryt.de/live" })
        .setTimestamp();

      for (const notif of list) {
        const status = notif.isLive ? "🔴 **LIVE**" : "⚪ Offline";
        const ping = notif.pingRoleId ? `<@&${notif.pingRoleId}>` : "Kein Ping";
        const linked = notif.linkedDiscordUserId ? ` | 👤 <@${notif.linkedDiscordUserId}>` : "";
        embed.addFields({
          name: `${notif.displayName || notif.channelName} (${status})`,
          value: `• Kanal: <#${notif.discordChannelId}>\n• Ping: ${ping}${linked}\n• Link: [twitch.tv/${notif.channelName}](https://twitch.tv/${notif.channelName})`,
          inline: true,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "check") {
      await interaction.deferReply({ ephemeral: true });
      await streamNotificationService.checkAllStreams();
      await interaction.editReply({
        content: "✅ Alle eingerichteten Streamer wurden erfolgreich auf ihren Live-Status geprüft!",
      });
      return;
    }
  },
};

export default streamerCommand;
