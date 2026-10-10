import { Events, Message, EmbedBuilder } from "discord.js";
import { BotEvent } from "../types";

const messageCreateEvent: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (client, message: Message) => {
    // Ignoriere Nachrichten von Bots
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

    // Reagiere auch auf normalen Textchat wie !ping, /ping oder ping
    if (content === "!ping" || content === "/ping" || content === "ping") {
      const sent = await message.reply("🏓 Berechne Ping...");

      const roundtrip = sent.createdTimestamp - message.createdTimestamp;
      const wsPing = client.ws.ping;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🏓 Pong! (Text-Befehl)")
        .addFields(
          { name: "🌐 WebSocket-Latenz", value: `\`${wsPing}ms\``, inline: true },
          { name: "⚡ Roundtrip-Latenz", value: `\`${roundtrip}ms\``, inline: true }
        )
        .setFooter({ text: `Tipp: Du kannst auch den echten Slash-Befehl /ping nutzen!` })
        .setTimestamp();

      await sent.edit({
        content: null,
        embeds: [embed],
      });
    }
  },
};

export default messageCreateEvent;
