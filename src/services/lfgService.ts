import crypto from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { tempVoiceService } from "./tempVoiceService";

/**
 * LFG / Mitspieler-Suche: Gruppe mit freien Plätzen, Beitreten/Verlassen per Button.
 * Ist die Gruppe voll, pingt der Bot alle, erstellt eine temporäre Lobby und verschiebt
 * alle Teilnehmer, die gerade in einem Sprachkanal sind. Die Lobby verschwindet, wenn sie leer ist.
 */
export interface LfgGroup {
  id: string;
  channelId: string;
  messageId?: string;
  leaderId: string;
  game: string;
  slots: number; // Gesamtgröße inkl. Leiter
  rank?: string;
  note?: string;
  members: string[];
  createdAt: number;
  status: "open" | "full" | "closed";
  voiceChannelId?: string;
}

const store = new GuildStore<Record<string, LfgGroup>>("lfg.json", () => ({}));
const EXPIRE_MS = 3 * 60 * 60 * 1000; // offene Gruppen schließen nach 3 Stunden

class LfgService {
  private interval: NodeJS.Timeout | null = null;

  public buildMessage(g: LfgGroup) {
    const free = Math.max(0, g.slots - g.members.length);
    const color = g.status === "open" ? 0x5865f2 : g.status === "full" ? 0x57f287 : 0x4f545c;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 ${g.game} – ${g.status === "closed" ? "Gruppe geschlossen" : g.status === "full" ? "Gruppe voll!" : "Mitspieler gesucht"}`)
      .setDescription(
        [
          g.note ? `📝 ${g.note}` : null,
          g.rank ? `🏅 **Rang:** ${g.rank}` : null,
          `👥 **Plätze:** ${g.members.length} / ${g.slots}${g.status === "open" ? ` · noch ${free} frei` : ""}`,
          "",
          g.members.map((id, i) => `${i === 0 ? "👑" : "•"} <@${id}>`).join("\n"),
          g.voiceChannelId && g.status === "full" ? `\n🔊 Lobby: <#${g.voiceChannelId}>` : null,
        ]
          .filter((x) => x !== null)
          .join("\n")
      )
      .setFooter({ text: g.status === "open" ? "Klicke auf Beitreten, um mitzuspielen" : "Viel Spaß!" })
      .setTimestamp(g.createdAt);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`lfg_join_${g.id}`).setLabel("Beitreten").setEmoji("🎮").setStyle(ButtonStyle.Success).setDisabled(g.status !== "open"),
      new ButtonBuilder().setCustomId(`lfg_leave_${g.id}`).setLabel("Verlassen").setEmoji("❌").setStyle(ButtonStyle.Secondary).setDisabled(g.status === "closed"),
      new ButtonBuilder().setCustomId(`lfg_close_${g.id}`).setLabel("Schließen").setEmoji("🔒").setStyle(ButtonStyle.Danger).setDisabled(g.status === "closed")
    );
    return { embeds: [embed], components: [row] };
  }

  public async create(channel: TextChannel, leader: GuildMember, game: string, slots: number, rank?: string, note?: string) {
    const g: LfgGroup = {
      id: crypto.randomBytes(5).toString("hex"),
      channelId: channel.id,
      leaderId: leader.id,
      game: game.slice(0, 80),
      slots: Math.max(2, Math.min(25, slots)),
      rank: rank?.slice(0, 60) || undefined,
      note: note?.slice(0, 300) || undefined,
      members: [leader.id],
      createdAt: Date.now(),
      status: "open",
    };
    const msg = await channel.send(this.buildMessage(g));
    g.messageId = msg.id;
    store.update(channel.guild.id, (all) => {
      all[g.id] = g;
    });
    return g;
  }

  private save(guildId: string, g: LfgGroup) {
    store.update(guildId, (all) => {
      all[g.id] = g;
    });
  }

  /** Gruppe voll: alle pingen, Lobby erstellen, Teilnehmer im Voice verschieben. */
  private async fill(guild: Guild, g: LfgGroup, channel: TextChannel) {
    g.status = "full";
    const leader = await guild.members.fetch(g.leaderId).catch(() => null);
    const masterCfg = tempVoiceService.getConfig(guild.id);
    const parent = masterCfg?.categoryId || (masterCfg?.masterChannelId ? guild.channels.cache.get(masterCfg.masterChannelId)?.parentId : undefined) || undefined;
    try {
      const voice = await guild.channels.create({
        name: `🎮・${g.game} – ${leader?.displayName || "Gruppe"}`.slice(0, 100),
        type: ChannelType.GuildVoice,
        parent: parent || undefined,
        userLimit: g.slots,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
          ...g.members.map((id) => ({ id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak] })),
          { id: guild.members.me!.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels] },
        ],
        reason: `GLGBot: LFG-Gruppe ${g.game}`,
      });
      g.voiceChannelId = voice.id;
      tempVoiceService.setChannelOwner(voice.id, g.leaderId); // wird gelöscht, sobald leer
      for (const id of g.members) {
        const m = await guild.members.fetch(id).catch(() => null);
        if (m?.voice.channelId) await m.voice.setChannel(voice).catch(() => null);
      }
      // Ist nach 5 Minuten niemand drin, Lobby wieder aufräumen
      setTimeout(async () => {
        const ch = guild.channels.cache.get(voice.id);
        if (ch && ch.isVoiceBased() && ch.members.size === 0) {
          tempVoiceService.forgetChannel(voice.id);
          await ch.delete("LFG-Lobby blieb leer").catch(() => null);
        }
      }, 5 * 60 * 1000);
    } catch (e: any) {
      console.warn(`[LFG] Lobby konnte nicht erstellt werden: ${e?.message || e}`);
    }
    await channel
      .send({
        content: `🎉 **${g.game}**: Die Gruppe ist voll! ${g.members.map((id) => `<@${id}>`).join(" ")}${g.voiceChannelId ? `\n🔊 Ab in die Lobby: <#${g.voiceChannelId}>` : ""}`,
        allowedMentions: { users: g.members },
      })
      .catch(() => null);
  }

  public async handleButton(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;
    const [, action, id] = interaction.customId.split("_");
    const g = store.get(guild.id)[id];
    if (!g) {
      await interaction.reply({ content: "❌ Diese Gruppe gibt es nicht mehr.", ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const channel = interaction.channel as TextChannel;

    if (action === "join") {
      if (g.status !== "open") return void interaction.reply({ content: "❌ Die Gruppe ist schon voll oder geschlossen.", ephemeral: true });
      if (g.members.includes(userId)) return void interaction.reply({ content: "ℹ️ Du bist schon dabei.", ephemeral: true });
      g.members.push(userId);
      if (g.members.length >= g.slots) await this.fill(guild, g, channel);
    } else if (action === "leave") {
      if (!g.members.includes(userId)) return void interaction.reply({ content: "ℹ️ Du bist nicht in dieser Gruppe.", ephemeral: true });
      if (userId === g.leaderId) {
        g.status = "closed";
      } else {
        g.members = g.members.filter((m) => m !== userId);
        if (g.status === "full") g.status = "open";
      }
    } else if (action === "close") {
      const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
      if (userId !== g.leaderId && !isMod) return void interaction.reply({ content: "❌ Nur der Gruppenleiter kann die Gruppe schließen.", ephemeral: true });
      g.status = "closed";
    }

    this.save(guild.id, g);
    await interaction.update(this.buildMessage(g)).catch(() => null);
  }

  /** Alte offene Gruppen schließen & aufräumen. */
  public async cleanup(client: Client) {
    for (const guildId of store.guildIds()) {
      const guild = client.guilds.cache.get(guildId);
      const all = store.get(guildId);
      let changed = false;
      for (const g of Object.values(all)) {
        const age = Date.now() - g.createdAt;
        if (g.status === "open" && age > EXPIRE_MS) {
          g.status = "closed";
          changed = true;
          const channel = guild?.channels.cache.get(g.channelId) as TextChannel | undefined;
          if (channel && g.messageId) {
            const msg = await channel.messages.fetch(g.messageId).catch(() => null);
            await msg?.edit(this.buildMessage(g)).catch(() => null);
          }
        }
        // geschlossene/volle Gruppen nach 24 Std. vergessen
        if (g.status !== "open" && age > 24 * 60 * 60 * 1000) {
          delete all[g.id];
          changed = true;
        }
      }
      if (changed) store.set(guildId, all);
    }
  }

  public start(client: Client) {
    if (this.interval) return;
    this.interval = setInterval(() => this.cleanup(client).catch(() => null), 10 * 60 * 1000);
  }
}

export const lfgService = new LfgService();
