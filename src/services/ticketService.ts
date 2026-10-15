import fs from "fs";
import path from "path";
import {
  Guild,
  TextChannel,
  User,
  GuildMember,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Client,
  AttachmentBuilder,
} from "discord.js";
import { auditLogService } from "./auditLogService";
import { transcriptService, TranscriptMetadata } from "./transcriptService";
import { readJsonFile, writeJsonAtomic } from "../utils/jsonFile";
import { BRANDING } from "../config/branding";

export interface TicketConfig {
  categoryId?: string;
  supportRoleId?: string;
  transcriptChannelId?: string;
}

interface FullTicketConfig {
  [guildId: string]: TicketConfig;
}

export interface TicketRecord {
  channelId: string;
  channelName?: string;
  guildId: string;
  creatorId: string;
  creatorTag: string;
  createdAt: string;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
  closedByTag?: string;
  transcriptFile?: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "ticket_config.json");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const TRANSCRIPTS_DIR = path.join(DATA_DIR, "transcripts");

class TicketService {
  private config: FullTicketConfig = {};
  private tickets: TicketRecord[] = [];

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TRANSCRIPTS_DIR)) {
      fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = readJsonFile(CONFIG_FILE, this.config);
      }
      if (fs.existsSync(TICKETS_FILE)) {
        this.tickets = readJsonFile(TICKETS_FILE, this.tickets);
      }
    } catch (e) {
      console.error("[TicketService] Fehler beim Laden der Ticket-Daten:", e);
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      writeJsonAtomic(CONFIG_FILE, this.config);
      writeJsonAtomic(TICKETS_FILE, this.tickets);
    } catch (e) {
      console.error("[TicketService] Fehler beim Speichern der Ticket-Daten:", e);
    }
  }

  public getConfig(guildId: string): TicketConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {};
    }
    return this.config[guildId];
  }

  public getBackupConfig(guildId: string): TicketConfig | null {
    const config = this.config[guildId];
    return config ? { ...config } : null;
  }

  public setConfig(guildId: string, patch: Partial<TicketConfig>): TicketConfig {
    this.config[guildId] = { ...(this.config[guildId] || {}), ...patch };
    this.saveData();
    return this.config[guildId];
  }

  // Erstellt das Ticket-Panel für User
  public createPanelEmbed(): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📩 Support- & Ticket-System")
      .setDescription(
        "Du benötigst Hilfe, möchtest einen Regelverstoß melden oder hast eine Frage an die Serverleitung?\n\nKlicke unten auf den Button, um ein privates Ticket mit dem Team zu öffnen!"
      )
      .addFields(
        { name: "🔒 Privat & Sicher", value: "Nur du und das Moderationsteam haben Zugriff.", inline: true },
        { name: "⚡ Schnelle Antwort", value: "Unser Team wird sich schnellstmöglich um dein Anliegen kümmern.", inline: true }
      )
      .setFooter({ text: `${BRANDING.community} Support-Center` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_ticket_create")
        .setLabel("Ticket erstellen")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
  }

  // Erstellt oder findet den dedizierten Support-Kanal mit Ticket-Panel
  public async ensureSupportChannel(guild: Guild): Promise<TextChannel> {
    const existing = guild.channels.cache.find(
      (c) => c.isTextBased() && (c.name.includes("support") || c.name.includes("ticket-support"))
    );
    if (existing && existing.type === ChannelType.GuildText) {
      return existing as TextChannel;
    }

    const infoCat = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes("info") || c.name.toLowerCase().includes("start"))
    );

    const ch = await guild.channels.create({
      name: "📩・support",
      type: ChannelType.GuildText,
      parent: infoCat?.id || undefined,
      topic: `Offizieller Support-Kanal von ${BRANDING.community} • Öffne hier ein Ticket bei Fragen oder Problemen`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages],
        },
      ],
      reason: "Automatischer Setup des Support-Kanals",
    });

    const { embeds, components } = this.createPanelEmbed();
    await ch.send({ embeds, components });
    return ch;
  }

  // Öffnet ein neues Ticket für ein Mitglied
  public async createTicket(guild: Guild, user: User, client: Client): Promise<TextChannel> {
    const cfg = this.getConfig(guild.id);

    // Prüfe, ob Nutzer bereits ein offenes Ticket hat
    const existing = this.tickets.find((t) => t.guildId === guild.id && t.creatorId === user.id && t.status === "OPEN");
    if (existing) {
      const channel = guild.channels.cache.get(existing.channelId);
      if (channel && channel.isTextBased()) {
        return channel as TextChannel;
      }
    }

    const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || user.id.slice(0, 4)}`;

    const permissionOverwrites: any[] = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    const botId = client.user?.id || guild.members.me?.id;
    if (botId) {
      permissionOverwrites.push({
        id: botId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }

    // Support-Rolle hinzufügen falls konfiguriert
    if (cfg.supportRoleId) {
      permissionOverwrites.push({
        id: cfg.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: cfg.categoryId || undefined,
      topic: `Support-Ticket von ${user.tag} (${user.id}) • Erstellt am ${new Date().toLocaleString("de-DE")}`,
      permissionOverwrites,
    });

    const ticketRecord: TicketRecord = {
      channelId: ticketChannel.id,
      channelName: ticketChannel.name,
      guildId: guild.id,
      creatorId: user.id,
      creatorTag: user.tag || user.username,
      createdAt: new Date().toISOString(),
      status: "OPEN",
    };

    this.tickets.unshift(ticketRecord);
    this.saveData();

    // Begrüßungs-Embed im Ticket
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Willkommen in deinem Ticket, ${user.username}!`)
      .setDescription(
        `Hallo <@${user.id}>! Bitte beschreibe dein Anliegen so detailliert wie möglich.\nUnser Support-Team wurde benachrichtigt und wird sich in Kürze bei dir melden.\n\nNutze die Buttons unten, um das Ticket zu verwalten:`
      )
      .addFields(
        { name: "Ticket-ID", value: `\`${ticketChannel.id}\``, inline: true },
        { name: "Ersteller", value: `<@${user.id}>`, inline: true }
      )
      .setTimestamp();

    const controlsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_ticket_close")
        .setLabel("Ticket schließen")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("btn_ticket_transcript")
        .setLabel("Transkript speichern")
        .setEmoji("📜")
        .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({
      content: `<@${user.id}>`,
      embeds: [welcomeEmbed],
      components: [controlsRow],
    });

    return ticketChannel;
  }

  // Schließt ein Ticket, erstellt vollständige Transkripte (TXT & HTML) und löscht Kanal
  public async closeTicket(channel: TextChannel, closedBy: User, client: Client) {
    const record = this.tickets.find((t) => t.channelId === channel.id);
    const config = this.getConfig(channel.guild.id);

    // 1. Nachrichten laden & vollständige Transkripte (TXT & HTML) generieren
    const messages = await transcriptService.fetchAllMessages(channel);
    const formattedMessages = transcriptService.formatMessages(messages, channel.guild);

    const now = new Date();
    const meta: TranscriptMetadata = {
      channelName: channel.name,
      channelId: channel.id,
      guildName: channel.guild.name,
      guildId: channel.guild.id,
      guildIcon: channel.guild.iconURL(),
      creatorTag: record?.creatorTag || "Unbekannt",
      creatorId: record?.creatorId || "0",
      closedByTag: closedBy.tag || closedBy.username,
      closedById: closedBy.id,
      createdAt: record ? new Date(record.createdAt).toLocaleString("de-DE") : now.toLocaleString("de-DE"),
      closedAt: now.toLocaleString("de-DE"),
    };

    const textTranscript = transcriptService.generateTextTranscript(meta, formattedMessages);
    const htmlTranscript = transcriptService.generateHtmlTranscript(meta, formattedMessages);

    // Speichern auf Festplatte
    transcriptService.saveTranscripts(channel.id, textTranscript, htmlTranscript);

    if (record) {
      record.status = "CLOSED";
      record.closedAt = now.toISOString();
      record.closedByTag = closedBy.tag || closedBy.username;
      record.transcriptFile = `${channel.id}.txt`;
      this.saveData();
    }

    const htmlBuffer = Buffer.from(htmlTranscript, "utf-8");
    const textBuffer = Buffer.from(textTranscript, "utf-8");

    const htmlAttachment = new AttachmentBuilder(htmlBuffer, {
      name: `transcript-${channel.name}.html`,
    });
    const txtAttachment = new AttachmentBuilder(textBuffer, {
      name: `transcript-${channel.name}.txt`,
    });

    // 2. Transkripte an Ersteller per DM senden
    if (record) {
      try {
        const creator = await client.users.fetch(record.creatorId).catch(() => null);
        if (creator) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`Dein Ticket #${channel.name} wurde geschlossen`)
            .setDescription(
              `Dein Support-Ticket auf **${channel.guild.name}** wurde von <@${closedBy.id}> geschlossen.\n\n` +
                `📄 **Anbei findest du dein vollständiges Transkript:**\n` +
                `• 🌐 **.html**: Interaktives Discord-Transkript (im Browser wie in Discord ansehen)\n` +
                `• 📜 **.txt**: Vollständiger Text-Verlauf inklusive aller Embeds, Mentions & Notizen`
            )
            .setTimestamp();

          await creator
            .send({
              embeds: [dmEmbed],
              files: [htmlAttachment, txtAttachment],
            })
            .catch(() => {});
        }
      } catch {}
    }

    // 2b. Transkript an Transkript-Kanal senden (falls konfiguriert)
    if (config?.transcriptChannelId) {
      try {
        const logChannel = channel.guild.channels.cache.get(config.transcriptChannelId) as TextChannel | undefined;
        if (logChannel && logChannel.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`📜 Ticket-Transkript: #${channel.name}`)
            .setDescription(
              `**Ticket:** #${channel.name}\n` +
                `**Ersteller:** <@${record?.creatorId}> (${record?.creatorTag})\n` +
                `**Geschlossen von:** <@${closedBy.id}>\n` +
                `**Nachrichten:** ${formattedMessages.length}`
            )
            .setTimestamp();

          await logChannel
            .send({
              embeds: [logEmbed],
              files: [
                new AttachmentBuilder(htmlBuffer, { name: `transcript-${channel.name}.html` }),
                new AttachmentBuilder(textBuffer, { name: `transcript-${channel.name}.txt` }),
              ],
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error("[TicketService] Fehler beim Senden in Transkript-Kanal:", e);
      }
    }

    // 3. Im Audit-Log protokollieren
    await auditLogService.log(
      {
        guildId: channel.guild.id,
        category: "channel",
        action: "TICKET_CLOSED",
        executor: {
          id: closedBy.id,
          tag: closedBy.tag || closedBy.username,
        },
        target: {
          id: channel.id,
          name: channel.name,
        },
        details: {
          ticketCreator: record ? `${record.creatorTag} (${record.creatorId})` : "Unbekannt",
          closedBy: closedBy.tag || closedBy.username,
        },
      },
      client
    );

    // 4. Countdown und Löschung
    await channel.send({
      content: `🔒 **Ticket wird in 5 Sekunden geschlossen und gelöscht...** (Geschlossen von <@${closedBy.id}>)`,
    });

    setTimeout(async () => {
      await channel.delete("Ticket geschlossen").catch(() => {});
    }, 5000);
  }

  // Erstellt lesbaren Text-Export aller Nachrichten im Kanal
  public async generateTranscriptText(channel: TextChannel): Promise<string> {
    const record = this.tickets.find((t) => t.channelId === channel.id);
    const messages = await transcriptService.fetchAllMessages(channel);
    const formattedMessages = transcriptService.formatMessages(messages, channel.guild);

    const now = new Date();
    const meta: TranscriptMetadata = {
      channelName: channel.name,
      channelId: channel.id,
      guildName: channel.guild.name,
      guildId: channel.guild.id,
      guildIcon: channel.guild.iconURL(),
      creatorTag: record?.creatorTag || "Unbekannt",
      creatorId: record?.creatorId || "0",
      createdAt: record ? new Date(record.createdAt).toLocaleString("de-DE") : now.toLocaleString("de-DE"),
      closedAt: now.toLocaleString("de-DE"),
    };

    return transcriptService.generateTextTranscript(meta, formattedMessages);
  }

  public getTickets(guildId: string): TicketRecord[] {
    return this.tickets.filter((t) => t.guildId === guildId);
  }

  public async getTranscript(channelId: string, guild?: Guild, format: "text" | "html" = "text"): Promise<string | null> {
    const existing = transcriptService.getTranscript(channelId, format);
    if (existing) {
      return existing;
    }
    if (guild) {
      const ch = guild.channels.cache.get(channelId);
      if (ch && ch.isTextBased() && "messages" in ch) {
        const textChannel = ch as TextChannel;
        const messages = await transcriptService.fetchAllMessages(textChannel);
        const formatted = transcriptService.formatMessages(messages, guild);
        const record = this.tickets.find((t) => t.channelId === channelId);
        const now = new Date();
        const meta: TranscriptMetadata = {
          channelName: textChannel.name,
          channelId: textChannel.id,
          guildName: guild.name,
          guildId: guild.id,
          guildIcon: guild.iconURL(),
          creatorTag: record?.creatorTag || "Unbekannt",
          creatorId: record?.creatorId || "0",
          createdAt: record ? new Date(record.createdAt).toLocaleString("de-DE") : now.toLocaleString("de-DE"),
          closedAt: now.toLocaleString("de-DE"),
        };

        if (format === "html") {
          return transcriptService.generateHtmlTranscript(meta, formatted);
        }
        return transcriptService.generateTextTranscript(meta, formatted);
      }
    }
    return null;
  }

  public async getLiveMessages(channel: TextChannel): Promise<{ author: string; content: string; time: string; isBot: boolean; avatar?: string }[]> {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return [];
    return [...messages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((m) => {
        let content = m.content || "";
        if (m.embeds.length > 0) {
          const emb = m.embeds[0];
          const embText = [emb.title, emb.description].filter(Boolean).join("\n");
          if (embText) {
            content = content ? `${content}\n${embText}` : embText;
          }
        }
        if (m.attachments.size > 0) {
          const attachUrls = m.attachments.map((a) => a.url).join(" ");
          content = content ? `${content}\n[Anhang: ${attachUrls}]` : `[Anhang: ${attachUrls}]`;
        }
        return {
          author: m.author.tag || m.author.username,
          avatar: m.author.displayAvatarURL(),
          content: content || "(Kein Inhalt)",
          time: new Date(m.createdTimestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          isBot: m.author.bot,
        };
      });
  }

  public async postPanel(guild: Guild, channelId: string): Promise<boolean> {
    const ch = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
    if (!ch || !ch.isTextBased() || !("send" in ch)) return false;
    const { embeds, components } = this.createPanelEmbed();
    await (ch as TextChannel).send({ embeds, components });
    return true;
  }

  public async sendTicketMessage(guild: Guild, channelId: string, text: string, senderName: string): Promise<boolean> {
    const ch = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
    if (!ch || !ch.isTextBased() || !("send" in ch)) return false;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: `${senderName} (Web-Support)` })
      .setDescription(text)
      .setTimestamp();
    await (ch as TextChannel).send({ embeds: [embed] });
    return true;
  }

  public async closeTicketFromWeb(guild: Guild, channelId: string, closedByName: string, client: Client): Promise<boolean> {
    const ch = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
    if (!ch || !ch.isTextBased()) return false;
    const fakeUser = {
      id: client.user?.id || "dashboard",
      tag: closedByName,
      username: closedByName,
    } as User;
    await this.closeTicket(ch as TextChannel, fakeUser, client);
    return true;
  }
}

export const ticketService = new TicketService();
