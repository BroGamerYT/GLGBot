import { AttachmentBuilder, EmbedBuilder, Guild, GuildMember, PermissionFlagsBits, User } from "discord.js";
import { renderRankCard } from "./cards";
import { statsService } from "../services/statsService";
import { dailyService } from "../services/dailyService";
import { moduleService } from "../services/moduleService";
import { economyService } from "../services/economyService";
import { BRANDING } from "../config/branding";

/**
 * Ermittelt verdiente Community-Badges und Aktivitäts-Meilensteine für ein Mitglied.
 */
export function getUserBadges(guild: Guild, user: User, member?: GuildMember | null): string[] {
  const badges: string[] = [];
  if (guild.ownerId === user.id) {
    badges.push("👑 Inhaber");
  } else if (member?.permissions.has(PermissionFlagsBits.Administrator)) {
    badges.push("🛡️ Admin");
  } else if (
    member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member?.permissions.has(PermissionFlagsBits.ModerateMembers)
  ) {
    badges.push("⚔️ Mod");
  }

  const profile = statsService.getUserProfile(guild.id, user.id);
  const cfg = statsService.getConfig(guild.id);
  const maxLevel = cfg.maxLevel ?? 25;
  const level = profile?.progress.level ?? 0;
  if (level >= maxLevel) {
    badges.push("👑 Max-Level");
  } else if (level >= 20) {
    badges.push("💎 Level 20+");
  } else if (level >= 10) {
    badges.push("⭐ Level 10+");
  } else if (level >= 5) {
    badges.push("⭐ Level 5+");
  }

  const streak = dailyService.getStreak(guild.id, user.id);
  if (streak >= 30) {
    badges.push("🔥 30d Serie");
  } else if (streak >= 7) {
    badges.push("🔥 7d Serie");
  }

  const messages = profile?.stats.messagesCount ?? 0;
  if (messages >= 1000) {
    badges.push("💬 1k+ Club");
  } else if (messages >= 250) {
    badges.push("💬 250+ Msgs");
  }

  const voiceMins = profile?.stats.voiceMinutes ?? 0;
  if (voiceMins >= 3000) {
    badges.push("🎙️ 50h Voice");
  } else if (voiceMins >= 600) {
    badges.push("🎙️ 10h Voice");
  }

  if (moduleService.isEnabled(guild.id, "economy")) {
    const coins = economyService.getBalance(guild.id, user.id);
    if (coins >= 10000) {
      badges.push("🪙 Tycoon");
    } else if (coins >= 1000) {
      badges.push("🪙 1k Coins");
    }
  }

  return badges;
}

/**
 * Rang-/Level-Karte für /rank und /level status.
 * Die XP-Schätzungen kommen aus den echten Level-Einstellungen (nicht fest eingetragen).
 */
