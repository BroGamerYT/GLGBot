import { Guild, AuditLogEvent, GuildAuditLogsEntry } from "discord.js";

export interface AuditExecutorResult {
  executor: {
    id: string;
    tag: string;
    avatar?: string;
  };
  reason?: string;
  extra?: any;
}

interface FetchAuditOptions {
  targetId?: string;
  maxAgeMs?: number;
  delayMs?: number;
  retries?: number;
  customMatcher?: (entry: GuildAuditLogsEntry) => boolean;
}

/**
 * Holt den Ausführenden (Moderator / Admin / Bot) für eine Aktion aus dem Discord Audit Log.
 * Berücksichtigt API-Verzögerungen mit konfigurierbarem Delay und Retry.
 */
export async function fetchAuditExecutor(
  guild: Guild,
  actionType: AuditLogEvent,
  options: FetchAuditOptions = {}
): Promise<AuditExecutorResult | null> {
  const {
    targetId,
    maxAgeMs = 7000,
    delayMs = 350,
    retries = 1,
    customMatcher,
  } = options;

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const logs = await guild.fetchAuditLogs({
        type: actionType,
        limit: 6,
      });

      const now = Date.now();
      const match = logs.entries.find((entry) => {
        const age = now - entry.createdTimestamp;
        if (age > maxAgeMs) return false;

        if (customMatcher) {
          return customMatcher(entry);
        }

        if (targetId) {
          return entry.targetId === targetId;
        }

        return true;
      });

      if (match && match.executor) {
        return {
          executor: {
            id: match.executor.id,
            tag: match.executor.tag || match.executor.username || "Unbekannt",
            avatar: match.executor.displayAvatarURL() || undefined,
          },
          reason: match.reason || undefined,
          extra: match.extra || undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[AuditExecutor] Fehler beim Abrufen des Audit-Logs (${actionType}):`, err?.message);
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return null;
}
