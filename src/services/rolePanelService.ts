import fs from "fs";
import path from "path";
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

export interface RolePanelConfig {
  [guildId: string]: {
    rulesRoleId?: string;
    streamAlertRoleId?: string;
    freeGamesRoleId?: string;
    freeGamesChannelId?: string;
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
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
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
      rulesRoleId,
      streamAlertRoleId,
      freeGamesRoleId,
      freeGamesChannelId,
    };
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

    // 6. Konfigurationen speichern
    this.setConfig(
      guild.id,
      guestRole.id,
      streamAlertRole.id,
      freeGamesRole.id,
      freeGamesChannel.id
    );

    // Live-Stream System Konfiguration anpassen
    const existingLiveCfg = liveStreamService.getConfig(guild.id);
    const streamChannel = channels.find((c) => c && c.isTextBased() && c.name.toLowerCase().includes("stream"));
    liveStreamService.setConfig(
      guild.id,
      liveRole.id,
      existingLiveCfg?.announcementChannelId || (streamChannel ? streamChannel.id : undefined),
      existingLiveCfg?.categoryId,
      existingLiveCfg?.channelType || "voice",
      true
    );

    return {
      guestRole: { id: guestRole.id, name: guestRole.name, created: guestCreated },
      streamAlertRole: { id: streamAlertRole.id, name: streamAlertRole.name, created: streamAlertCreated },
      freeGamesRole: { id: freeGamesRole.id, name: freeGamesRole.name, created: freeGamesCreated },
      liveRole: { id: liveRole.id, name: liveRole.name, created: liveCreated },
      freeGamesChannel: { id: freeGamesChannel.id, name: freeGamesChannel.name, created: channelCreated },
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
        "Werde benachrichtigt, sobald Epic Games oder Steam 100% kostenlose Vollversionen anbieten und schalte den `#free-games` Kanal frei!"
      )
      .setThumbnail("https://cdn.discordapp.com/emojis/849312521948823562.png")
      .setFooter({ text: "GLGBot Rollen-System | 1-Klick Toggle" })
      .setTimestamp();
  }

  public createPanelComponents() {
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

    const statusBtn = new ButtonBuilder()
      .setCustomId("role_btn_status")
      .setLabel("Meine Rollen")
      .setEmoji("👤")
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(rulesBtn, liveBtn, freeGamesBtn, statusBtn);
    return [row1];
  }

  // --- INTERACTION BUTTON HANDLER ---
  public async handleButton(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.member) return;

    this.loadConfig();
    const guildId = interaction.guild.id;
    const cfg = this.config[guildId] || {};
    const member = await interaction.guild.members.fetch(interaction.user.id);

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

      await member.roles.add(cfg.rulesRoleId).catch(() => null);
      await interaction.reply({
        content: `🎉 **Willkommen auf dem Server!** Du hast die Regeln akzeptiert und die Rolle <@&${cfg.rulesRoleId}> erhalten. Alle Kanäle sind nun für dich freigeschaltet!`,
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

    // 4. STATUS / MEINE ROLLEN
    if (interaction.customId === "role_btn_status") {
      const hasRules = cfg.rulesRoleId ? member.roles.cache.has(cfg.rulesRoleId) : false;
      const hasLive = cfg.streamAlertRoleId ? member.roles.cache.has(cfg.streamAlertRoleId) : false;
      const hasFree = cfg.freeGamesRoleId ? member.roles.cache.has(cfg.freeGamesRoleId) : false;

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
          }
        )
        .setFooter({ text: "Klicke einfach auf die Buttons, um Rollen an- oder abzuwählen." })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

export const rolePanelService = new RolePanelService();
