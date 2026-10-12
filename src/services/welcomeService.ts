import { AttachmentBuilder, Guild, GuildMember, TextChannel } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { renderWelcomeCard } from "../utils/cards";
import { moduleService } from "./moduleService";
import { rolePanelService } from "./rolePanelService";

/**
 * Willkommens-Nachricht mit grafischer Karte im eingestellten Kanal.
 * Optional: automatische Rolle beim Beitritt - nur wenn die Regel-Sperre AUS ist
 * (sonst bekäme man ohne Regeln zu lesen Zugriff auf den Server).
 */
export interface WelcomeConfig {
  channelId?: string;
  title: string;
  message: string;
  subtitle: string;
  accent: string;
  card: boolean;
  autoRoleId?: string;
  backgroundImageUrl?: string;
}

export const WELCOME_DEFAULTS: WelcomeConfig = {
  title: "Willkommen!",
  message: "👋 Hey {user}, willkommen auf **{server}**! Schau dir zuerst die Regeln an.",
  subtitle: "Du bist Mitglied #{count} auf {server}",
  accent: "#5865f2",
  card: true,
  backgroundImageUrl: undefined,
};

const store = new GuildStore<WelcomeConfig>("welcome.json", () => ({ ...WELCOME_DEFAULTS }));

function fill(text: string, member: GuildMember) {
  const count = member.guild.memberCount ?? 0;
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{name}/g, member.displayName)
    .replace(/{server}/g, member.guild.name)
    .replace(/{count}/g, count.toLocaleString("de-DE"));
}

function fillPlain(text: string, member: GuildMember) {
  return fill(text, member).replace(/<@\d+>/g, member.displayName);
}

class WelcomeService {
  public getConfig(guildId: string): WelcomeConfig {
    return store.get(guildId);
  }

  public setConfig(guildId: string, patch: Partial<WelcomeConfig>) {
    return store.update(guildId, (c) => {
      if (patch.channelId !== undefined) c.channelId = patch.channelId || undefined;
      if (typeof patch.title === "string") c.title = patch.title.trim().slice(0, 40) || WELCOME_DEFAULTS.title;
      if (typeof patch.message === "string") c.message = patch.message.trim().slice(0, 1500);
      if (typeof patch.subtitle === "string") c.subtitle = patch.subtitle.trim().slice(0, 120);
      if (typeof patch.accent === "string" && /^#[0-9a-f]{6}$/i.test(patch.accent)) c.accent = patch.accent;
      if (typeof patch.card === "boolean") c.card = patch.card;
      if (patch.autoRoleId !== undefined) c.autoRoleId = patch.autoRoleId || undefined;
      if (patch.backgroundImageUrl !== undefined) {
        c.backgroundImageUrl = patch.backgroundImageUrl && patch.backgroundImageUrl.trim().length > 0 ? patch.backgroundImageUrl.trim() : undefined;
      }
    });
  }

  /** Ist die Regel-Sperre aktiv? Dann wird keine automatische Rolle vergeben. */
  public isRuleLockActive(guildId: string) {
    return !!rolePanelService.getConfig(guildId)?.serverLocked;
  }

  public async buildCard(member: GuildMember, cfg = this.getConfig(member.guild.id)) {
    const png = await renderWelcomeCard({
      avatarUrl: member.displayAvatarURL({ extension: "png", size: 256 }),
      displayName: member.displayName,
      guildName: member.guild.name,
      memberCount: member.guild.memberCount,
      title: cfg.title,
      subtitle: cfg.subtitle ? fillPlain(cfg.subtitle, member) : undefined,
      accent: cfg.accent,
      backgroundImageUrl: cfg.backgroundImageUrl,
    });
    return new AttachmentBuilder(png, { name: "willkommen.png" });
  }

  /** Willkommens-Nachricht senden (auch für den Test-Knopf im Dashboard). */
  public async sendWelcome(member: GuildMember, test = false) {
    const cfg = this.getConfig(member.guild.id);
    const channel = cfg.channelId ? (member.guild.channels.cache.get(cfg.channelId) as TextChannel | undefined) : undefined;
    if (!channel || !channel.isTextBased()) throw new Error("Kein Willkommens-Kanal eingestellt.");
    const files = cfg.card ? [await this.buildCard(member, cfg)] : [];
    const content = (test ? "🧪 **Test:** " : "") + (cfg.message ? fill(cfg.message, member) : "");
    await channel.send({
      content: content.trim() || undefined,
      files,
      allowedMentions: { users: test ? [] : [member.id] },
    });
  }

  public async handleJoin(member: GuildMember) {
    if (member.user.bot || !moduleService.isEnabled(member.guild.id, "welcome")) return;
    const cfg = this.getConfig(member.guild.id);

    if (cfg.autoRoleId && !this.isRuleLockActive(member.guild.id)) {
      await member.roles.add(cfg.autoRoleId, "Automatische Rolle beim Beitritt").catch((e) => console.warn(`[Welcome] Autorole: ${e?.message || e}`));
    }
    if (cfg.channelId) {
      await this.sendWelcome(member).catch((e) => console.warn(`[Welcome] ${member.guild.name}: ${e?.message || e}`));
    }
  }

  /** Vorschau-Bild als PNG (für das Dashboard). */
  public async preview(guild: Guild, memberId: string, patch: Partial<WelcomeConfig>) {
    const member = await guild.members.fetch(memberId).catch(() => null);
    if (!member) throw new Error("Mitglied nicht gefunden.");
    const card = await this.buildCard(member, { ...this.getConfig(guild.id), ...patch });
    return card.attachment as Buffer;
  }
}

export const welcomeService = new WelcomeService();
