import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import { 
  ButtonInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  GuildMember,
  Guild,
  ChannelType
} from "discord.js";
import { liveStreamService } from "./liveStreamService";
import { prisonService } from "./prisonService";
import { BRANDING } from "../config/branding";

export interface RolePanelConfig {
  [guildId: string]: {
    rulesRoleId?: string;
    streamAlertRoleId?: string;
    freeGamesRoleId?: string;
    freeGamesChannelId?: string;
    gameNewsRoleId?: string;
    gameNewsChannelId?: string;
    driverNewsRoleId?: string;
    driverNewsChannelId?: string;
    rulesChannelId?: string;
    permissionsChannelId?: string;
    serverLocked?: boolean;
    headerMessages?: Record<string, string>; // Kanal-ID -> ID der Kopf-Nachricht (Banner)
  };
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "role_panel_config.json");

class RolePanelService {
  private config: RolePanelConfig = {};

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      }
    } catch (e) {
      this.config = {};
    }
  }

  public saveConfig() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(CONFIG_FILE, this.config);
    } catch (e) {
      console.error("[RolePanel] Fehler beim Speichern der Konfiguration:", e);
    }
  }

  public setConfig(
    guildId: string,
    rulesRoleId?: string,
    streamAlertRoleId?: string,
    freeGamesRoleId?: string,
    freeGamesChannelId?: string
  ) {
    this.loadConfig();
    this.config[guildId] = {
      ...this.config[guildId], // weitere Felder (Regel-/Berechtigungskanal) behalten
      rulesRoleId,
      streamAlertRoleId,
      freeGamesRoleId,
      freeGamesChannelId,
    };
    this.saveConfig();
  }

  /** Einzelne Felder ändern, ohne den Rest zu überschreiben. */
  public updateConfig(guildId: string, patch: Partial<RolePanelConfig[string]>) {
    this.loadConfig();
    this.config[guildId] = { ...this.config[guildId], ...patch };
    this.saveConfig();
  }

  public getConfig(guildId: string) {
    this.loadConfig();
    return this.config[guildId] || null;
  }

  // --- AUTOMATISCHES ERSTELLEN & ZUWEISEN FEHLENDER ROLLEN & KANÄLE ---
  public async ensureAndAutoSetupRoles(guild: Guild) {
    const roles = await guild.roles.fetch();
    const channels = await guild.channels.fetch();

    // 1. Gast-Rolle
    let guestRole = roles.find((r) => 
      r.name.toLowerCase() === "gast" || 
      r.name.toLowerCase() === "gäste" ||
      r.name.toLowerCase().includes("gast")
    );
    let guestCreated = false;
    if (!guestRole) {
      guestRole = await guild.roles.create({
        name: "Gast",
        color: 0x2ECC71, // Grün
        reason: "Automatisch erstellt von GLGBot (Regel-Bestätigung)",
      });
      guestCreated = true;
      console.log(`[RolePanel] Gast-Rolle neu erstellt: ${guestRole.name} (${guestRole.id})`);
    }

    // 2. Live-Stream Alert Rolle (bn.live)
    let streamAlertRole = roles.find((r) => 
      r.name.toLowerCase() === "bn.live" || 
      r.name.toLowerCase().includes("live-stream alert") ||
      r.name.toLowerCase().includes("stream alert")
    );
    let streamAlertCreated = false;
    if (!streamAlertRole) {
      streamAlertRole = await guild.roles.create({
        name: "🔴 Live-Stream Alerts (bn.live)",
        color: 0xE91E63, // Magenta
        mentionable: true,
        reason: "Automatisch erstellt von GLGBot (Live-Stream Alerts)",
      });
      streamAlertCreated = true;
      console.log(`[RolePanel] Stream-Alert Rolle neu erstellt: ${streamAlertRole.name} (${streamAlertRole.id})`);
    }

    // 3. Free-Games Alert Rolle (bn.free)
    let freeGamesRole = roles.find((r) => 
      r.name.toLowerCase() === "bn.free" || 
      r.name.toLowerCase().includes("free-game") ||
      r.name.toLowerCase().includes("free game")
    );
    let freeGamesCreated = false;
    if (!freeGamesRole) {
      freeGamesRole = await guild.roles.create({
        name: "🎮 Free-Games Alerts (bn.free)",
        color: 0x0078F2, // Epic Blau
        mentionable: true,
        reason: "Automatisch erstellt von GLGBot (Gratis-Spiele Alerts)",
      });
      freeGamesCreated = true;
      console.log(`[RolePanel] Free-Games Rolle neu erstellt: ${freeGamesRole.name} (${freeGamesRole.id})`);
    }

    // 4. Live-Streamer Rolle (@Live)
    let liveRole = roles.find((r) => 
      r.name.toLowerCase() === "live" || 
      r.name.toLowerCase() === "🔴 live"
    );
    let liveCreated = false;
    if (!liveRole) {
      liveRole = await guild.roles.create({
        name: "🔴 Live",
        color: 0x9146FF, // Twitch Lila
        mentionable: false,
        reason: "Automatisch erstellt von GLGBot (Live-Streamer Status)",
      });
      liveCreated = true;
      console.log(`[RolePanel] Live-Streamer Rolle neu erstellt: ${liveRole.name} (${liveRole.id})`);
    }

    // 5. Free-Games Textkanal (#free-games)
    let freeGamesChannel = channels.find((c) => 
      c && c.isTextBased() && (c.name.toLowerCase().includes("free-game") || c.name.toLowerCase().includes("gratis-spiel"))
    );
    let channelCreated = false;
    if (!freeGamesChannel) {
      freeGamesChannel = await guild.channels.create({
        name: "🎮・free-games",
        type: ChannelType.GuildText,
        topic: "Wöchentliche 100% kostenlose PC-Spiele & Giveaways | Benachrichtigungen mit @bn.free",
        reason: "Automatisch erstellt von GLGBot (Free-Games Alerts)",
      });
      channelCreated = true;
      console.log(`[RolePanel] Free-Games Textkanal neu erstellt: ${freeGamesChannel.name} (${freeGamesChannel.id})`);
    }

    // Berechtigungen für Free-Games Kanal absichern (Nur für bn.free sichtbar)
    try {
      await freeGamesChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false,
      });
      await freeGamesChannel.permissionOverwrites.edit(freeGamesRole, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false,
      });
    } catch (e) {
      console.warn("[RolePanel] Konnte Berechtigungen für Free-Games Kanal nicht aktualisieren:", e);
    }

    // 6. Konfigurationen speichern
    this.setConfig(
      guild.id,
      guestRole.id,
      streamAlertRole.id,
      freeGamesRole.id,
      freeGamesChannel.id
    );

    // Live-Stream System Konfiguration anpassen & Stream-Channel Berechtigungen absichern
    const existingLiveCfg = liveStreamService.getConfig(guild.id);
    const streamChannel = channels.find((c) => c && c.isTextBased() && (c.name.toLowerCase().includes("stream") || c.name.toLowerCase().includes("live-alert")));
    if (streamChannel && "permissionOverwrites" in streamChannel) {
      try {
        await streamChannel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: false,
        });
        await streamChannel.permissionOverwrites.edit(streamAlertRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false,
        });
        if (streamChannel.name !== "🔴・stream-alerts") {
          await (streamChannel as any).setName("🔴・stream-alerts");
        }
      } catch (e) {
        console.warn("[RolePanel] Konnte Berechtigungen für Stream-Alerts Kanal nicht aktualisieren:", e);
      }
    }

    liveStreamService.setConfig(
      guild.id,
      liveRole.id,
      existingLiveCfg?.announcementChannelId || (streamChannel ? streamChannel.id : undefined),
      existingLiveCfg?.categoryId,
      existingLiveCfg?.channelType || "voice",
      true
    );

    // Game-News Rolle (bn.gamenews) & Kanal
    const news = await this.ensureGameNewsSetup(guild);
    const drivers = await this.ensureDriverNewsSetup(guild);

    return {
      gameNewsRole: news.role,
      gameNewsChannel: news.channel,
      driverNewsRole: drivers.role,
      driverNewsChannel: drivers.channel,
      guestRole: { id: guestRole.id, name: guestRole.name, created: guestCreated },
      streamAlertRole: { id: streamAlertRole.id, name: streamAlertRole.name, created: streamAlertCreated },
      freeGamesRole: { id: freeGamesRole.id, name: freeGamesRole.name, created: freeGamesCreated },
      liveRole: { id: liveRole.id, name: liveRole.name, created: liveCreated },
      freeGamesChannel: { id: freeGamesChannel.id, name: freeGamesChannel.name, created: channelCreated },
    };
  }

  /**
   * Legt die Rolle "bn.gamenews" und den Kanal "📰・game-news" an (falls nicht vorhanden).
   * Der Kanal ist - wie #free-games - nur für Mitglieder mit der Rolle sichtbar und schreibgeschützt.
   */
  public async ensureGameNewsSetup(guild: Guild) {
    return this.ensureNewsSetup(guild, "game");
  }

  public async ensureDriverNewsSetup(guild: Guild) {
    return this.ensureNewsSetup(guild, "driver");
  }

  /**
   * Legt Rolle + Kanal für Game-News ("game") bzw. Treiber-News ("driver") an.
   * Die Kanäle sind jeweils nur für Mitglieder mit der passenden Rolle sichtbar und schreibgeschützt -
   * wer nur bn.treiber hat, sieht also keine Spiele-News und umgekehrt.
   */
  public async ensureNewsSetup(guild: Guild, kind: "game" | "driver") {
    const DEF = {
      game: {
        roleName: "📰 Game-News (bn.gamenews)",
        roleColor: 0xf39c12,
        roleMatch: /bn\.gamenews|bn\.news|game-news alerts|gamenews/i,
        channelName: "📰・game-news",
        channelMatch: /game-?news|patch-?notes/i,
        topic: "Spiel-Updates, Patchnotes & Events | Benachrichtigungen mit @bn.gamenews",
        roleKey: "gameNewsRoleId",
        channelKey: "gameNewsChannelId",
        label: "Game-News",
      },
      driver: {
        roleName: "🖥️ Treiber-News (bn.treiber)",
        roleColor: 0x00b4d8,
        roleMatch: /bn\.treiber|treiber-news|driver-news/i,
        channelName: "🖥️・treiber-news",
        channelMatch: /treiber|driver/i,
        topic: "Neue Grafik- & Chipsatz-Treiber (NVIDIA, AMD, Intel) | Benachrichtigungen mit @bn.treiber",
        roleKey: "driverNewsRoleId",
        channelKey: "driverNewsChannelId",
        label: "Treiber-News",
      },
    } as const;
    const d = DEF[kind];

    const cfg: any = this.getConfig(guild.id) || {};
    const roles = await guild.roles.fetch();
    const channels = await guild.channels.fetch();

    let role = (cfg[d.roleKey] && roles.get(cfg[d.roleKey])) || roles.find((r) => d.roleMatch.test(r.name));
    let roleCreated = false;
    if (!role) {
      role = await guild.roles.create({
        name: d.roleName,
        color: d.roleColor,
        mentionable: true,
        reason: `Automatisch erstellt von GLGBot (${d.label})`,
      });
      roleCreated = true;
      console.log(`[RolePanel] ${d.label} Rolle neu erstellt: ${role.name} (${role.id})`);
    }

    let channel =
      (cfg[d.channelKey] && channels.get(cfg[d.channelKey])) ||
      channels.find((c) => c !== null && c.type === ChannelType.GuildText && d.channelMatch.test(c.name));
    let channelCreated = false;
    if (!channel) {
      channel = await guild.channels.create({
        name: d.channelName,
        type: ChannelType.GuildText,
        topic: d.topic,
        reason: `Automatisch erstellt von GLGBot (${d.label})`,
      });
      channelCreated = true;
      console.log(`[RolePanel] ${d.label} Kanal neu erstellt: ${channel.name} (${channel.id})`);
    }

    // Einheitlicher Name wie die anderen Bot-Kanäle (🎮・free-games, 🔴・stream-alerts)
    if (channel.name !== d.channelName && "setName" in channel) {
      await (channel as any).setName(d.channelName, "GLGBot: einheitlicher Kanalname").catch((e: any) =>
        console.warn(`[RolePanel] Konnte ${d.label} Kanal nicht umbenennen:`, e?.message || e)
      );
    }
    if ("setTopic" in channel) {
      await (channel as any).setTopic(d.topic).catch(() => null);
    }

    // Nur für die passende Rolle sichtbar, niemand außer dem Bot schreibt
    if ("permissionOverwrites" in channel) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false, SendMessages: false });
        await channel.permissionOverwrites.edit(role, { ViewChannel: true, ReadMessageHistory: true, SendMessages: false });
        if (guild.members.me) {
          await channel.permissionOverwrites.edit(guild.members.me, { ViewChannel: true, SendMessages: true, EmbedLinks: true });
        }
      } catch (e) {
        console.warn(`[RolePanel] Konnte Berechtigungen für ${d.label} Kanal nicht setzen:`, e);
      }
    }

    this.updateConfig(guild.id, { [d.roleKey]: role.id, [d.channelKey]: channel.id } as any);
    return {
      role: { id: role.id, name: role.name, created: roleCreated },
      channel: { id: channel.id, name: channel.name, created: channelCreated },
    };
  }

  // --- EMBED & BUTTON BUILDER ---
  public createPanelEmbed() {
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🛡️ Berechtigungs- & Benachrichtigungs-Zentrum")
      .setDescription(
        "Wähle hier deine Rollen und Benachrichtigungen aus, um Kanäle freizuschalten:\n\n" +
        "📜 **1. Regeln akzeptieren (`Gast-Rolle`)**\n" +
        "Klicke auf den grünen Button, um die Serverregeln zu bestätigen und als **Gast** Zugriff auf den Server zu erhalten.\n\n" +
        "🔴 **2. Live-Stream Benachrichtigungen (`bn.live`)**\n" +
        "Erhalte Stream-Pings und Zugriff auf den Live-Stream Kanal, sobald jemand streamt.\n\n" +
        "🎁 **3. Free-Games Alerts (`bn.free`)**\n" +
        "Werde benachrichtigt, sobald Epic Games oder Steam 100% kostenlose Vollversionen anbieten und schalte den `#free-games` Kanal frei!\n\n" +
        "📰 **4. Game-News (`bn.gamenews`)**\n" +
        "Spiel-Updates, Patchnotes und Events - schaltet den `#game-news` Kanal frei.\n\n" +
        "🖥️ **5. Treiber-News (`bn.treiber`)**\n" +
        "Neue Grafik- und Chipsatz-Treiber (NVIDIA, AMD, Intel) - schaltet den `#treiber-news` Kanal frei."
      )
      .setThumbnail("https://cdn.discordapp.com/emojis/849312521948823562.png")
      .setFooter({ text: `${BRANDING.bot} Rollen-System | 1-Klick Toggle` })
      .setTimestamp();
  }

  public createPanelComponents(includeRulesButton: boolean = true) {
    const rulesBtn = new ButtonBuilder()
      .setCustomId("role_btn_rules")
      .setLabel("Regeln akzeptieren (Gast)")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success);

    const liveBtn = new ButtonBuilder()
      .setCustomId("role_btn_live")
      .setLabel("Live-Stream Alerts (bn.live)")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Primary);

    const freeGamesBtn = new ButtonBuilder()
      .setCustomId("role_btn_free")
      .setLabel("Free-Games Alerts (bn.free)")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Secondary);

    const newsBtn = new ButtonBuilder()
      .setCustomId("role_btn_news")
      .setLabel("Game-News (bn.gamenews)")
      .setEmoji("📰")
      .setStyle(ButtonStyle.Secondary);

    const driverBtn = new ButtonBuilder()
      .setCustomId("role_btn_driver")
      .setLabel("Treiber-News (bn.treiber)")
      .setEmoji("🖥️")
      .setStyle(ButtonStyle.Secondary);

    const statusBtn = new ButtonBuilder()
      .setCustomId("role_btn_status")
      .setLabel("Meine Rollen")
      .setEmoji("👤")
      .setStyle(ButtonStyle.Secondary);

    const buttons = includeRulesButton
      ? [rulesBtn, liveBtn, freeGamesBtn, newsBtn, driverBtn, statusBtn]
      : [liveBtn, freeGamesBtn, newsBtn, driverBtn, statusBtn];
    // Discord: max. 5 Buttons pro Reihe
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let k = 0; k < buttons.length; k += 5) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(k, k + 5)));
    }
    return rows;
  }

  // --- INTERACTION BUTTON HANDLER ---
  public async handleButton(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.member) return;

    this.loadConfig();
    const guildId = interaction.guild.id;
    const cfg = this.config[guildId] || {};
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // Wer im Gefängnis sitzt, darf sich keine Rollen holen (sonst käme er über "Regeln akzeptieren" einfach raus)
    if (prisonService.isImprisoned(guildId, member.id)) {
      await interaction.reply({ content: "🔒 Du bist gerade im Gefängnis und kannst keine Rollen ändern.", ephemeral: true });
      return;
    }

    // 1. REGELN AKZEPTIEREN (Gast)
    if (interaction.customId === "role_btn_rules") {
      if (!cfg.rulesRoleId) {
        await interaction.reply({
          content: "⚠️ Auf diesem Server ist noch keine Gast-/Regel-Rolle eingerichtet. Bitte kontaktiere einen Administrator.",
          ephemeral: true,
        });
        return;
      }

      if (member.roles.cache.has(cfg.rulesRoleId)) {
        await interaction.reply({
          content: "ℹ️ Du hast die Regeln bereits bestätigt und besitzt die Gast-Rolle schon!",
          ephemeral: true,
        });
        return;
      }

      try {
        await member.roles.add(cfg.rulesRoleId, "Regeln akzeptiert");
      } catch (e) {
        console.error("[RolePanel] Konnte Gast-Rolle nicht vergeben:", e);
        await interaction.reply({
          content: "❌ Die Rolle konnte nicht vergeben werden. Bitte melde dich beim Team (Bot-Rolle steht zu niedrig).",
          ephemeral: true,
        });
        return;
      }
      const permsHint = cfg.permissionsChannelId
        ? `\n\n🔔 In <#${cfg.permissionsChannelId}> kannst du dir noch Benachrichtigungen für Live-Streams und Gratis-Spiele aussuchen.`
        : "";
      await interaction.reply({
        content: `🎉 **Willkommen auf ${interaction.guild.name}!** Du hast die Regeln akzeptiert - alle Kanäle sind jetzt für dich freigeschaltet.${permsHint}`,
        ephemeral: true,
      });
      return;
    }

    // 2. LIVE-STREAM BENACHRICHTIGUNGEN (bn.live)
    if (interaction.customId === "role_btn_live") {
      if (!cfg.streamAlertRoleId) {
        await interaction.reply({
          content: "⚠️ Auf diesem Server ist noch keine Stream-Alert Rolle eingerichtet.",
          ephemeral: true,
        });
        return;
      }

      if (member.roles.cache.has(cfg.streamAlertRoleId)) {
        await member.roles.remove(cfg.streamAlertRoleId).catch(() => null);
        await interaction.reply({
          content: `🔕 **Deaktiviert:** Du hast die Rolle <@&${cfg.streamAlertRoleId}> entfernt und erhältst keine Live-Stream Pings mehr.`,
          ephemeral: true,
        });
      } else {
        await member.roles.add(cfg.streamAlertRoleId).catch(() => null);
        await interaction.reply({
          content: `🔔 **Aktiviert!** Du hast die Rolle <@&${cfg.streamAlertRoleId}> erhalten. Du wirst nun benachrichtigt, sobald ein Stream startet!`,
          ephemeral: true,
        });
      }
      return;
    }

    // 3. FREE-GAMES ALERTS (bn.free)
    if (interaction.customId === "role_btn_free") {
      if (!cfg.freeGamesRoleId) {
        await interaction.reply({
          content: "⚠️ Auf diesem Server ist noch keine Free-Games Rolle eingerichtet.",
          ephemeral: true,
        });
        return;
      }

      if (member.roles.cache.has(cfg.freeGamesRoleId)) {
        await member.roles.remove(cfg.freeGamesRoleId).catch(() => null);
        await interaction.reply({
          content: `🔕 **Deaktiviert:** Du hast die Rolle <@&${cfg.freeGamesRoleId}> entfernt und erhältst keine Free-Games Alerts mehr.`,
          ephemeral: true,
        });
      } else {
        await member.roles.add(cfg.freeGamesRoleId).catch(() => null);
        await interaction.reply({
          content: `🎮 **Aktiviert!** Du hast die Rolle <@&${cfg.freeGamesRoleId}> erhalten. Du siehst nun den Free-Games Kanal und erhältst wöchentliche Gratis-Spiele Benachrichtigungen!`,
          ephemeral: true,
        });
      }
      return;
    }

    // GAME-NEWS (bn.gamenews) & TREIBER-NEWS (bn.treiber)
    if (interaction.customId === "role_btn_news" || interaction.customId === "role_btn_driver") {
      const isDriver = interaction.customId === "role_btn_driver";
      const roleId = isDriver ? cfg.driverNewsRoleId : cfg.gameNewsRoleId;
      const channelId = isDriver ? cfg.driverNewsChannelId : cfg.gameNewsChannelId;
      const label = isDriver ? "Treiber-News" : "Game-News";
      if (!roleId) {
        await interaction.reply({ content: `⚠️ Auf diesem Server ist noch keine ${label} Rolle eingerichtet.`, ephemeral: true });
        return;
      }
      const has = member.roles.cache.has(roleId);
      try {
        if (has) await member.roles.remove(roleId, `${label} abbestellt`);
        else await member.roles.add(roleId, `${label} abonniert`);
      } catch (e) {
        console.error("[RolePanel] Konnte Game-News Rolle nicht ändern:", e);
        await interaction.reply({ content: "❌ Die Rolle konnte nicht geändert werden (Bot-Rolle zu niedrig?).", ephemeral: true });
        return;
      }
      await interaction.reply({
        content: has
          ? `🔕 **Deaktiviert:** Du erhältst keine ${label} mehr.`
          : `${isDriver ? "🖥️" : "📰"} **Aktiviert!** Du siehst jetzt ${channelId ? `<#${channelId}>` : `den ${label} Kanal`} und bekommst ${isDriver ? "neue Grafik- & Chipsatz-Treiber" : "Spiel-Updates & Patchnotes"}.`,
        ephemeral: true,
      });
      return;
    }

    // 4. STATUS / MEINE ROLLEN
    if (interaction.customId === "role_btn_status") {
      const hasRules = cfg.rulesRoleId ? member.roles.cache.has(cfg.rulesRoleId) : false;
      const hasLive = cfg.streamAlertRoleId ? member.roles.cache.has(cfg.streamAlertRoleId) : false;
      const hasFree = cfg.freeGamesRoleId ? member.roles.cache.has(cfg.freeGamesRoleId) : false;
      const hasNews = cfg.gameNewsRoleId ? member.roles.cache.has(cfg.gameNewsRoleId) : false;
      const hasDriver = cfg.driverNewsRoleId ? member.roles.cache.has(cfg.driverNewsRoleId) : false;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👤 Deine Berechtigungen auf ${interaction.guild.name}`)
        .addFields(
          { 
            name: "📜 Regeln bestätigt (Gast)", 
            value: hasRules ? "✅ Aktiv (Kanal-Zugang freigeschaltet)" : "❌ Ausstehend (Klicke auf 'Regeln akzeptieren')",
            inline: false 
          },
          { 
            name: "🔴 Live-Stream Alerts (bn.live)", 
            value: hasLive ? "✅ Aktiv (Erhält Stream-Pings)" : "❌ Deaktiviert",
            inline: true 
          },
          { 
            name: "🎮 Free-Games Alerts (bn.free)", 
            value: hasFree ? "✅ Aktiv (Erhält Gratis-Spiele Alerts)" : "❌ Deaktiviert",
            inline: true 
          },
          {
            name: "📰 Game-News (bn.gamenews)",
            value: hasNews ? "✅ Aktiv (Erhält Spiel-Updates)" : "❌ Deaktiviert",
            inline: true
          },
          {
            name: "🖥️ Treiber-News (bn.treiber)",
            value: hasDriver ? "✅ Aktiv (Erhält neue Treiber)" : "❌ Deaktiviert",
            inline: true
          }
        )
        .setFooter({ text: "Klicke einfach auf die Buttons, um Rollen an- oder abzuwählen." })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

export const rolePanelService = new RolePanelService();
