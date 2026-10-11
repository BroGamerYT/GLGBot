import fs from "fs";
import path from "path";
import { ChannelType, VoiceState, PermissionFlagsBits, VoiceChannel, MessageFlags } from "discord.js";
import { createVoicePanelEmbed, createVoicePanelComponents } from "../commands/voice/voicePanel";

interface VoiceConfig {
  [guildId: string]: {
    masterChannelId: string;
    categoryId?: string;
  };
}

const DATA_DIR = path.join(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "voice_config.json");
const TEMP_CHANNELS_FILE = path.join(DATA_DIR, "active_temp_channels.json");

class TempVoiceService {
  private config: VoiceConfig = {};
  // Speichert channelId -> ownerId
  private activeTempChannels: Map<string, string> = new Map();
  // Cooldown gegen Spam: userId -> timestamp
  private creationCooldowns: Map<string, number> = new Map();

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
    this.loadTempChannels();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        this.config = JSON.parse(raw);
      }
    } catch (error) {
      console.error("[TempVoice] Fehler beim Laden der Konfiguration:", error);
      this.config = {};
    }
  }

  private saveConfig() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (error) {
      console.error("[TempVoice] Fehler beim Speichern der Konfiguration:", error);
    }
  }

  private loadTempChannels() {
    try {
      if (fs.existsSync(TEMP_CHANNELS_FILE)) {
        const raw = fs.readFileSync(TEMP_CHANNELS_FILE, "utf-8");
        const list: { channelId: string; ownerId: string }[] = JSON.parse(raw);
        for (const item of list) {
          this.activeTempChannels.set(item.channelId, item.ownerId);
        }
      }
    } catch (error) {
      console.error("[TempVoice] Fehler beim Laden der aktiven Kanäle:", error);
    }
  }

  private saveTempChannels() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.activeTempChannels.entries()).map(([channelId, ownerId]) => ({
        channelId,
        ownerId,
      }));
      fs.writeFileSync(TEMP_CHANNELS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (error) {
      console.error("[TempVoice] Fehler beim Speichern der aktiven Kanäle:", error);
    }
  }

  public setMasterChannel(guildId: string, masterChannelId: string, categoryId?: string) {
    this.config[guildId] = { masterChannelId, categoryId };
    this.saveConfig();
  }

  public disableMasterChannel(guildId: string) {
    delete this.config[guildId];
    this.saveConfig();
  }

  public getConfig(guildId: string) {
    this.loadConfig();
    return this.config[guildId] || null;
  }

  public isTempChannel(channelId: string): boolean {
    return this.activeTempChannels.has(channelId);
  }

  public getChannelOwner(channelId: string): string | undefined {
    return this.activeTempChannels.get(channelId);
  }

  // Speichert textChannelId -> voiceChannelId für temporäre Textkanäle
  private tempTextChannels: Map<string, string> = new Map();

  public getTempTextChannel(voiceChannelId: string): string | undefined {
    return this.tempTextChannels.get(voiceChannelId);
  }

  public setTempTextChannel(voiceChannelId: string, textChannelId: string) {
    this.tempTextChannels.set(voiceChannelId, textChannelId);
  }

  /** Kanal aus der Liste der temporären Kanäle entfernen (z. B. wenn er von außen gelöscht wird). */
  public forgetChannel(channelId: string) {
    if (this.activeTempChannels.delete(channelId)) this.saveTempChannels();
  }

  public setChannelOwner(channelId: string, newOwnerId: string) {
    this.activeTempChannels.set(channelId, newOwnerId);
    this.saveTempChannels();
  }

  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    this.loadConfig();
    const guild = newState.guild || oldState.guild;
    const guildConfig = this.config[guild.id];

    // --- 1. KANAL VERLASSEN (Cleanup prüfen) ---
    if (oldState.channel && oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.channel;
      if (this.activeTempChannels.has(oldChannel.id)) {
        // Prüfe wie viele Mitglieder noch drin sind
        if (oldChannel.members.size === 0) {
          try {
            this.activeTempChannels.delete(oldChannel.id);
            this.saveTempChannels();

            // Falls ein temporärer Textkanal existiert, lösche ihn ebenfalls
            const textChannelId = this.tempTextChannels.get(oldChannel.id);
            if (textChannelId) {
              const textChannel = guild.channels.cache.get(textChannelId);
              if (textChannel) {
                await textChannel.delete("Temporärer Voice-Kanal gelöscht").catch(() => null);
              }
              this.tempTextChannels.delete(oldChannel.id);
            }

            await oldChannel.delete("Temporärer Voice-Kanal ist leer");
            console.log(`[TempVoice] Gelöscht: ${oldChannel.name} (${oldChannel.id})`);
          } catch (error) {
            console.error(`[TempVoice] Fehler beim Löschen von ${oldChannel.id}:`, error);
          }
        } else {
          // Falls der Besitzer den Kanal verlassen hat, übertragen wir die Rechte nicht zwingend,
          // aber andere können mit "Übernehmen" den Raum beanspruchen
        }
      }
    }

    // --- 2. KANAL BETRETEN (Master-Kanal Trigger) ---
    if (newState.channel && newState.channelId !== oldState.channelId) {
      if (!guildConfig || newState.channelId !== guildConfig.masterChannelId) {
        return;
      }

      const member = newState.member;
      if (!member || member.user.bot) return;

      // Anti-Spam Cooldown (3 Sekunden)
      const now = Date.now();
      const lastCreated = this.creationCooldowns.get(member.id) || 0;
      if (now - lastCreated < 3000) {
        return;
      }
      this.creationCooldowns.set(member.id, now);

      try {
        const masterChannel = newState.channel;
        const parentCategory = guildConfig.categoryId || masterChannel.parentId || undefined;

        // Position standardmäßig direkt unter dem "Join to Create" Master-Kanal
        const targetPosition = masterChannel.position + 1;

        // Erstelle temporären Sprachkanal
        const channelName = `🔊・Lobby von ${member.displayName}`;
        const newVoiceChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: parentCategory,
          position: targetPosition,
          permissionOverwrites: [
            {
              // Berechtigungen für den Kanalersteller
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel, // sonst sieht der Besitzer seinen Kanal nach "Verstecken" selbst nicht mehr
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
              ],
            },
          ],
        });

        // Sicherstellen, dass der Kanal direkt unter dem Master-Kanal angeordnet ist
        await newVoiceChannel.setPosition(targetPosition).catch(() => null);

        // Speichere Kanal
        this.activeTempChannels.set(newVoiceChannel.id, member.id);
        this.saveTempChannels();

        // Steuerungs-Panel direkt in den neu erstellten Sprachkanal senden
        try {
          const panelEmbed = createVoicePanelEmbed();
          const panelComponents = createVoicePanelComponents();
          await newVoiceChannel.send({
            content: `👋 Willkommen in deiner persönlichen Sprach-Lobby, <@${member.id}>! Hier kannst du deinen Kanal steuern:`,
            embeds: [panelEmbed],
            components: panelComponents,
          });
        } catch (panelErr) {
          console.error("[TempVoice] Konnte Steuerungs-Panel nicht in Sprachkanal senden:", panelErr);
        }

        // Verschiebe Nutzer in den neuen Kanal
        if (member.voice.channelId) {
          await member.voice.setChannel(newVoiceChannel);
          console.log(`[TempVoice] Erstellt & Nutzer verschoben: ${channelName} für ${member.user.tag}`);
        } else {
          // Falls Nutzer den Voice vor dem Move verlassen hat
          await newVoiceChannel.delete("Nutzer hat vor dem Verschieben den Sprachkanal verlassen");
          this.activeTempChannels.delete(newVoiceChannel.id);
          this.saveTempChannels();
        }
      } catch (error) {
        console.error("[TempVoice] Fehler beim Erstellen des temporären Kanals:", error);
      }
    }
  }
}

export const tempVoiceService = new TempVoiceService();
