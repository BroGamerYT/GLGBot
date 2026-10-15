import { getVoiceConnection } from "@discordjs/voice";
import { Client, Guild, VoiceBasedChannel } from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFile";
import { radioService } from "./radioService";

const DATA_DIR = path.join(__dirname, "../../data");
const MAP_FILE = path.join(DATA_DIR, "music_channels.json");

/** Karenzzeit in ms für neu erstellte Kanäle (bevor ein Hörer beitritt). */
const INITIAL_GRACE_MS = 120_000;

/** Karenzzeit in ms, wenn der letzte Hörer den Kanal verlassen hat. */
const EMPTY_GRACE_MS = 60_000;

interface TrackedChannel {
  name: string;
  station: string;
  createdAt: number;
}

type ChannelMap = Record<string, Record<string, TrackedChannel>>;

// channelId -> Lösch-Timer für Temp-Kanäle
const pendingDelete = new Map<string, NodeJS.Timeout>();

// channelId -> Leave-Timer für den Bot in normalen Kanälen
const pendingBotLeave = new Map<string, NodeJS.Timeout>();

function loadMap(): ChannelMap {
  try {
    if (fs.existsSync(MAP_FILE)) return JSON.parse(fs.readFileSync(MAP_FILE, "utf-8"));
  } catch {}
  return {};
}

function saveMap(map: ChannelMap) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonAtomic(MAP_FILE, map);
  } catch (e) {
    console.error("[MusicCleanup] Karte konnte nicht gespeichert werden:", (e as Error).message);
  }
}

/** Zählt echte menschliche Hörer im Sprachkanal (Bots ausgeschlossen). */
export function humansIn(channel: VoiceBasedChannel): number {
  try {
    return channel.members.filter((m) => !m.user.bot).size;
  } catch {
    return 1;
  }
}

/** Prüft, ob ein Kanal als temporärer Musik-Kanal registriert ist. */
export function isMusicChannelTracked(guildId: string, channelId: string): boolean {
  return !!loadMap()[guildId]?.[channelId];
}

/** Vom Bot erstellten Musik-Kanal als temporär registrieren und überwachen. */
export function trackMusicChannel(guildId: string, channelId: string, name: string, station: string, guild?: Guild) {
  const map = loadMap();
  map[guildId] = { ...(map[guildId] || {}), [channelId]: { name, station, createdAt: Date.now() } };
  saveMap(map);

  // Falls der Kanal sofort nach Erstellung leer ist (z. B. Klick im Dashboard vor Beitritt),
  // Karenzzeit starten. Tritt ein Nutzer bei, wird der Timer in handleMusicVoiceState abgebrochen.
  if (guild) {
    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.isVoiceBased() && humansIn(channel) === 0) {
      if (!pendingDelete.has(channelId)) {
        console.log(`[MusicCleanup] Temp-Kanal #${name} erstellt – starte ${INITIAL_GRACE_MS / 1000}s Karenzzeit für Hörer.`);
        pendingDelete.set(
          channelId,
          setTimeout(() => void deleteIfStillUnused(guild, channelId), INITIAL_GRACE_MS),
        );
      }
    }
  }
}

export function untrackMusicChannel(guildId: string, channelId: string) {
  const map = loadMap();
  if (map[guildId]?.[channelId]) {
    delete map[guildId][channelId];
    saveMap(map);
  }
}

/**
 * Löscht einen ungenutzten temporären Musik-Kanal und beendet eventuelle Streams.
 */
async function deleteIfStillUnused(guild: Guild, channelId: string) {
  pendingDelete.delete(channelId);
  try {
    if (!isMusicChannelTracked(guild.id, channelId)) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      untrackMusicChannel(guild.id, channelId);
      return;
    }

    // Falls inzwischen wieder jemand drin ist -> nicht löschen!
    if (humansIn(channel) > 0) return;

    // Laufende Wiedergabe im Kanal beenden
    const radio = radioService.getStatus(guild.id);
    if (radio && radio.channelId === channelId) {
      await radioService.stop(guild.id).catch(() => null);
    }
    try {
      const { musicService } = await import("./musicService");
      const music = musicService.getStatus(guild.id);
      if (music && music.channelId === channelId) {
        musicService.stop(guild.id);
      }
    } catch {}
    try {
      const conn = getVoiceConnection(guild.id);
      if (conn && conn.joinConfig.channelId === channelId) {
        conn.destroy();
      }
    } catch {}

    const channelName = channel.name;
    await channel.delete("Musik-Kanal ungenutzt – automatisches Aufräumen (Temp-Channel)").catch(() => null);
    untrackMusicChannel(guild.id, channelId);
    console.log(`[MusicCleanup] Ungenutzten temporären Musik-Kanal #${channelName} gelöscht.`);
  } catch (e) {
    console.error("[MusicCleanup] Löschen fehlgeschlagen:", (e as Error).message);
  }
}

/**
 * Trennt den Bot aus einem normalen Kanal, wenn keine Hörer mehr anwesend sind.
 */
