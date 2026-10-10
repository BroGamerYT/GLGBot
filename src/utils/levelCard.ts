import { EmbedBuilder, Guild, User } from "discord.js";
import { statsService } from "../services/statsService";
import { BRANDING } from "../config/branding";

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
      { name: "🎙️ Voice-Zeit", value: statsService.formatMinutes(stats.voiceMinutes), inline: true }
    )
    .setFooter({ text: `${BRANDING.community} Level-System` })
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
