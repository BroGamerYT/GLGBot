import fs from "fs";
import path from "path";
import { 
  ButtonInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  GuildMember 
} from "discord.js";

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
