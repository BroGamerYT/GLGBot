import {
  ChannelType,
  Guild,
  PermissionFlagsBits,
  OverwriteType,
  CategoryChannel,
  Role,
} from "discord.js";
import { backupService } from "./backupService";
import { tempVoiceService } from "./tempVoiceService";
import { auditLogService } from "./auditLogService";
import { ticketService } from "./ticketService";
import { CHANNEL_STYLES, ChannelStylePreset } from "../utils/fontUtils";

export type TemplateId =
  | "starter"
  | "gaming"
  | "multigaming"
  | "community_mega"
  | "esports_pro"
  | "coding"
  | "anime"
  | "creator";

export type StyleId =
  | "modern"
  | "clean"
  | "smallcaps"
  | "boldsans"
  | "aesthetic_caps"
  | "aesthetic"
  | "box_caps"
  | "box"
  | "cyber"
  | "gothic";

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
  permissions: bigint | string;
  isTeam?: boolean;
}

export interface ServerTemplate {
  id: TemplateId;
  name: string;
  description: string;
  badge: string;
  size: "kompakt" | "standard" | "gross" | "mega";
  sizeLabel: string;
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

export const STYLES: StyleDef[] = CHANNEL_STYLES.map((cs) => ({
  id: cs.id as StyleId,
  name: cs.name,
  description: cs.description,
  sampleText: cs.sampleText,
  sampleVoice: cs.sampleVoice,
}));

export const TEMPLATES: ServerTemplate[] = [
  // 1. KOMPAKT: Starter
  {
    id: "starter",
    name: "Minimal Starter (Schlank)",
    description: "Kompakt, aufgeräumt und übersichtlich für Freunde, Kleingruppen oder neue Server – ohne unnötigen Ballast.",
    badge: "Kompakt",
    size: "kompakt",
    sizeLabel: "Kompakt (3 Kategorien, 7 Kanäle)",
    icon: "🌱",
    roles: [
      { name: "Owner", color: 0x5865f2, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Mod", color: 0x57f287, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.KickMembers, isTeam: true },
      { name: "Freunde", color: 0xfee75c, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.Connect },
      { name: "Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory },
    ],
    categories: [
      {
        title: "INFOS",
        icon: "📌",
        channels: [
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true, topic: "Server-Regeln" },
          { slug: "ankuendigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true, topic: "Wichtige Ankündigungen" },
        ],
      },
      {
        title: "COMMUNITY",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText, topic: "Allgemeiner Austausch" },
          { slug: "medien-und-clips", icon: "📸", type: ChannelType.GuildText, topic: "Bilder, Screenshots & Clips" },
        ],
      },
      {
        title: "TALK",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "talk-lounge", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "afk", icon: "💤", type: ChannelType.GuildVoice },
        ],
      },
    ],
  },

  // 2. STANDARD: Gaming Clan & E-Sport
  {
    id: "gaming",
    name: "Gaming Clan & E-Sport",
    description: "Perfekt strukturiert für Clans, Teams und ambitionierte Gamer mit Lobbys, Info-Hub und geschütztem Team-Bereich.",
    badge: "Clan & Team",
    size: "standard",
    sizeLabel: "Standard (5 Kategorien, 16 Kanäle)",
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
          { slug: "ankuendigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true, topic: "Wichtige Clan-Neuigkeiten" },
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

  // 3. GROSS: Multi-Gaming Community
  {
    id: "multigaming",
    name: "Multi-Gaming Community",
    description: "Große Community mit getrennten Spielbereichen (CS2, Valorant, GTA, Minecraft) und eigener Gaming-Lounge.",
    badge: "Community",
    size: "gross",
    sizeLabel: "Groß (6 Kategorien, 22 Kanäle)",
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
          { slug: "ankuendigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "rollen-wahl", icon: "🎭", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "COMMUNITY CHAT",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText },
          { slug: "offtopic", icon: "☕", type: ChannelType.GuildText },
          { slug: "hardware-und-tech", icon: "💻", type: ChannelType.GuildText },
          { slug: "clips-und-memes", icon: "🎬", type: ChannelType.GuildText },
        ],
      },
      {
        title: "GAME NEWS & DEALS",
        icon: "📰",
        channels: [
          { slug: "free-games", icon: "🎁", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "game-news", icon: "📰", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "treiber-software", icon: "🖥️", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "SPIEL-BEREICHE",
        icon: "🎯",
        channels: [
          { slug: "cs2-chat", icon: "🔫", type: ChannelType.GuildText },
          { slug: "valorant-chat", icon: "🏹", type: ChannelType.GuildText },
          { slug: "minecraft-chat", icon: "⛏️", type: ChannelType.GuildText },
          { slug: "lfg-mitspieler", icon: "🤝", type: ChannelType.GuildText },
        ],
      },
      {
        title: "TALK & LOBBYS",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "community-lounge", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "trio-talk", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "squad-talk", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "SUPPORT & TEAM",
        icon: "🛡️",
        channels: [
          { slug: "tickets", icon: "🎫", type: ChannelType.GuildText, isTickets: true },
          { slug: "team-intern", icon: "🔒", type: ChannelType.GuildText, teamOnly: true },
          { slug: "audit-logs", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
          { slug: "team-voice", icon: "🔊", type: ChannelType.GuildVoice, teamOnly: true },
        ],
      },
    ],
  },

  // 4. MEGA: Mega-Community & Netzwerk
  {
    id: "community_mega",
    name: "Mega-Community & Netzwerk",
    description: "Das ultimative Flaggschiff: Voll ausgestattete Riesen-Community mit VIP-Bereich, Event-Bühnen, Gaming-Hub, Support & interner Leitung.",
    badge: "Flaggschiff",
    size: "mega",
    sizeLabel: "Mega (8 Kategorien, 32 Kanäle)",
    icon: "🏰",
    roles: [
      { name: "👑 Community Owner", color: 0xf1c40f, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "🛡️ Head-Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "⚔️ Moderator", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.KickMembers | PermissionFlagsBits.MuteMembers, isTeam: true },
      { name: "💎 Server-Booster", color: 0xf47fff, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.UseExternalEmojis },
      { name: "⭐ VIP Community", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "🌟 Veteran Member", color: 0x2ecc71, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.Connect },
      { name: "🎮 Community Member", color: 0x1abc9c, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.Connect },
      { name: "🌱 Neuer Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory },
    ],
    categories: [
      {
        title: "WILLKOMMEN & INFOS",
        icon: "📌",
        channels: [
          { slug: "willkommen", icon: "👋", type: ChannelType.GuildText, isReadOnly: true, topic: "Herzlich willkommen in der Community!" },
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true, topic: "Regelwerk & Richtlinien" },
          { slug: "ankuendigungen", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true, topic: "Offizielle Server-Ankündigungen" },
          { slug: "rollen-vergabe", icon: "🎭", type: ChannelType.GuildText, isReadOnly: true, topic: "Klicke deine Rollen an" },
          { slug: "server-status", icon: "📊", type: ChannelType.GuildText, isReadOnly: true, topic: "Server-Statistiken & Online-Status" },
        ],
      },
      {
        title: "COMMUNITY HUB",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText, topic: "Zentraler Community Chat" },
          { slug: "ideen-und-feedback", icon: "💡", type: ChannelType.GuildText, topic: "Deine Vorschläge für den Server" },
          { slug: "clips-und-highlights", icon: "🎬", type: ChannelType.GuildText, topic: "Beste Momente & Clips" },
          { slug: "memes-und-spaß", icon: "😂", type: ChannelType.GuildText, topic: "Memes & Humor" },
          { slug: "level-und-bot-spam", icon: "🤖", type: ChannelType.GuildText, topic: "Bot-Befehle wie /rank, /shop, /daily" },
        ],
      },
      {
        title: "GAMING ZENTRALE",
        icon: "🎮",
        channels: [
          { slug: "mitspieler-suche", icon: "🤝", type: ChannelType.GuildText, topic: "Finde Mitspieler mit /lfg" },
          { slug: "game-news", icon: "📰", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "free-games-feed", icon: "🎁", type: ChannelType.GuildText, isReadOnly: true },
          { slug: "hardware-und-talk", icon: "🖥️", type: ChannelType.GuildText },
        ],
      },
      {
        title: "VOICE LOUNGES",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "haupt-lounge", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "chill-ecke", icon: "☕", type: ChannelType.GuildVoice },
          { slug: "duo-talk-1", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "squad-talk-1", icon: "🔊", type: ChannelType.GuildVoice },
          { slug: "afk-parkplatz", icon: "💤", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "EVENTS & BÜHNE",
        icon: "🎪",
        channels: [
          { slug: "event-ankuendigung", icon: "📢", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "community-buehne", icon: "🎙️", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "VIP & BOOSTER",
        icon: "⭐",
        channels: [
          { slug: "booster-chat", icon: "💎", type: ChannelType.GuildText, topic: "Exklusiver Chat für Booster & VIPs" },
          { slug: "vip-talk", icon: "🌟", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "SUPPORT & HILFE",
        icon: "🎫",
        channels: [
          { slug: "support-tickets", icon: "🎫", type: ChannelType.GuildText, isTickets: true },
          { slug: "faq-anleitung", icon: "❓", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "TEAM INTERN",
        icon: "🔒",
        teamOnly: true,
        channels: [
          { slug: "leitungs-chat", icon: "👑", type: ChannelType.GuildText, teamOnly: true },
          { slug: "moderation-intern", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true },
          { slug: "audit-logs", icon: "📜", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
          { slug: "team-besprechung", icon: "🔊", type: ChannelType.GuildVoice, teamOnly: true },
        ],
      },
    ],
  },

  // 5. GROSS: E-Sport & Turniere Pro
  {
    id: "esports_pro",
    name: "E-Sport & Turniere (Pro)",
    description: "Wettkampforientiertes Setup für E-Sport Teams, Scrims, Matches, Taktikbesprechungen, Caster und Turniere.",
    badge: "E-Sport Pro",
    size: "gross",
    sizeLabel: "Groß (6 Kategorien, 20 Kanäle)",
    icon: "🏆",
    roles: [
      { name: "Orga-Leitung", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Head-Coach", color: 0xe67e22, hoist: true, permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.MoveMembers, isTeam: true },
      { name: "Team-Captain", color: 0xf1c40f, hoist: true, permissions: PermissionFlagsBits.PrioritySpeaker | PermissionFlagsBits.MoveMembers },
      { name: "Main-Roster", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.Stream },
      { name: "Sub / Academy", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Caster / Analyst", color: 0x1abc9c, hoist: true, permissions: PermissionFlagsBits.Stream | PermissionFlagsBits.PrioritySpeaker },
      { name: "Gast / Fan", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
    ],
    categories: [
      {
        title: "INFOS & TOURNAMENTS",
        icon: "📢",
        channels: [
          { slug: "regeln-und-termine", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
          { slug: "turnier-ankuendigungen", icon: "🏆", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "match-ergebnisse", icon: "📊", type: ChannelType.GuildText, isReadOnly: true },
        ],
      },
      {
        title: "SCRIMS & MATCHES",
        icon: "⚔️",
        channels: [
          { slug: "scrim-suche", icon: "🎯", type: ChannelType.GuildText },
          { slug: "match-lobby-a", icon: "🔴", type: ChannelType.GuildVoice },
          { slug: "match-lobby-b", icon: "🔵", type: ChannelType.GuildVoice },
          { slug: "caster-und-analysten", icon: "🎙️", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "TAKTIK & VOD REVIEW",
        icon: "📋",
        channels: [
          { slug: "taktik-board", icon: "📌", type: ChannelType.GuildText },
          { slug: "vod-review-clips", icon: "🎬", type: ChannelType.GuildText },
          { slug: "taktik-besprechung", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "COMMUNITY & FANS",
        icon: "💬",
        channels: [
          { slug: "hauptchat", icon: "💬", type: ChannelType.GuildText },
          { slug: "fan-lounge", icon: "🔊", type: ChannelType.GuildVoice },
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
        title: "ORGA INTERN",
        icon: "🔒",
        teamOnly: true,
        channels: [
          { slug: "orga-chat", icon: "🔒", type: ChannelType.GuildText, teamOnly: true },
          { slug: "audit-logs", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
          { slug: "orga-voice", icon: "🔊", type: ChannelType.GuildVoice, teamOnly: true },
        ],
      },
    ],
  },

  // 6. STANDARD: Coding & Tech
  {
    id: "coding",
    name: "Coding / Dev / Tech",
    description: "Strukturiert für Entwickler, Open-Source-Projekte und Tech-Enthusiasten mit Programmiersprachen-Foren und Code-Reviews.",
    badge: "Entwickler",
    size: "standard",
    sizeLabel: "Standard (5 Kategorien, 15 Kanäle)",
    icon: "💻",
    roles: [
      { name: "Lead Dev (Owner)", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Maintainer (Admin)", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels, isTeam: true },
      { name: "Senior Dev", color: 0x2ecc71, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "Developer", color: 0x1abc9c, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Gast", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
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

  // 7. STANDARD: Anime & Manga
  {
    id: "anime",
    name: "Anime, Manga & Hangout",
    description: "Gemütlicher Treffpunkt für Fans von Anime, Manga, Fan-Art und gemeinsamen Watch-Partys.",
    badge: "Hangout",
    size: "standard",
    sizeLabel: "Standard (5 Kategorien, 16 Kanäle)",
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
          { slug: "offtopic", icon: "☕", type: ChannelType.GuildText },
          { slug: "memes-and-gifs", icon: "✨", type: ChannelType.GuildText },
          { slug: "bot-lounge", icon: "🤖", type: ChannelType.GuildText },
        ],
      },
      {
        title: "WATCH PARTYS & TALK",
        icon: "🍿",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "watch-party-kino", icon: "🎬", type: ChannelType.GuildVoice },
          { slug: "chill-lounge", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "TEAM",
        icon: "🔒",
        teamOnly: true,
        channels: [
          { slug: "mod-chat", icon: "🔒", type: ChannelType.GuildText, teamOnly: true },
          { slug: "audit-logs", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
        ],
      },
    ],
  },

  // 8. STANDARD: Creator & Streamer
  {
    id: "creator",
    name: "Content Creator & Streamer",
    description: "Fokussiert auf Streamer (Twitch/YouTube) und YouTuber mit Live-Alerts, Community-Interaktion und VIP-Bereich.",
    badge: "Streamer",
    size: "standard",
    sizeLabel: "Standard (5 Kategorien, 14 Kanäle)",
    icon: "🔴",
    roles: [
      { name: "Creator (Owner)", color: 0x9b59b6, hoist: true, permissions: PermissionFlagsBits.Administrator, isTeam: true },
      { name: "Stream-Mod", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ModerateMembers, isTeam: true },
      { name: "VIP Subscriber", color: 0xf1c40f, hoist: true, permissions: PermissionFlagsBits.AttachFiles | PermissionFlagsBits.EmbedLinks },
      { name: "Community", color: 0x3498db, hoist: true, permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
      { name: "Zuschauer", color: 0x95a5a6, hoist: false, permissions: PermissionFlagsBits.ViewChannel },
    ],
    categories: [
      {
        title: "STREAM HUB",
        icon: "🔴",
        channels: [
          { slug: "regeln", icon: "📜", type: ChannelType.GuildText, isRules: true, isReadOnly: true },
          { slug: "stream-alerts", icon: "📺", type: ChannelType.GuildAnnouncement, isReadOnly: true },
          { slug: "uploads-und-videos", icon: "🎬", type: ChannelType.GuildAnnouncement, isReadOnly: true },
        ],
      },
      {
        title: "COMMUNITY",
        icon: "💬",
        channels: [
          { slug: "chat", icon: "💬", type: ChannelType.GuildText },
          { slug: "stream-ideen", icon: "💡", type: ChannelType.GuildText },
          { slug: "fan-art-memes", icon: "🎨", type: ChannelType.GuildText },
        ],
      },
      {
        title: "VIP & SUBS",
        icon: "⭐",
        channels: [
          { slug: "sub-lounge", icon: "💎", type: ChannelType.GuildText },
          { slug: "sub-talk", icon: "🌟", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "COMMUNITY TALK",
        icon: "🔊",
        channels: [
          { slug: "lobby-erstellen", icon: "➕", type: ChannelType.GuildVoice, isJoinToCreate: true },
          { slug: "community-talk", icon: "🔊", type: ChannelType.GuildVoice },
        ],
      },
      {
        title: "TEAM INTERN",
        icon: "🔒",
        teamOnly: true,
        channels: [
          { slug: "mod-intern", icon: "🔒", type: ChannelType.GuildText, teamOnly: true },
          { slug: "audit-logs", icon: "🛡️", type: ChannelType.GuildText, teamOnly: true, isLogs: true, isReadOnly: true },
        ],
      },
    ],
  },
];

class TemplateService {
  public getTemplates(): ServerTemplate[] {
    return TEMPLATES.map((t) => ({
      ...t,
      roles: t.roles.map((r) => ({
        ...r,
        permissions: r.permissions.toString(),
      })),
    }));
  }

  public getTemplate(id: string): ServerTemplate | null {
    return TEMPLATES.find((t) => t.id === id) || null;
  }

  public getStyles(): StyleDef[] {
    return STYLES;
  }

  public formatChannelName(slug: string, icon: string, style: StyleId, isVoice = false): string {
    const preset = CHANNEL_STYLES.find((s) => s.id === style) || CHANNEL_STYLES[0];
    return isVoice ? preset.formatVoice(slug, icon) : preset.formatText(slug, icon);
  }

  public formatCategoryName(title: string, icon: string, style: StyleId): string {
    const preset = CHANNEL_STYLES.find((s) => s.id === style) || CHANNEL_STYLES[0];
    return preset.formatCategory(title, icon);
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
            permissions: BigInt(rDef.permissions),
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
