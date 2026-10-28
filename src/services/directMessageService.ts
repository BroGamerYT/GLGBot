import {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction,
  Guild,
} from "discord.js";
import { BRANDING } from "../config/branding";
import { authCodeService } from "./authCodeService";
import { economyService } from "./economyService";
import { statsService } from "./statsService";
import { rulesService } from "./rulesService";

class DirectMessageService {
  /**
   * Wird aufgerufen, wenn ein Nutzer dem Bot eine Privatnachricht (DM) sendet.
   */
  public async handleMessage(message: Message, client: Client): Promise<void> {
    if (message.author.bot) return;

    // Alle gemeinsamen Server finden
    const userGuilds: Guild[] = [];
    for (const guild of client.guilds.cache.values()) {
      let member = guild.members.cache.get(message.author.id);
      if (!member) {
        member = await guild.members.fetch(message.author.id).catch(() => null) as any;
      }
      if (member) {
        userGuilds.push(guild);
      }
    }

    // Fall 0: Keine gemeinsamen Server
    if (userGuilds.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🤖 ${BRANDING.bot} Direktnachricht`)
        .setDescription(
          `Hallo **${message.author.username}**! 👋\n\n` +
          `Wir teilen aktuell leider keinen gemeinsamen Discord-Server. Lade mich auf deinen Server ein oder tritt unserer Community bei, um alle Features nutzen zu können!`
        )
        .setFooter({ text: BRANDING.community })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => null);
      return;
    }

    // Fall 1: Genau 1 Server -> Direkt Aktionen anzeigen
    if (userGuilds.length === 1) {
      await this.sendGuildActionMenu(message, userGuilds[0], false);
      return;
    }

    // Fall 2: MEHRERE Server -> Nachfrage stellen mit Server-Auswahl!
    await this.sendGuildSelectionMenu(message, userGuilds);
  }

  /**
   * Zeigt die Server-Auswahlliste an, wenn der Nutzer auf mehreren Servern ist.
   */
  private async sendGuildSelectionMenu(message: Message, guilds: Guild[]): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🌐 Server auswählen")
      .setDescription(
        `Hallo **${message.author.username}**! 👋\n\n` +
        `Du bist auf **${guilds.length} verschiedenen Servern** mit mir verbunden.\n` +
        `**Zu welchem Server möchtest du Infos oder Aktionen durchführen?**\n\n` +
        guilds.map((g, i) => `**${i + 1}.** ${g.name} *(${g.memberCount} Mitglieder)*`).join("\n")
      )
      .setFooter({ text: "Wähle deinen Server aus dem Dropdown-Menü unten:" })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("dm_select_server")
      .setPlaceholder("👉 Wähle einen Server aus...")
      .addOptions(
        guilds.slice(0, 25).map((g) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(g.name.slice(0, 50))
            .setValue(`dm_guild_${g.id}`)
            .setDescription(`${g.memberCount} Mitglieder`)
            .setEmoji("🌐")
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await message.reply({
      embeds: [embed],
      components: [row],
    }).catch(() => null);
  }

  /**
   * Zeigt das Aktionsmenü für einen bestimmten Server in der DM an.
   */
  public async sendGuildActionMenu(
    target: Message | StringSelectMenuInteraction | ButtonInteraction,
    guild: Guild,
    hasMultipleServers: boolean
  ): Promise<void> {
    const userId = "author" in target ? target.author.id : target.user.id;
    const member = guild.members.cache.get(userId) || (await guild.members.fetch(userId).catch(() => null));

    const balance = economyService.getBalance(guild.id, userId);
    const cfg = economyService.getConfig(guild.id);
    const profile = statsService.getUserProfile(guild.id, userId);
    const level = profile?.progress?.level || profile?.stats?.level || 1;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏰 ${guild.name}`)
      .setDescription(
        `Hier sind deine Daten und Aktionen für den Server **${guild.name}**:\n\n` +
        `🪙 **Guthaben:** \`${balance.toLocaleString("de-DE")} ${cfg.currencyName}\`\n` +
        `⭐ **Level:** \`Level ${level}\`\n` +
        `👥 **Server-Größe:** \`${guild.memberCount} Mitglieder\`\n\n` +
        `Wähle eine Aktion aus den Buttons unten:`
      )
      .setFooter({ text: `${BRANDING.community} • Server-ID: ${guild.id}` })
      .setTimestamp();

    if (guild.iconURL()) {
      embed.setThumbnail(guild.iconURL({ size: 128 }));
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dm_code_${guild.id}`)
        .setLabel("🔑 Login-Code generieren")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔑"),
      new ButtonBuilder()
        .setCustomId(`dm_rules_${guild.id}`)
        .setLabel("📜 Server-Regeln")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📜")
    );

    const dashboardUrl = (process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/+$/, "");
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Web-Dashboard öffnen")
        .setStyle(ButtonStyle.Link)
        .setURL(`${dashboardUrl}/economy`)
        .setEmoji("🛒")
    );

    if (hasMultipleServers) {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId("dm_btn_back_to_select")
          .setLabel("🔄 Anderen Server wählen")
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if ("reply" in target && typeof (target as any).update === "function") {
      await (target as any).update({
        embeds: [embed],
        components: [row, row2],
      }).catch(() => null);
    } else {
      await target.reply({
        embeds: [embed],
        components: [row, row2],
      }).catch(() => null);
    }
  }

  /**
   * Verarbeitet Button-Klicks und Menü-Auswahlen in Direktnachrichten.
   */
  public async handleInteraction(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    client: Client
  ): Promise<void> {
    const { customId, user } = interaction;

    // 1. Server-Auswahl über Select Menu
    if (interaction.isStringSelectMenu() && customId === "dm_select_server") {
      const selectedValue = interaction.values[0];
      const guildId = selectedValue.replace("dm_guild_", "");
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        await interaction.reply({ content: "❌ Server konnte nicht gefunden werden.", ephemeral: true }).catch(() => null);
        return;
      }

      await this.sendGuildActionMenu(interaction, guild, true);
      return;
    }

    // 2. Zurück zur Serverauswahl
    if (interaction.isButton() && customId === "dm_btn_back_to_select") {
      const userGuilds: Guild[] = [];
      for (const guild of client.guilds.cache.values()) {
        const member = guild.members.cache.get(user.id) || (await guild.members.fetch(user.id).catch(() => null));
        if (member) userGuilds.push(guild);
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🌐 Server auswählen")
        .setDescription(
          `Du bist auf **${userGuilds.length} Servern** mit mir verbunden.\n` +
          `Wähle den gewünschten Server aus dem Menü:`
        )
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("dm_select_server")
        .setPlaceholder("👉 Wähle einen Server aus...")
        .addOptions(
          userGuilds.slice(0, 25).map((g) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(g.name.slice(0, 50))
              .setValue(`dm_guild_${g.id}`)
              .setDescription(`${g.memberCount} Mitglieder`)
              .setEmoji("🌐")
          )
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.update({
        embeds: [embed],
        components: [row],
      }).catch(() => null);
      return;
    }

    // 3. Login-Code für bestimmten Server generieren
    if (interaction.isButton() && customId.startsWith("dm_code_")) {
      const guildId = customId.replace("dm_code_", "");
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        await interaction.reply({ content: "❌ Server nicht gefunden.", ephemeral: true }).catch(() => null);
        return;
      }

      const member = guild.members.cache.get(user.id) || (await guild.members.fetch(user.id).catch(() => null));
      if (!member) {
        await interaction.reply({ content: "❌ Du bist kein Mitglied auf diesem Server.", ephemeral: true }).catch(() => null);
        return;
      }

      const { code, expiresAt, loginUrl } = authCodeService.generateCode(guild, user, member);
      const minutesLeft = Math.round((expiresAt - Date.now()) / 60000);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`🔑 Dein Login-Code für ${guild.name}`)
        .setDescription(
          `Hier ist dein persönlicher Schnell-Login-Code für das Webinterface:\n\n` +
          `# \`${code}\`\n\n` +
          `⏳ **Gültigkeit:** ${minutesLeft} Minuten (Einmalige Nutzung)\n` +
          `🌐 **Server:** **${guild.name}**\n\n` +
          `Du kannst den Code auf der Webseite eingeben oder direkt auf den Button unten klicken:`
        )
        .setFooter({ text: "Gib diesen Code an niemanden weiter!" })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Direkt im Webinterface anmelden")
          .setStyle(ButtonStyle.Link)
          .setURL(loginUrl)
          .setEmoji("🚀")
      );

      await interaction.reply({ embeds: [embed], components: [row] }).catch(() => null);
      return;
    }

    // 4. Serverregeln anzeigen
    if (interaction.isButton() && customId.startsWith("dm_rules_")) {
      const guildId = customId.replace("dm_rules_", "");
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        await interaction.reply({ content: "❌ Server nicht gefunden.", ephemeral: true }).catch(() => null);
        return;
      }

      const rulesData = rulesService.getRules(guild.id);
      const serverRules = rulesData?.rules || [];

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(`📜 Regelwerk von ${guild.name}`)
        .setDescription(
          serverRules.length > 0
            ? serverRules
                .slice(0, 5)
                .map((r) => `**${r.emoji ? `${r.emoji} ` : ""}§ ${r.title}**\n${r.text}`)
                .join("\n\n")
            : "Für diesen Server sind noch keine individuellen Regeln hinterlegt."
        )
        .setFooter({ text: `${BRANDING.community} • Vollständige Regeln im Discord-Kanal #regeln` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] }).catch(() => null);
      return;
    }
  }
}

export const directMessageService = new DirectMessageService();
