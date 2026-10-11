import { Events, Message, EmbedBuilder, MessageFlags } from "discord.js";
import { BotEvent } from "../types";
import { securityService } from "../services/securityService";
import { stickyService } from "../services/stickyService";
import { statsService } from "../services/statsService";
import { blacklistService } from "../services/blacklistService";
import { moduleService } from "../services/moduleService";
import { customCommandService } from "../services/customCommandService";
import { clipService } from "../services/clipService";
import { economyService } from "../services/economyService";

const messageCreateEvent: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (client, message: Message) => {
    // Ignoriere Nachrichten von Bots
    if (message.author.bot) return;

    // Phishing- & Scam-Schutz
    const isPhishing = await securityService.handlePhishingMessage(message, client);
    if (isPhishing) return;

    // Mass-Mention-Schutz (>5 Mentions)
    const isMassMention = await securityService.handleMassMention(message, client);
    if (isMassMention) return;

    // Wortfilter & Blacklist-Schutz (falls Moderations-Modul aktiv)
    if (!message.guild || moduleService.isEnabled(message.guild.id, "moderation")) {
      const isBlacklisted = await blacklistService.handleMessage(message, client);
      if (isBlacklisted) return;
    }

    // Sticky Messages aktualisieren (falls Sticky-Modul aktiv)
    if (!message.guild || moduleService.isEnabled(message.guild.id, "sticky")) {
      await stickyService.handleMessage(message);
    }

    // Entferne führendes @silent, falls die Nachricht lautlos gesendet wurde
    let content = message.content.trim().toLowerCase();
    const isSilent = content.startsWith("@silent") || message.flags.has(MessageFlags.SuppressNotifications);

    if (content.startsWith("@silent")) {
      content = content.replace(/^@silent\s*/, "").trim();
    }

    // Clip-Showcase (Clip-Kanal)
    if (message.guild) await clipService.handleMessage(message).catch(() => false);

    // Eigene Text-Befehle (!name)
    if (content.startsWith("!") && content !== "!ping" && (await customCommandService.handleMessage(message).catch(() => false))) return;

    // Reagiere auf !ping (auch wenn @silent davor stand) - ein einfaches "ping" im Chat löst nichts mehr aus
    if (content === "!ping") {
      const sent = await message.reply({
        content: "🏓 Berechne Ping...",
        flags: isSilent ? [MessageFlags.SuppressNotifications] : undefined,
      });

      const roundtrip = sent.createdTimestamp - message.createdTimestamp;
      const wsPing = client.ws.ping;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🏓 Pong! (Text-Befehl)")
        .addFields(
          { name: "🌐 WebSocket-Latenz", value: `\`${wsPing}ms\``, inline: true },
          { name: "⚡ Roundtrip-Latenz", value: `\`${roundtrip}ms\``, inline: true }
        )
        .setFooter({ text: isSilent ? "🤫 Lautlos empfangen & geantwortet (@silent)" : "Tipp: Funktioniert auch als Slash-Befehl /ping!" })
        .setTimestamp();

      await sent.edit({
        content: null,
        embeds: [embed],
      });
    }

    // Level-System: XP für Nachricht gutschreiben (falls Level-Modul aktiv)
    if (message.guild && moduleService.isEnabled(message.guild.id, "levels")) {
      const res = statsService.addMessageXp(message.guild, message.author);
      if (res && res.leveledUp) {
        const syncRes = await statsService.syncUserRoleRewards(message.guild, message.member || message.author.id, res.newLevel);
        const cfg = statsService.getConfig(message.guild.id);
        if (cfg.levelUpNotifications) {
          const isMax = res.newLevel >= (cfg.maxLevel ?? 25);
          let desc = isMax
            ? `Wahnsinn <@${message.author.id}>! Du hast das **MAX-LEVEL ${res.newLevel}** erreicht! 👑🔥`
            : `Herzlichen Glückwunsch <@${message.author.id}>! Du hast **Level ${res.newLevel}** erreicht! 🚀`;

          if (syncRes.added.length > 0) {
            desc += `\n\n🎁 **Neue Belohnungs-Rolle(n) freigeschaltet:**\n${syncRes.added.map((r) => `• <@&${r}>`).join("\n")}`;
          }

          const levelEmbed = new EmbedBuilder()
            .setColor(isMax ? 0xffac33 : 0xfee75c)
            .setTitle(isMax ? "👑 MAXIMALES LEVEL ERREICHT!" : "🎉 Level-Up!")
            .setDescription(desc)
            .setTimestamp();

          const targetChannel = cfg.levelUpChannelId
            ? (message.guild.channels.cache.get(cfg.levelUpChannelId) as any)
            : message.channel;
          if (targetChannel && "send" in targetChannel) {
            targetChannel.send({ embeds: [levelEmbed] }).catch(() => null);
          }
        }
      }
    }

    // Wirtschafts-System: Coins für Nachricht gutschreiben (falls Economy-Modul aktiv)
    if (message.guild && moduleService.isEnabled(message.guild.id, "economy")) {
      economyService.addMessageCoins(message.guild, message.author);
    }
  },
};

export default messageCreateEvent;
