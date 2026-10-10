import { Events, Message, EmbedBuilder, MessageFlags } from "discord.js";
import { BotEvent } from "../types";
import { securityService } from "../services/securityService";
import { stickyService } from "../services/stickyService";

const messageCreateEvent: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (client, message: Message) => {
    // Ignoriere Nachrichten von Bots
    if (message.author.bot) return;

    // Phishing- & Scam-Schutz
    const isPhishing = await securityService.handlePhishingMessage(message, client);
    if (isPhishing) return;

    // Sticky Messages aktualisieren
    await stickyService.handleMessage(message);

    // Entferne führendes @silent, falls die Nachricht lautlos gesendet wurde
    let content = message.content.trim().toLowerCase();
    const isSilent = content.startsWith("@silent") || message.flags.has(MessageFlags.SuppressNotifications);

    if (content.startsWith("@silent")) {
      content = content.replace(/^@silent\s*/, "").trim();
    }

    // Reagiere auf !ping, /ping oder ping (auch wenn @silent davor stand)
    if (content === "!ping" || content === "/ping" || content === "ping") {
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
  },
};

export default messageCreateEvent;
