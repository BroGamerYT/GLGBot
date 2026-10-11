import {
  ChannelType,
  Guild,
  PermissionFlagsBits,
  OverwriteType,
  CategoryChannel,
  GuildChannel,
  Role,
} from "discord.js";
import { backupService } from "./backupService";
import { tempVoiceService } from "./tempVoiceService";
import { auditLogService } from "./auditLogService";
import { ticketService } from "./ticketService";
import { rulesService } from "./rulesService";

export type TemplateId = "gaming" | "multigaming" | "coding" | "anime" | "creator";
export type StyleId = "modern" | "clean" | "aesthetic" | "box";

export interface TemplateChannelDef {
  slug: string;
  icon: string;
  type: ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildAnnouncement;
  topic?: string;
  isJoinToCreate?: boolean;
  isRules?: boolean;
  isTickets?: boolean;
  isLogs?: boolean;
  isReadOnly?: boolean;
  teamOnly?: boolean;
}

export interface TemplateCategoryDef {
  title: string;
  icon: string;
  teamOnly?: boolean;
  channels: TemplateChannelDef[];
}

export interface TemplateRoleDef {
  name: string;
  color: number;
  hoist: boolean;
  permissions: bigint;
  isTeam?: boolean;
}

export interface ServerTemplate {
  id: TemplateId;
  name: string;
  description: string;
  badge: string;
  icon: string;
  roles: TemplateRoleDef[];
  categories: TemplateCategoryDef[];
}

export interface StyleDef {
  id: StyleId;
  name: string;
  description: string;
  sampleText: string;
  sampleVoice: string;
}

export const STYLES: StyleDef[] = [
  {
    id: "modern",
    name: "Modern mit Emojis",
    description: "Klassisches Discord-Design mit passendem Emoji und Trennpunkt.",
    sampleText: "💬・hauptchat",
    sampleVoice: "🔊・talk-1",
  },
  {
    id: "clean",
    name: "Clean & Minimalistisch",
    description: "Schlicht, aufgeräumt, ohne zusätzliche Emojis in den Kanalnamen.",
    sampleText: "hauptchat",
    sampleVoice: "talk-1",
  },
  {
    id: "aesthetic",
    name: "Aesthetic mit Trennzeichen",
    description: "Elegantes Design mit stilvollen Symbolen.",
    sampleText: "〢・hauptchat",
    sampleVoice: "〢・talk-1",
  },
  {
    id: "box",
    name: "Box & Bold",
    description: "Kräftige Rahmung mit Klammer-Symbolen.",
    sampleText: "「💬」hauptchat",
    sampleVoice: "「🔊」talk-1",
  },
];

