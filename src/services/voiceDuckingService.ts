import { VoiceConnection } from "@discordjs/voice";

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
}

/**
 * Audio-Ducking Service:
 * Reduziert die Lautstärke von Radio- und Musikstreams automatisch,
 * wenn Personen im Sprachkanal reden, und hebt sie sanft wieder an,
 * wenn alle aufhören zu sprechen.
 */
class VoiceDuckingService {
  private sessions = new Map<string, DuckingSession>();

  /**
   * Standard-Ducking-Faktor: 0.35 (Lautstärke sinkt auf 35 % des Normalwerts / wird um 65 % geduckt).
   * Release-Verzögerung: 800 ms (verhindert Flattern bei kurzen Sprechpausen).
   */
  private defaultDuckFactor = 0.35;
  private releaseDelayMs = 800;

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

    const session: DuckingSession = {
      guildId: options.guildId,
      connection: options.connection,
      clientUserId: options.clientUserId,
      getBaseVolume: options.getBaseVolume,
      setLiveVolume: options.setLiveVolume,
      activeSpeakers: new Set<string>(),
      releaseTimer: null,
      isDucked: false,
      duckFactor: options.duckFactor ?? this.defaultDuckFactor,
      enabled: options.enabled ?? true,
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
        }, this.releaseDelayMs);
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
}

export const voiceDuckingService = new VoiceDuckingService();
