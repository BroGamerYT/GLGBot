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
    .setDescription("Verwalte Twitch- & YouTube-Streamer Benachrichtigungen (wie bei Streamcord)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Fügt einen Streamer zur Benachrichtigungsliste hinzu (Twitch oder YouTube)")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Kanalname oder Handle (z. B. floslist oder @BroGamerYT)")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("In welchen Discord-Kanal soll der Live-Alert gepostet werden?")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("plattform")
            .setDescription("Streaming-Plattform auswählen (Standard: Twitch)")
            .setRequired(false)
            .addChoices(
              { name: "Twitch", value: "twitch" },
              { name: "YouTube", value: "youtube" }
            )
        )
        .addRoleOption((opt) =>
          opt
            .setName("ping_rolle")
            .setDescription("Rolle, die beim Stream-Start gepingt werden soll (z. B. @Live-Alerts)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("custom_text")
            .setDescription("Eigener Benachrichtigungstext (z. B. '{streamer} ist live mit {game}! {url}')")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Bearbeitet eine bestehende Streamer-Benachrichtigung (Name, Text, Rolle, Kanal)")
        .addStringOption((opt) =>
          opt
            .setName("streamer")
            .setDescription("Aktueller Kanalname des Streamers (z. B. floslist)")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("neuer_name")
            .setDescription("Neuer Kanalname / Handle (falls du den Kanal tauschen möchtest)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("anzeigename")
            .setDescription("Benutzerdefinierter Anzeigename (z. B. 'Floslist Gaming')")
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Neuer Ziel-Kanal für die Benachrichtigungen")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("plattform")
            .setDescription("Plattform anpassen (Twitch oder YouTube)")
            .setRequired(false)
            .addChoices(
              { name: "Twitch", value: "twitch" },
              { name: "YouTube", value: "youtube" }
            )
        )
        .addRoleOption((opt) =>
          opt
            .setName("ping_rolle")
            .setDescription("Rolle, die beim Live-Start gepingt werden soll")
            .setRequired(false)
        )
        .addUserOption((opt) =>
          opt
            .setName("discord_nutzer")
            .setDescription("Verknüpftes Discord-Mitglied")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("custom_text")
            .setDescription("Eigener Benachrichtigungstext mit {streamer}, {game}, {url}, {title}")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Entfernt einen Streamer aus der Benachrichtigungsliste")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Der Kanalname des Streamers zum Entfernen")
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
      const channelInput = interaction.options.getString("name", true);
      const channel = interaction.options.getChannel("kanal", true);
      const platformChoice = (interaction.options.getString("plattform") || "twitch") as "twitch" | "youtube";
      const pingRole = interaction.options.getRole("ping_rolle");
      const discordUser = interaction.options.getUser("discord_nutzer");
      const customText = interaction.options.getString("custom_text");

      const result = await streamNotificationService.addOrUpdateNotification({
        guildId: interaction.guild.id,
        platform: platformChoice,
        channelName: channelInput,
        discordChannelId: channel.id,
        pingRoleId: pingRole ? pingRole.id : undefined,
        linkedDiscordUserId: discordUser ? discordUser.id : undefined,
        customMessage: customText || undefined,
      });

      if (!result.success || !result.notification) {
        await interaction.editReply({
          content: `❌ ${result.message || "Fehler beim Hinzufügen des Streamers."}`,
        });
        return;
      }

      const notif = result.notification;
      const isYt = notif.platform === "youtube";
      const streamUrl = isYt 
        ? `https://youtube.com/${notif.channelName.startsWith("@") ? notif.channelName : "@" + notif.channelName}` 
        : `https://twitch.tv/${notif.channelName}`;

      const embed = new EmbedBuilder()
        .setColor(isYt ? 0xff0000 : 0x9146ff)
        .setTitle(`✅ ${isYt ? "YouTube" : "Twitch"}-Benachrichtigung eingerichtet!`)
        .setThumbnail(notif.profileImageUrl || null)
        .setDescription(`Sobald **${notif.displayName}** auf ${isYt ? "YouTube" : "Twitch"} live geht, postet der Bot automatisch einen Alert!`)
        .addFields(
          { name: "📺 Kanal", value: `[${notif.displayName}](${streamUrl})`, inline: true },
          { name: "📢 Ziel-Kanal", value: `<#${notif.discordChannelId}>`, inline: true },
          { name: "🔔 Ping-Rolle", value: notif.pingRoleId ? `<@&${notif.pingRoleId}>` : "*Keine*", inline: true },
          { name: "👤 Verknüpfter Discord-Nutzer", value: notif.linkedDiscordUserId ? `<@${notif.linkedDiscordUserId}>` : "*Keiner*", inline: true },
          { name: "💬 Eigener Text", value: notif.customMessage ? `\`${notif.customMessage}\`` : "*Standard-Nachricht*", inline: false },
          { name: "🔴 Aktueller Status", value: notif.isLive ? `**LIVE auf ${isYt ? "YouTube" : "Twitch"}!**` : "Offline", inline: true }
        )
        .setFooter({ text: "GLGBot Live-Streamer Suite" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "edit") {
      await interaction.deferReply();
      const currentName = interaction.options.getString("streamer", true);
      const list = streamNotificationService.getByGuild(interaction.guild.id);
      const existing = list.find(
        (n) => n.channelName.toLowerCase() === currentName.trim().toLowerCase() || 
               n.displayName?.toLowerCase() === currentName.trim().toLowerCase() ||
               n.id === currentName.trim()
      );

      if (!existing) {
        await interaction.editReply({
          content: `❌ Kein Streamer mit dem Namen **${currentName}** gefunden. Nutze \`/streamer list\` für alle Streamer.`,
        });
        return;
      }

      const neuerName = interaction.options.getString("neuer_name");
      const anzeigename = interaction.options.getString("anzeigename");
      const newChannel = interaction.options.getChannel("kanal");
      const newPlatform = interaction.options.getString("plattform") as "twitch" | "youtube" | null;
      const newPingRole = interaction.options.getRole("ping_rolle");
      const newDiscordUser = interaction.options.getUser("discord_nutzer");
      const newCustomText = interaction.options.getString("custom_text");

      const result = await streamNotificationService.addOrUpdateNotification({
        id: existing.id,
        guildId: interaction.guild.id,
        platform: (newPlatform || existing.platform) as "twitch" | "youtube",
        channelName: neuerName ? neuerName.trim() : existing.channelName,
        displayName: anzeigename ? anzeigename.trim() : (neuerName ? undefined : existing.displayName),
        discordChannelId: newChannel ? newChannel.id : existing.discordChannelId,
        pingRoleId: newPingRole ? newPingRole.id : existing.pingRoleId,
        linkedDiscordUserId: newDiscordUser ? newDiscordUser.id : existing.linkedDiscordUserId,
        customMessage: newCustomText !== null ? (newCustomText.trim().length > 0 ? newCustomText.trim() : undefined) : existing.customMessage,
      });

      if (!result.success || !result.notification) {
        await interaction.editReply({
          content: `❌ ${result.message || "Fehler beim Aktualisieren des Streamers."}`,
        });
        return;
      }

      const notif = result.notification;
      const isYt = notif.platform === "youtube";
      const streamUrl = isYt 
        ? `https://youtube.com/${notif.channelName.startsWith("@") ? notif.channelName : "@" + notif.channelName}` 
        : `https://twitch.tv/${notif.channelName}`;

      const embed = new EmbedBuilder()
        .setColor(isYt ? 0xff0000 : 0x9146ff)
        .setTitle(`✏️ ${isYt ? "YouTube" : "Twitch"}-Benachrichtigung erfolgreich geändert!`)
        .setThumbnail(notif.profileImageUrl || null)
        .setDescription(`Die Einstellungen für **${notif.displayName}** wurden aktualisiert:`)
        .addFields(
          { name: "📺 Kanal / Streamer", value: `[${notif.displayName}](${streamUrl})`, inline: true },
          { name: "📢 Ziel-Kanal", value: `<#${notif.discordChannelId}>`, inline: true },
          { name: "🔔 Ping-Rolle", value: notif.pingRoleId ? `<@&${notif.pingRoleId}>` : "*Keine*", inline: true },
          { name: "👤 Verknüpfter Nutzer", value: notif.linkedDiscordUserId ? `<@${notif.linkedDiscordUserId}>` : "*Keiner*", inline: true },
          { name: "💬 Eigener Text", value: notif.customMessage ? `\`${notif.customMessage}\`` : "*Standard-Nachricht*", inline: false }
        )
        .setFooter({ text: "GLGBot Live-Streamer Suite" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "remove") {
      const name = interaction.options.getString("name", true);
      const removed = streamNotificationService.removeNotification(interaction.guild.id, name);

      if (removed) {
        await interaction.reply({
          content: `✅ Die Benachrichtigung für Streamer **${name}** wurde gelöscht.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `❌ Kein Streamer mit dem Namen **${name}** gefunden.`,
          ephemeral: true,
        });
      }
      return;
    }

    if (sub === "list") {
      const list = streamNotificationService.getByGuild(interaction.guild.id);
      if (list.length === 0) {
        await interaction.reply({
          content: "ℹ️ Es sind aktuell keine Streamer eingerichtet. Füge welche mit `/streamer add` oder über das Web-Dashboard hinzu!",
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
        const isYt = notif.platform === "youtube";
        const status = notif.isLive ? `🔴 **LIVE (${isYt ? "YT" : "Twitch"})**` : `⚪ Offline (${isYt ? "YT" : "Twitch"})`;
        const ping = notif.pingRoleId ? `<@&${notif.pingRoleId}>` : "Kein Ping";
        const linked = notif.linkedDiscordUserId ? ` | 👤 <@${notif.linkedDiscordUserId}>` : "";
        const url = isYt ? `https://youtube.com/${notif.channelName}` : `https://twitch.tv/${notif.channelName}`;

        embed.addFields({
          name: `${notif.displayName || notif.channelName} (${status})`,
          value: `• Kanal: <#${notif.discordChannelId}>\n• Ping: ${ping}${linked}\n• Link: [Link](${url})`,
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
        content: "✅ Alle eingerichteten Streamer (Twitch & YouTube) wurden erfolgreich auf ihren Live-Status geprüft!",
      });
      return;
    }
  },
};

export default streamerCommand;
