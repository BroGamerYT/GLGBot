import fs from "fs";
import path from "path";
import {
  Client,
  Guild,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
} from "discord.js";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { BRANDING } from "../config/branding";

export interface GiveawayData {
  id: string; // messageId
  channelId: string;
  guildId: string;
  hostId: string;
  prize: string;
  winnerCount: number;
  endTime: number; // Unix timestamp ms
  requiredRoleId?: string;
  participants: string[]; // userIds
  winners: string[]; // userIds
  ended: boolean;
  createdAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const GIVEAWAY_FILE = path.join(DATA_DIR, "giveaways.json");

export function parseDuration(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d|w)$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (isNaN(val) || val <= 0) return null;

  switch (unit) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    case "w":
      return val * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

class GiveawayService {
  /** id (messageId) -> GiveawayData */
  private giveaways: Record<string, GiveawayData> = {};
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(GIVEAWAY_FILE)) {
        this.giveaways = readJsonFile(GIVEAWAY_FILE, this.giveaways);
      }
    } catch (e) {
      console.error("[GiveawayService] Fehler beim Laden von giveaways.json:", e);
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(GIVEAWAY_FILE, this.giveaways);
    } catch (e) {
      console.error("[GiveawayService] Fehler beim Speichern von giveaways.json:", e);
    }
  }

  public getGiveaway(id: string): GiveawayData | null {
    return this.giveaways[id] || null;
  }

  public buildGiveawayEmbed(data: GiveawayData): EmbedBuilder {
    const endUnix = Math.floor(data.endTime / 1000);
    const embed = new EmbedBuilder()
      .setColor(data.ended ? 0x2b2d31 : 0x5865f2)
      .setTitle(data.ended ? `🎉 GIVEAWAY BEENDET: ${data.prize}` : `🎉 GIVEAWAY: ${data.prize}`)
      .setDescription(
        data.ended
          ? `Das Gewinnspiel ist beendet!\n\n` +
            `🏆 **Gewinner:** ${data.winners.length > 0 ? data.winners.map((w) => `<@${w}>`).join(", ") : "*Keine gültigen Teilnehmer*"}\n` +
            `🎁 **Preis:** **${data.prize}**\n` +
            `👤 **Erstellt von:** <@${data.hostId}>\n` +
            `👥 **Teilnehmer:** \`${data.participants.length}\``
          : `Klicke auf den Button unten, um teilzunehmen!\n\n` +
            `🎁 **Preis:** **${data.prize}**\n` +
            `🏆 **Gewinner:** **${data.winnerCount}**\n` +
            `⏰ **Endet:** <t:${endUnix}:R> (<t:${endUnix}:f>)\n` +
            `👤 **Erstellt von:** <@${data.hostId}>\n` +
            (data.requiredRoleId ? `🔒 **Benötigte Rolle:** <@&${data.requiredRoleId}>\n` : "") +
            `👥 **Teilnehmer:** \`${data.participants.length}\``
      )
      .setFooter({ text: `${BRANDING.community} Giveaways • ID: ${data.id}` })
      .setTimestamp(data.ended ? undefined : new Date(data.endTime));

    return embed;
  }

  public buildGiveawayButton(data: GiveawayData): ActionRowBuilder<ButtonBuilder> {
    const button = new ButtonBuilder()
      .setCustomId(`giveaway_enter_${data.id}`)
      .setLabel(data.ended ? `Beendet (${data.participants.length})` : `🎉 Teilnehmen (${data.participants.length})`)
      .setStyle(data.ended ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(data.ended);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  public async startGiveaway(
    channel: TextChannel,
    hostId: string,
    prize: string,
    durationMs: number,
    winnerCount: number,
    requiredRoleId?: string
  ): Promise<GiveawayData> {
    const endTime = Date.now() + durationMs;

    // Sende vorläufige Nachricht, um die Message-ID zu erhalten
    const tempEmbed = new EmbedBuilder().setTitle("🎉 Giveaway wird vorbereitet...").setColor(0x5865f2);
    const msg = await channel.send({ embeds: [tempEmbed] });

    const data: GiveawayData = {
      id: msg.id,
      channelId: channel.id,
      guildId: channel.guild.id,
      hostId,
      prize,
      winnerCount: Math.max(1, winnerCount),
      endTime,
      requiredRoleId,
      participants: [],
      winners: [],
      ended: false,
      createdAt: Date.now(),
    };

    this.giveaways[msg.id] = data;
    this.saveData();

    // Nachricht mit echtem Embed & Button aktualisieren
    const embed = this.buildGiveawayEmbed(data);
    const row = this.buildGiveawayButton(data);
    await msg.edit({ embeds: [embed], components: [row] });

    return data;
  }

  public async toggleEntry(
    guild: Guild,
    giveawayId: string,
    userId: string
  ): Promise<{ entered: boolean; message: string; count: number }> {
    const data = this.giveaways[giveawayId];
    if (!data) return { entered: false, message: "❌ Gewinnspiel nicht gefunden.", count: 0 };
    if (data.ended) return { entered: false, message: "❌ Dieses Gewinnspiel ist bereits beendet.", count: data.participants.length };

    // Prüfe Rollen-Voraussetzung
    if (data.requiredRoleId) {
      const member = guild.members.cache.get(userId) || (await guild.members.fetch(userId).catch(() => null));
      if (!member || !member.roles.cache.has(data.requiredRoleId)) {
        return {
          entered: false,
          message: `🔒 Du benötigst die Rolle <@&${data.requiredRoleId}>, um an diesem Giveaway teilzunehmen!`,
          count: data.participants.length,
        };
      }
    }

    const idx = data.participants.indexOf(userId);
    let entered = false;
    if (idx >= 0) {
      data.participants.splice(idx, 1);
      entered = false;
    } else {
      data.participants.push(userId);
      entered = true;
    }

    this.saveData();
    return {
      entered,
      message: entered
        ? `✅ Du nimmst jetzt am Gewinnspiel für **${data.prize}** teil!`
        : `👋 Deine Teilnahme am Gewinnspiel für **${data.prize}** wurde zurückgezogen.`,
      count: data.participants.length,
    };
  }

  public pickWinners(participants: string[], count: number): string[] {
    if (participants.length === 0) return [];
    const pool = [...participants];
    const winners: string[] = [];
    const target = Math.min(count, pool.length);

    for (let i = 0; i < target; i++) {
      const randIdx = Math.floor(Math.random() * pool.length);
      winners.push(pool[randIdx]);
      pool.splice(randIdx, 1);
    }
    return winners;
  }

  public async endGiveaway(client: Client, giveawayId: string): Promise<GiveawayData | null> {
    const data = this.giveaways[giveawayId];
    if (!data || data.ended) return null;

    data.ended = true;
    data.winners = this.pickWinners(data.participants, data.winnerCount);
    this.saveData();

    try {
      const guild = client.guilds.cache.get(data.guildId);
      if (guild) {
        const channel = guild.channels.cache.get(data.channelId) as TextChannel | undefined;
        if (channel && channel.isTextBased()) {
          const msg = await channel.messages.fetch(data.id).catch(() => null);
          if (msg) {
            const embed = this.buildGiveawayEmbed(data);
            const row = this.buildGiveawayButton(data);
            await msg.edit({ embeds: [embed], components: [row] }).catch(() => null);

            if (data.winners.length > 0) {
              await channel.send({
                content: `🎉 **Herzlichen Glückwunsch!** ${data.winners.map((w) => `<@${w}>`).join(", ")} hat/haben **${data.prize}** gewonnen! 🏆`,
              });
            } else {
              await channel.send({
                content: `ℹ️ Das Gewinnspiel für **${data.prize}** ist beendet, es gab jedoch keine gültigen Teilnehmer.`,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`[GiveawayService] Fehler beim Beenden von Giveaway ${giveawayId}:`, e);
    }

    return data;
  }

  public async rerollGiveaway(client: Client, giveawayId: string): Promise<string[] | null> {
    const data = this.giveaways[giveawayId];
    if (!data || !data.ended) return null;

    data.winners = this.pickWinners(data.participants, data.winnerCount);
    this.saveData();

    try {
      const guild = client.guilds.cache.get(data.guildId);
      if (guild) {
        const channel = guild.channels.cache.get(data.channelId) as TextChannel | undefined;
        if (channel && channel.isTextBased()) {
          const msg = await channel.messages.fetch(data.id).catch(() => null);
          if (msg) {
            const embed = this.buildGiveawayEmbed(data);
            await msg.edit({ embeds: [embed] }).catch(() => null);

            if (data.winners.length > 0) {
              await channel.send({
                content: `🔄 **Gewinner neu ausgelost (Reroll)!** ${data.winners.map((w) => `<@${w}>`).join(", ")} gewinnt/gewinnen **${data.prize}**! 🏆`,
              });
            } else {
              await channel.send({
                content: `ℹ️ Beim Reroll für **${data.prize}** gab es keine gültigen Teilnehmer.`,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`[GiveawayService] Fehler beim Reroll von Giveaway ${giveawayId}:`, e);
    }

    return data.winners;
  }

  public startScheduler(client: Client) {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      const now = Date.now();
      for (const data of Object.values(this.giveaways)) {
        if (!data.ended && data.endTime <= now) {
          await this.endGiveaway(client, data.id);
        }
      }
    }, 10000); // alle 10 Sekunden prüfen

    console.log("⏱️ [GiveawayService] Giveaway Scheduler gestartet (Intervall: 10s).");
  }
}

export const giveawayService = new GiveawayService();
