import { ChannelType, Guild, VoiceBasedChannel, VoiceChannel } from "discord.js";

/** Ziel-Bitrate für Musik-Kanäle (128 kbps = Maximum ohne Server-Boosts). */
export const MUSIC_BITRATE = 128000;
const MAX_BITRATE = 384000;

function isVoiceChannel(channel: VoiceBasedChannel): channel is VoiceChannel {
  return channel.type === ChannelType.GuildVoice;
}

/** Hebt die Kanal-Bitrate auf Musik-Niveau (nur erhöhen, nie senken). Fehler werden ignoriert. */
export async function ensureMusicBitrate(channel: VoiceBasedChannel): Promise<void> {
  try {
    if (!isVoiceChannel(channel)) return;
    if ((channel.bitrate || 0) >= MUSIC_BITRATE) return;
    await channel.setBitrate(MUSIC_BITRATE);
  } catch {}
}

/** Erstellt einen Voice-Kanal in bestmöglicher Qualität (384 → 128 → Standard). */
export async function createMusicVoiceChannel(
  guild: Guild,
  options: { name: string; parent?: string; userLimit?: number; reason?: string },
): Promise<VoiceChannel> {
  const attempts: Array<{ bitrate?: number }> = [{ bitrate: MAX_BITRATE }, { bitrate: MUSIC_BITRATE }, {}];
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await guild.channels.create({
        name: options.name,
        type: ChannelType.GuildVoice,
        parent: options.parent,
        userLimit: options.userLimit ?? 0,
        ...(attempt.bitrate ? { bitrate: attempt.bitrate } : {}),
        reason: options.reason || "GLGBot: Musik-Kanal",
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Kanal konnte nicht erstellt werden.");
}