export function buildLevelCard(guild: Guild, user: User, opts: { title?: string; showNextSteps?: boolean } = {}) {
  if (!statsService.getUserProfile(guild.id, user.id)) {
    statsService.getOrCreateUser(guild, user);
  }
  const { stats, rank, progress } = statsService.getUserProfile(guild.id, user.id)!;
  const cfg = statsService.getConfig(guild.id);

  const avgMsgXp = Math.round(((cfg.messageXpMin ?? 15) + (cfg.messageXpMax ?? 25)) / 2);
  const voiceXp = cfg.voiceXpPerMinute ?? 5;
  const cooldown = cfg.messageCooldownSeconds ?? 60;
  const maxLevel = cfg.maxLevel ?? 25;
  const streak = dailyService.getStreak(guild.id, user.id);

  const totalBars = 12;
  const filled = Math.round((progress.progressPercent / 100) * totalBars);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(0, totalBars - filled));

  const embed = new EmbedBuilder()
    .setColor(progress.isMaxLevel ? 0xffac33 : 0x5865f2)
    .setAuthor({ name: opts.title || `Rangkarte von ${user.tag || user.username}`, iconURL: user.displayAvatarURL() })
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "🏆 Rang", value: `#${rank}`, inline: true },
      { name: "⭐ Level", value: progress.isMaxLevel ? `${progress.level} 👑 MAX` : `${progress.level} / ${maxLevel}`, inline: true },
      { name: "✨ Gesamt-XP", value: `${stats.xp.toLocaleString("de-DE")} XP`, inline: true },
      {
        name: progress.isMaxLevel ? "👑 Maximales Level erreicht!" : `Fortschritt zu Level ${progress.level + 1}`,
        value: progress.isMaxLevel
          ? `\`[${"█".repeat(totalBars)}]\` **100 % (MAX LEVEL ${progress.level})**`
          : `\`[${bar}]\` **${progress.progressPercent} %** (${progress.currentXp.toLocaleString("de-DE")} / ${progress.requiredXp.toLocaleString("de-DE")} XP)`,
        inline: false,
      },
      { name: "💬 Chat-Nachrichten", value: stats.messagesCount.toLocaleString("de-DE"), inline: true },
      { name: "🎙️ Voice-Zeit", value: statsService.formatMinutes(stats.voiceMinutes), inline: true },
      { name: "🔥 Daily-Serie", value: streak > 0 ? `${streak} Tag(e)` : "0 Tage", inline: true }
    );

  if (moduleService.isEnabled(guild.id, "economy")) {
    const econCfg = economyService.getConfig(guild.id);
    const balance = economyService.getBalance(guild.id, user.id);
    embed.addFields({
      name: `${econCfg.currencySymbol} ${econCfg.currencyName}`,
      value: `${balance.toLocaleString("de-DE")} ${econCfg.currencySymbol}`,
      inline: true,
    });
  }

  const member = guild.members.cache.get(user.id);
  const badges = getUserBadges(guild, user, member);
  if (badges.length > 0) {
    embed.addFields({
      name: "🏅 Meilensteine & Badges",
      value: badges.map((b) => `\`${b}\``).join(" • "),
      inline: false,
    });
  }

  embed.setFooter({ text: `${BRANDING.community} Level-System` })
    .setTimestamp();

  if (opts.showNextSteps && !progress.isMaxLevel) {
    const missing = Math.max(0, progress.requiredXp - progress.currentXp);
    const msgs = Math.ceil(missing / Math.max(1, avgMsgXp));
    const mins = Math.ceil(missing / Math.max(1, voiceXp));
    embed.addFields({
      name: `🎯 Bis Level ${progress.level + 1} fehlen noch ${missing.toLocaleString("de-DE")} XP`,
      value:
        `Das sind ungefähr:\n` +
        `• 💬 **${msgs.toLocaleString("de-DE")} Nachrichten** (je ~${avgMsgXp} XP, höchstens alle ${cooldown} Sek. eine zählt)\n` +
        `• 🎙️ **${statsService.formatMinutes(mins)} im Voice** (${voiceXp} XP pro Minute)\n` +
        `• oder eine Mischung aus beidem`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "📊 Woher stammen die XP?",
      value:
        `• 💬 **Chat:** ~${(stats.messagesCount * avgMsgXp).toLocaleString("de-DE")} XP\n` +
        `• 🎙️ **Voice:** ~${(stats.voiceMinutes * voiceXp).toLocaleString("de-DE")} XP`,
      inline: false,
    });
  }
  return embed;
}

/** Grafische Rangkarte als PNG-Anhang (null, falls das Zeichnen fehlschlägt). */
export async function buildRankCardImage(guild: Guild, user: User): Promise<AttachmentBuilder | null> {
  try {
    if (!statsService.getUserProfile(guild.id, user.id)) statsService.getOrCreateUser(guild, user);
    const { stats, rank, progress } = statsService.getUserProfile(guild.id, user.id)!;
    const cfg = statsService.getConfig(guild.id);
    const member = await guild.members.fetch(user.id).catch(() => null);
    const badges = getUserBadges(guild, user, member);
    const png = await renderRankCard({
      avatarUrl: (member || user).displayAvatarURL({ extension: "png", size: 256 }),
      displayName: member?.displayName || user.globalName || user.username,
      username: user.username,
      level: progress.level,
      maxLevel: cfg.maxLevel ?? 25,
      isMaxLevel: progress.isMaxLevel,
      rank,
      totalXp: stats.xp,
      currentXp: progress.currentXp,
      requiredXp: progress.requiredXp,
      percent: progress.progressPercent,
      messages: stats.messagesCount,
      voice: statsService.formatMinutes(stats.voiceMinutes),
      streak: dailyService.getStreak(guild.id, user.id),
      badges,
    });
    return new AttachmentBuilder(png, { name: "rangkarte.png" });
  } catch (e) {
    console.error("[Rangkarte] Bild konnte nicht erstellt werden:", e);
    return null;
  }
}