async function stopBotIfStillEmpty(guild: Guild, channelId: string) {
  pendingBotLeave.delete(channelId);
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isVoiceBased()) return;
    if (humansIn(channel) > 0) return;

    const radio = radioService.getStatus(guild.id);
    if (radio && radio.channelId === channelId) {
      console.log(`[MusicCleanup] Kanal #${channel.name} seit ${EMPTY_GRACE_MS / 1000}s leer – Radio beendet.`);
      await radioService.stop(guild.id).catch(() => null);
    }
    try {
      const { musicService } = await import("./musicService");
      const music = musicService.getStatus(guild.id);
      if (music && music.channelId === channelId) {
        console.log(`[MusicCleanup] Kanal #${channel.name} seit ${EMPTY_GRACE_MS / 1000}s leer – Musik beendet.`);
        musicService.stop(guild.id);
      }
    } catch {}
    try {
      const conn = getVoiceConnection(guild.id);
      if (conn && conn.joinConfig.channelId === channelId) {
        conn.destroy();
      }
    } catch {}
  } catch (e) {
    console.error("[MusicCleanup] Fehler beim Beenden der leeren Bot-Session:", (e as Error).message);
  }
}

function isSessionActiveInChannel(guildId: string, channelId: string): boolean {
  const radio = radioService.getStatus(guildId);
  if (radio && radio.channelId === channelId) return true;
  try {
    const conn = getVoiceConnection(guildId);
    if (conn && conn.joinConfig.channelId === channelId) return true;
  } catch {}
  return false;
}

/** In voiceStateUpdate einhängen: Join bricht Timer ab, Leave startet Countdown bei Leere. */
export function handleMusicVoiceState(oldChannel: VoiceBasedChannel | null, newChannel: VoiceBasedChannel | null) {
  try {
    // 1. Beitritt in einen Kanal: laufende Timer abbrechen
    if (newChannel?.guild) {
      const delTimer = pendingDelete.get(newChannel.id);
      if (delTimer) {
        clearTimeout(delTimer);
        pendingDelete.delete(newChannel.id);
        console.log(`[MusicCleanup] Hörer in #${newChannel.name} beigetreten – Löschung abgebrochen.`);
      }
      const leaveTimer = pendingBotLeave.get(newChannel.id);
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        pendingBotLeave.delete(newChannel.id);
      }
    }

    // 2. Verlassen eines Kanals
    if (oldChannel?.guild && oldChannel.id !== newChannel?.id) {
      if (humansIn(oldChannel) > 0) return;

      const guild = oldChannel.guild;
      const channelId = oldChannel.id;

      // Fall A: Temporärer Musik-Kanal -> Lösch-Timer starten
      if (isMusicChannelTracked(guild.id, channelId)) {
        if (!pendingDelete.has(channelId)) {
          console.log(`[MusicCleanup] Temp-Kanal #${oldChannel.name} ist leer – starte Lösch-Timer (${EMPTY_GRACE_MS / 1000}s).`);
          pendingDelete.set(
            channelId,
            setTimeout(() => void deleteIfStillUnused(guild, channelId), EMPTY_GRACE_MS),
          );
        }
        return;
      }

      // Fall B: Normaler Kanal, in dem der Bot spielt -> Bot-Leave-Timer starten
      if (isSessionActiveInChannel(guild.id, channelId)) {
        if (!pendingBotLeave.has(channelId)) {
          console.log(`[MusicCleanup] Bot in #${oldChannel.name} ist jetzt alleine – starte Leave-Timer (${EMPTY_GRACE_MS / 1000}s).`);
          pendingBotLeave.set(
            channelId,
            setTimeout(() => void stopBotIfStillEmpty(guild, channelId), EMPTY_GRACE_MS),
          );
        }
      }
    }
  } catch (e) {
    console.error("[MusicCleanup] Fehler in handleMusicVoiceState:", (e as Error).message);
  }
}

/** Stellt beim Bot-Start sicher, dass verwaiste Temp-Kanäle nicht ewig verbleiben. */
export async function reconcileMusicChannels(client: Client) {
  try {
    const map = loadMap();
    for (const [guildId, channels] of Object.entries(map)) {
      const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
      if (!guild) continue;
      for (const [channelId, meta] of Object.entries(channels)) {
        try {
          const channel = await guild.channels.fetch(channelId).catch(() => null);
          if (!channel || !channel.isVoiceBased()) {
            untrackMusicChannel(guildId, channelId);
            continue;
          }
          if (humansIn(channel) === 0) {
            console.log(`[MusicCleanup] Leerer Temp-Kanal #${channel.name} nach Start gefunden – starte ${EMPTY_GRACE_MS / 1000}s Karenzzeit.`);
            if (!pendingDelete.has(channelId)) {
              pendingDelete.set(
                channelId,
                setTimeout(() => void deleteIfStillUnused(guild, channelId), EMPTY_GRACE_MS),
              );
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    console.error("[MusicCleanup] Fehler bei reconcileMusicChannels:", (e as Error).message);
  }
}