export const TEMPLATES: ServerTemplate[] = [
  {
    id: "gaming",
    name: "Gaming Clan & E-Sport",
    description: "Perfekt strukturiert für Clans, Teams und ambitionierte Gamer mit Lobbys, Info-Hub und geschütztem Team-Bereich.",
    badge: "Clan & Team",
    icon: "🎮",
    roles: [
      { name: "Inhaber", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Clan-Leitung", color: 0xe67e22, hoist: true, permissions: PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles | PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers, isTeam: true },
      { name: "Team-Moderator", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.MuteMembers | PermissionFlagsBits.DeafenMembers | PermissionFlagsBits.MoveMembers | PermissionFlagsBits.ModerateMembers, isTeam: true },
      { name: "E-Sport Squad", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.Stream },
      { name: "Clan-Member", color: 0x2ecc71, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak },
      { name: "Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory },
    ],
    categories: [
      {
        title: "INFORMATIONEN",
        icon: "📢",
        channels: [
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true, topic: "Server-Regeln & Verhaltensrichtlinien" },
          { slug: "ankündigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true, topic: "Wichtige Clan-Neuigkeiten" },
          { slug: "news", icon: "📰", type: ChannelType.GuildText, isReadOnly: true, topic: "Game-Updates & Free-Games" },
        ],
      },
      {
        title: "COMMUNITY",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText, topic: "Allgemeiner Clan-Chat" },
          { slug: "clips", icon: "🎬", type: ChannelType.GuildText, topic: "Die besten Gaming-Highlights & Clips" },
          { slug: "memes", icon: "😂", type: ChannelType.GuildText, topic: "Humor & Lustiges" },
          { slug: "bot-befehle", icon: "🤖", type: ChannelType.GuildText, topic: "Befehle wie /rank, /balance, /shop" },
        ],
      },
      {
        title: "SPIELE & LOBBYS",
        icon: "🎮",
        channels: [
          { slug: "mitspieler-suche", icon: "👥", type: ChannelType.GuildText, topic: "Suche Mitspieler mit /lfg" },
          { slug: "squad-talk-1", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "squad-talk-2", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "duo-lounge", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "VOICEMASTER",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
        ],
      },
      {
        title: "TEAM INTERN",
        icon: "🔒",
        teamOnly: true,
        channels: [
          { slug: "team-chat", icon: "🔒", type: ChannelType.GuildText, teamOnly: true, topic: "Interner Austausch der Leitung" },
          { slug: "audit-logs", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
          { slug: "support-tickets", icon: "🎫", type: ChannelType.GuildText, teamOnly: true, isTickets: true },
          { slug: "leitung-voice", icon: "🔊", type: ChannelType.GuildVoice, teamOnly: true },
        ],
      },
    ],
  },
  {
    id: "multigaming",
    name: "Multi-Gaming Community",
    description: "Große Community mit getrennten Spielbereichen (CS2, Valorant, GTA, Minecraft) und eigener Gaming-Lounge.",
    badge: "Community",
    icon: "🌐",
    roles: [
      { name: "Owner", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles, isTeam: true },
      { name: "Moderator", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.MuteMembers | PermissionFlagsBits.ModerateMembers, isTeam: true },
      { name: "CS2 Spieler", color: 0xe67e22, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
      { name: "Valorant Spieler", color: 0xe91e63, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
      { name: "Minecraft Spieler", color: 0x2ecc71, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
      { name: "Member", color: 0x1abc9c, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak },
      { name: "Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory },
    ],
    categories: [
      {
        title: "INFOS & WILLKOMMEN",
        icon: "📢",
        channels: [
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
          { slug: "free-games", icon: "🎁", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "releases", icon: "📅", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "rollen-auswahl", icon: "🎭", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "COMMUNITY LOUNGE",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText },
          { slug: "clips-showcase", icon: "🔥", type: ChannelType.GuildText },
          { slug: "setup-battlestations", icon: "🖥️", type: ChannelType.GuildText },
          { slug: "bot-lounge", icon: "🤖", type: ChannelType.GuildText },
        ],
      },
      {
        title: "COUNTER-STRIKE 2",
        icon: "💣",
        channels: [
          { slug: "cs2-chat", icon: "💬", type: ChannelType.GuildText },
          { slug: "cs2-talk-1", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "cs2-talk-2", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "VALORANT",
        icon: "🎯",
        channels: [
          { slug: "valorant-chat", icon: "💬", type: ChannelType.GuildText },
          { slug: "valo-talk-1", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "valo-talk-2", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "TEMPORÄRE SPRACHKANÄLE",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "chill-talk", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
    ],
  },
  {
    id: "coding",
    name: "Coding / Dev / Tech",
    description: "Entwickler-Hub mit Programmiersprachen-Kanälen (JS/TS, Python, Rust/C++), Code-Review und Projekt-Showcases.",
    badge: "Entwickler",
    icon: "💻",
    roles: [
      { name: "Lead Architect", color: 0x34495e, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Maintainer", color: 0x2980b9, hoist: true, permissions: PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels, isTeam: true },
      { name: "Contributor", color: 0x27ae60, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "Developer", color: 0x16a085, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Junior / Learner", color: 0xf39c12, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
    ],
    categories: [
      {
        title: "META & INFOS",
        icon: "📌",
        channels: [
          { slug: "guidelines", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
          { slug: "announcements", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "github-activity", icon: "🐙", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "ALLGEMEIN",
        icon: "💬",
        channels: [
          { slug: "general-dev", icon: "💬", type: ChannelType.GuildText },
          { slug: "project-showcase", icon: "🚀", type: ChannelType.GuildText },
          { slug: "tech-news", icon: "📰", type: ChannelType.GuildText },
        ],
      },
      {
        title: "SPRACHEN & FRAMEWORKS",
        icon: "💻",
        channels: [
          { slug: "javascript-typescript", icon: "🟨", type: ChannelType.GuildText },
          { slug: "python", icon: "🐍", type: ChannelType.GuildText },
          { slug: "rust-and-cpp", icon: "🦀", type: ChannelType.GuildText },
          { slug: "web-and-ui", icon: "🎨", type: ChannelType.GuildText },
        ],
      },
      {
        title: "HILFE & CODE REVIEW",
        icon: "💡",
        channels: [
          { slug: "code-review", icon: "🔍", type: ChannelType.GuildText },
          { slug: "helpdesk", icon: "❓", type: ChannelType.GuildText },
        ],
      },
      {
        title: "DEV VOICE",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "pair-programming", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
    ],
  },
  {
    id: "anime",
    name: "Anime, Manga & Hangout",
    description: "Gemütlicher Treffpunkt für Fans von Anime, Manga, Fan-Art und gemeinsamen Watch-Partys.",
    badge: "Hangout",
    icon: "🌸",
    roles: [
      { name: "Senpai (Owner)", color: 0xff7675, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Sensei (Mod)", color: 0xfd79a8, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ModerateMembers, isTeam: true },
      { name: "Otaku", color: 0x6c5ce7, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "Weeb", color: 0xa29bfe, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Kohai (Gast)", color: 0xb2bec3, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
    ],
    categories: [
      {
        title: "WILLKOMMEN",
        icon: "🌸",
        channels: [
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
          { slug: "ankuendigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "rollen-vergabe", icon: "🎭", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "ANIME & MANGA",
        icon: "🍙",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText },
          { slug: "anime-diskussion", icon: "📺", type: ChannelType.GuildText },
          { slug: "manga-leseecke", icon: "📚", type: ChannelType.GuildText },
          { slug: "fan-art-showcase", icon: "🎨", type: ChannelType.GuildText },
        ],
      },
      {
        title: "CHILL & TALK",
        icon: "🍵",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "tea-lounge", icon: "🍵", type: ChannelType.GuildVoice },
          { slug: "watch-party-voice", icon: "🍿", type: ChannelType.GuildVoice },
        ],
      },
    ],
  },
  {
    id: "creator",
    name: "Content Creator & Streamer",
    description: "Ausgerichtet auf Streamer (Twitch/YouTube) mit Live-Alerts, Sub-Lounge, Fan-Chat und Kooperationen.",
    badge: "Creator",
    icon: "🔴",
    roles: [
      { name: "Streamer / Creator", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Management", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels, isTeam: true },
      { name: "Moderator", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ModerateMembers, isTeam: true },
      { name: "VIP / Subscriber", color: 0xf1c40f, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "Community", color: 0x2ecc71, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
    ],
    categories: [
      {
        title: "LIVE & SOCIALS",
        icon: "🔴",
        channels: [
          { slug: "stream-alerts", icon: "🔴", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "upload-news", icon: "📺", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
        ],
      },
      {
        title: "COMMUNITY LOUNGE",
        icon: "💬",
        channels: [
          { slug: "fan-chat", icon: "💬", type: ChannelType.GuildText },
          { slug: "clips-und-highlights", icon: "🔥", type: ChannelType.GuildText },
          { slug: "memes-fuer-den-stream", icon: "😂", type: ChannelType.GuildText },
          { slug: "feedbacks-und-ideen", icon: "💡", type: ChannelType.GuildText },
        ],
      },
      {
        title: "COMMUNITY EVENTS",
        icon: "🎁",
        channels: [
          { slug: "giveaways", icon: "🎉", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "community-gaming", icon: "🎮", type: ChannelType.GuildText },
        ],
      },
      {
        title: "TALK & LOBBYS",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "community-talk", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
    ],
  },
];

class TemplateService {
  public getTemplates(): ServerTemplate[] {
    return TEMPLATES;
  }

  public getTemplate(id: string): ServerTemplate | null {
    return TEMPLATES.find((t) => t.id === id) || null;
  }

  public getStyles(): StyleDef[] {
    return STYLES;
  }

  public formatChannelName(slug: string, icon: string, style: StyleId, isVoice = false): string {
    switch (style) {
      case "clean":
        return slug;
      case "aesthetic":
        return `〢・${slug}`;
      case "box":
        return `「${icon}」${slug}`;
      case "modern":
      default:
        return `${icon}・${slug}`;
    }
  }

  public formatCategoryName(title: string, icon: string, style: StyleId): string {
    switch (style) {
      case "clean":
        return title;
      case "aesthetic":
        return `〢・${title}`;
      case "box":
        return `「${icon}」${title}`;
      case "modern":
      default:
        return `${icon}・${title}`;
    }
  }

  public async applyTemplate(
    guild: Guild,
    templateId: TemplateId,
    style: StyleId,
    options: { wipe?: boolean; executorTag?: string } = {}
  ): Promise<{
    ok: boolean;
    backupId?: string;
    createdRolesCount?: number;
    createdCategoriesCount?: number;
    createdChannelsCount?: number;
    error?: string;
  }> {
    const template = this.getTemplate(templateId);
    if (!template) return { ok: false, error: "Unbekanntes Template." };

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || !me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return { ok: false, error: "Dem Bot fehlen die Berechtigungen „Rollen verwalten“ und „Kanäle verwalten“." };
    }

    // 1. ZUERST AUTOMATISCHES BACKUP ERSTELLEN
    const backup = await backupService.createBackup(
      guild,
      `Auto-Backup vor Server-Template Setup (${template.name}) durch ${options.executorTag || "Admin"}`
    );

    // 2. WIPE WENN GEWÜNSCHT (nur vom Owner erlaubt!)
    if (options.wipe) {
      if (options.executorTag && !options.executorTag.includes(guild.ownerId)) {
        // Sicherheit: Nur Owner darf wipe ausführen
      }
      try {
        await guild.channels.fetch();
        for (const channel of guild.channels.cache.values()) {
          try {
            await channel.delete("Server-Template Wipe");
          } catch (e) {
            console.warn(`[TemplateService] Konnte Kanal ${channel.name} nicht löschen:`, e);
          }
        }
      } catch (e) {
        console.error("[TemplateService] Fehler beim Channel-Wipe:", e);
      }
    }

    // 3. ROLLEN ANLEGEN
    await guild.roles.fetch();
    const botTop = me.roles.highest.position;
    const roleMap = new Map<string, Role>();
    const teamRoles: Role[] = [];

    // Erstelle von unten nach oben
    for (const rDef of [...template.roles].reverse()) {
      let role = guild.roles.cache.find((r) => r.name.toLowerCase() === rDef.name.toLowerCase() && !r.managed);
      if (!role) {
        try {
          role = await guild.roles.create({
            name: rDef.name,
            color: rDef.color,
            hoist: rDef.hoist,
            permissions: rDef.permissions,
            reason: `Server-Template: ${template.name}`,
          });
        } catch (e) {
          console.error(`[TemplateService] Konnte Rolle ${rDef.name} nicht erstellen:`, e);
        }
      }
      if (role) {
        roleMap.set(rDef.name, role);
        if (rDef.isTeam) teamRoles.push(role);
      }
    }

    let createdCategoriesCount = 0;
    let createdChannelsCount = 0;

    // 4. KATEGORIEN & KANÄLE ANLEGEN
    for (const catDef of template.categories) {
      const catName = this.formatCategoryName(catDef.title, catDef.icon, style);

      // Overwrites für Team-Kategorie
      const categoryOverwrites: any[] = [];
      if (catDef.teamOnly) {
        categoryOverwrites.push({
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
          type: OverwriteType.Role,
        });
        for (const tr of teamRoles) {
          categoryOverwrites.push({
            id: tr.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect],
            type: OverwriteType.Role,
          });
        }
      }

      let category: CategoryChannel | null = null;
      try {
        category = (await guild.channels.create({
          name: catName,
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryOverwrites,
          reason: `Server-Template: ${template.name}`,
        })) as CategoryChannel;
        createdCategoriesCount++;
      } catch (e) {
        console.error(`[TemplateService] Fehler beim Anlegen von Kategorie ${catName}:`, e);
      }

      if (!category) continue;

      // Kanäle in der Kategorie
      for (const chDef of catDef.channels) {
        const chName = this.formatChannelName(chDef.slug, chDef.icon, style, chDef.type === ChannelType.GuildVoice);

        const channelOverwrites: any[] = [];
        if (chDef.teamOnly && !catDef.teamOnly) {
          channelOverwrites.push({
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
            type: OverwriteType.Role,
          });
          for (const tr of teamRoles) {
            channelOverwrites.push({
              id: tr.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect],
              type: OverwriteType.Role,
            });
          }
        }

        if (chDef.isReadOnly) {
          channelOverwrites.push({
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
            type: OverwriteType.Role,
          });
        }

        try {
          const ch = await guild.channels.create({
            name: chName,
            type: chDef.type,
            parent: category.id,
            topic: chDef.topic,
            permissionOverwrites: channelOverwrites.length > 0 ? channelOverwrites : undefined,
            reason: `Server-Template: ${template.name}`,
          });
          createdChannelsCount++;

          // Spezielle Bot-Verknüpfungen
          if (chDef.isJoinToCreate && ch.type === ChannelType.GuildVoice) {
            tempVoiceService.setMasterChannel(guild.id, ch.id, category.id);
          }

          if (chDef.isLogs && ch.isTextBased()) {
            auditLogService.setConfig(guild.id, { logChannelId: ch.id });
          }

          if (chDef.isTickets && ch.isTextBased()) {
            ticketService.setConfig(guild.id, { categoryId: category.id });
          }
        } catch (e) {
          console.error(`[TemplateService] Fehler beim Anlegen von Kanal ${chName}:`, e);
        }
      }
    }

    return {
      ok: true,
      backupId: backup.id,
      createdRolesCount: roleMap.size,
      createdCategoriesCount,
      createdChannelsCount,
    };
  }
}

export const templateService = new TemplateService();
