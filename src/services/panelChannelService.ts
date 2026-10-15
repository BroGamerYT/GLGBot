import { Channel, ChannelType, Message, TextChannel } from "discord.js";

/**
 * Service zur Erkennung und automatischen Bereinigung von Panel-Kanälen
 * (z. B. #🎵・musik-steuerung, #📻・radio-steuerung, #🎛️・voice-steuerung, #ticket-support usw.).
 * Stellt sicher, dass diese Kanäle sauber bleiben und nur das eigentliche Steuer-Panel enthalten.
 */
class PanelChannelService {
  /**
   * Prüft, ob ein Kanal ein Panel-/Steuerungskanal ist.
   */
  isPanelChannel(channel: Channel | null | undefined): boolean {
    if (!channel || channel.type !== ChannelType.GuildText) return false;
    const name = (channel as TextChannel).name.toLowerCase();
    return (
      /(?:musik|music|radio|voice|ticket|rollen|roles|regeln|rules)[-_・]?(?:steuerung|panel)/i.test(name) ||
      /(?:steuerung|steuerpannel|steuerpanel)/i.test(name)
    );
  }

  /**
   * Behandelt neue Nachrichten in Panel-Kanälen.
   * Löscht normale Nutzer-Nachrichten und temporäre Statusmeldungen automatisch nach wenigen Sekunden.
   */
  async handleMessage(message: Message): Promise<boolean> {
    if (!message.guild || !this.isPanelChannel(message.channel)) {
      return false;
    }

    const textChannel = message.channel as TextChannel;

    // Wenn der Bot selbst das Hauptpanel postet (enthält Embed + ActionRows), behalten
    if (message.author.id === message.client.user?.id) {
      const hasPanelRows = (message.components?.length || 0) >= 2;
      const hasPanelEmbed = message.embeds?.some((e) =>
        /(?:musik-panel|radio-panel|voice-steuerung|steuerpanel|soundboard)/i.test(e.title || ""),
      );
      if (hasPanelRows || hasPanelEmbed) {
        return false;
      }

      // Temporäre Bot-Meldungen nach 4 Sekunden löschen
      setTimeout(() => {
        message.delete().catch(() => null);
      }, 4000);
      return true;
    }

    // Nutzer-Nachrichten nach 2.5 Sekunden automatisch entfernen
    setTimeout(() => {
      message.delete().catch(() => null);
    }, 2500);

    return true;
  }

  /**
   * Bereinigt alle bisherigen Chatnachrichten in einem Panel-Kanal,
   * sodass ausschließlich das aktuelle Steuer-Panel (keepMessageId) stehen bleibt.
   */
  async cleanOldMessages(channel: TextChannel, keepMessageId?: string): Promise<number> {
    try {
      const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (!fetched || fetched.size === 0) return 0;

      const toDelete = fetched.filter((m) => m.id !== keepMessageId);
      if (toDelete.size === 0) return 0;

      // Nachrichten jünger als 14 Tage per bulkDelete löschen
      const now = Date.now();
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      const recent = toDelete.filter((m) => now - m.createdTimestamp < fourteenDays);
      const older = toDelete.filter((m) => now - m.createdTimestamp >= fourteenDays);

      if (recent.size > 0) {
        await channel.bulkDelete(recent, true).catch(() => null);
      }

      for (const msg of older.values()) {
        await msg.delete().catch(() => null);
      }

      return toDelete.size;
    } catch {
      return 0;
    }
  }
}

export const panelChannelService = new PanelChannelService();
