import { VoiceConnection } from "@discordjs/voice";
import { musicPrefsService } from "./musicPrefsService";

interface DuckingSession {
  guildId: string;
  connection: VoiceConnection;
  clientUserId?: string;
  getBaseVolume: () => number;
  setLiveVolume: (fraction: number) => void;
  activeSpeakers: Set<string>;
  releaseTimer: NodeJS.Timeout | null;
  isDucked: boolean;
  duckFactor: number;
  enabled: boolean;
  releaseMs: number;
}

/**
 * Audio-Ducking Service:
 * Reduziert die Lautstärke von Radio- und Musikstreams automatisch,
 * wenn Personen im Sprachkanal reden, und hebt sie sanft wieder an,
 * wenn alle aufhören zu sprechen.
 */
class VoiceDuckingService {
  private sessions = new Map<string, DuckingSession>();

  attach(options: {
    guildId: string;
    connection: VoiceConnection;
    clientUserId?: string;
    getBaseVolume: () => number;
    setLiveVolume: (fraction: number) => void;
    duckFactor?: number;
    enabled?: boolean;
  }) {
    this.detach(options.guildId);

    // Gespeicherte Einstellung des Servers; einzelne Werte lassen sich überschreiben
    const prefs = musicPrefsService.getDucking(options.guildId);

    const session: DuckingSession = {
      guildId: options.guildId,
      connection: options.connection,
      clientUserId: options.clientUserId,
      getBaseVolume: options.getBaseVolume,
      setLiveVolume: options.setLiveVolume,
      activeSpeakers: new Set<string>(),
      releaseTimer: null,
      isDucked: false,
      duckFactor: options.duckFactor ?? prefs.level / 100,
      enabled: options.enabled ?? prefs.enabled,
      releaseMs: prefs.releaseMs,
    };

    this.sessions.set(options.guildId, session);

    const receiver = options.connection.receiver;
    if (!receiver || !receiver.speaking) return;

    receiver.speaking.on("start", (userId: string) => {
      if (session.clientUserId && userId === session.clientUserId) return;
      session.activeSpeakers.add(userId);

      if (session.releaseTimer) {
        clearTimeout(session.releaseTimer);
        session.releaseTimer = null;
      }

      if (!session.isDucked && session.enabled) {
        session.isDucked = true;
        const base = session.getBaseVolume();
        const ducked = Math.max(0.05, (base / 100) * session.duckFactor);
        try {
          session.setLiveVolume(ducked);
        } catch {}
      }
    });

    receiver.speaking.on("end", (userId: string) => {
      session.activeSpeakers.delete(userId);

      if (session.activeSpeakers.size === 0 && session.isDucked) {
        if (session.releaseTimer) clearTimeout(session.releaseTimer);
        session.releaseTimer = setTimeout(() => {
          session.releaseTimer = null;
          if (session.activeSpeakers.size === 0 && session.isDucked) {
            session.isDucked = false;
            const base = session.getBaseVolume();
            try {
              session.setLiveVolume(base / 100);
            } catch {}
          }
        }, session.releaseMs);
      }
    });
  }

  onVolumeChange(guildId: string, newBasePercent: number) {
    const session = this.sessions.get(guildId);
    if (!session) return;
    try {
      if (session.isDucked && session.enabled) {
        const ducked = Math.max(0.05, (newBasePercent / 100) * session.duckFactor);
        session.setLiveVolume(ducked);
      } else {
        session.setLiveVolume(newBasePercent / 100);
      }
    } catch {}
  }

  detach(guildId: string) {
    const session = this.sessions.get(guildId);
    if (!session) return;
    if (session.releaseTimer) {
      clearTimeout(session.releaseTimer);
      session.releaseTimer = null;
    }
    session.activeSpeakers.clear();
    this.sessions.delete(guildId);
  }

  isDucked(guildId: string): boolean {
    return this.sessions.get(guildId)?.isDucked ?? false;
  }

  setEnabled(guildId: string, enabled: boolean) {
    const session = this.sessions.get(guildId);
    if (session) session.enabled = enabled;
  }

  /**
   * Übernimmt geänderte Einstellungen sofort in eine laufende Wiedergabe,
   * damit man die Wirkung direkt hört, ohne neu zu starten.
   */
  applySettings(guildId: string, settings: { enabled: boolean; level: number; releaseMs: number }) {
    const session = this.sessions.get(guildId);
    if (!session) return;
    session.enabled = settings.enabled;
    session.duckFactor = settings.level / 100;
    session.releaseMs = settings.releaseMs;

    // Lautstärke sofort an die neue Einstellung anpassen
    const base = session.getBaseVolume();
    try {
      if (session.isDucked && settings.enabled) {
        session.setLiveVolume(Math.max(0.05, (base / 100) * session.duckFactor));
      } else if (session.isDucked && !settings.enabled) {
        // Ducking abgeschaltet, während geduckt war: sofort wieder aufdrehen
        session.isDucked = false;
        if (session.releaseTimer) {
          clearTimeout(session.releaseTimer);
          session.releaseTimer = null;
        }
        session.setLiveVolume(base / 100);
      }
    } catch {}
  }

  /** Ist für diesen Server gerade eine Wiedergabe mit Ducking verbunden? */
  isActive(guildId: string): boolean {
    return this.sessions.has(guildId);
  }
}

export const voiceDuckingService = new VoiceDuckingService();
