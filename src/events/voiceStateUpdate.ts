import { Events, VoiceState, AuditLogEvent } from "discord.js";
import { BotEvent } from "../types";
import { tempVoiceService } from "../services/tempVoiceService";
import { auditLogService } from "../services/auditLogService";
import { fetchAuditExecutor } from "../utils/auditExecutor";
import { moduleService } from "../services/moduleService";
import { prisonService } from "../services/prisonService";
import { handleMusicVoiceState } from "../services/musicChannelCleanup";

const voiceStateUpdateEvent: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  execute: async (client, oldState: VoiceState, newState: VoiceState) => {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;

    // 0. Gefängnis Voice Enforcement (Inhaftierte dürfen nur im Gefängnis-Voice sein)
    if (member && guild && newState.channelId && prisonService.isImprisoned(guild.id, member.id)) {
      try {
        const currentChannelName = (newState.channel?.name || "").toLowerCase();
        const isPrisonVoice =
          currentChannelName.includes("gefängnis-voice") ||
          currentChannelName.includes("knast-voice") ||
          currentChannelName.includes("gefängnis-talk");

        if (!isPrisonVoice) {
          const prisonRole = await prisonService.ensurePrisonRole(guild);
          const prisonVoice = await prisonService.ensurePrisonVoiceChannel(guild, prisonRole);
          await member.voice.setChannel(prisonVoice, "Gefangener darf reguläre Sprachkanäle nicht betreten").catch(async () => {
            await member.voice.disconnect("Gefangener darf reguläre Sprachkanäle nicht betreten").catch(() => null);
          });
          return;
        }
      } catch (err) {
        console.error("[VoiceStateUpdate] Fehler bei Prison Voice Enforcement:", err);
      }
    }

    // 1. Audit Logging für Voice-Events (falls AuditLog-Modul aktiv)
    // Eigene Bot-Joins/Leaves ausblenden (Spam durch Reconnects/Streams)
    const isSelf = !!member && !!client.user && member.id === client.user.id;
    try {
      if (member && guild && !isSelf && moduleService.isEnabled(guild.id, "auditLogs")) {
        const memberInfo = {
          id: member.id,
          tag: member.user.tag,
          avatar: member.user.displayAvatarURL(),
        };

        // Voice Beigetreten
        if (!oldState.channelId && newState.channelId) {
          await auditLogService.log(
            {
              guildId: guild.id,
              category: "voice",
              action: "VOICE_JOIN",
              executor: memberInfo,
              target: {
                id: member.id,
                tag: member.user.tag,
                name: member.displayName,
              },
              details: {
                channelId: newState.channelId,
                channelName: newState.channel?.name || "Unbekannt",
              },
            },
            client
          );
        }
        // Voice Verlassen (Prüfen, ob freiwillig oder Disconnect durch Mod)
        else if (oldState.channelId && !newState.channelId) {
          const disconnectLog = await fetchAuditExecutor(guild, AuditLogEvent.MemberDisconnect, {
            maxAgeMs: 3500,
            delayMs: 250,
          });

          await auditLogService.log(
            {
              guildId: guild.id,
              category: "voice",
              action: "VOICE_LEAVE",
              executor: disconnectLog ? disconnectLog.executor : memberInfo,
              target: {
                id: member.id,
                tag: member.user.tag,
                name: member.displayName,
              },
              details: {
                channelId: oldState.channelId,
                channelName: oldState.channel?.name || "Unbekannt",
                disconnectedByModerator: !!disconnectLog,
              },
            },
            client
          );
        }
        // Voice Gewechselt (Prüfen, ob selbst oder durch Moderator verschoben)
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
          const moveLog = await fetchAuditExecutor(guild, AuditLogEvent.MemberMove, {
            maxAgeMs: 3500,
            delayMs: 250,
            customMatcher: (entry) => {
              if (entry.extra && (entry.extra as any).channel) {
                return (entry.extra as any).channel.id === newState.channelId;
              }
              return true;
            },
          });

          await auditLogService.log(
            {
              guildId: guild.id,
              category: "voice",
              action: "VOICE_MOVE",
              executor: moveLog ? moveLog.executor : memberInfo,
              target: {
                id: member.id,
                tag: member.user.tag,
                name: member.displayName,
              },
              details: {
                oldChannelId: oldState.channelId,
                oldChannelName: oldState.channel?.name || "Unbekannt",
                newChannelId: newState.channelId,
                newChannelName: newState.channel?.name || "Unbekannt",
                movedByModerator: !!moveLog,
              },
            },
            client
          );
        }
        // Mute / Deafen Änderung
        else if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
          const updateLog = await fetchAuditExecutor(guild, AuditLogEvent.MemberUpdate, {
            targetId: member.id,
            maxAgeMs: 3500,
            delayMs: 250,
          });

          const change = oldState.serverMute !== newState.serverMute
            ? `Server-Mute ${newState.serverMute ? "aktiviert 🔇" : "aufgehoben 🔊"}`
            : `Server-Taub ${newState.serverDeaf ? "aktiviert 🔇" : "aufgehoben 🔊"}`;

          await auditLogService.log(
            {
              guildId: guild.id,
              category: "voice",
              action: "VOICE_STATE",
              executor: updateLog ? updateLog.executor : memberInfo,
              target: {
                id: member.id,
                tag: member.user.tag,
                name: member.displayName,
              },
              details: {
                change,
                channelId: newState.channelId,
                channelName: newState.channel?.name,
              },
            },
            client
          );
        }
      }
    } catch (error) {
      console.error("[VoiceStateUpdate] Fehler beim Audit-Logging:", error);
    }

    // 2. Temp-Voice & Join-to-Create Handler (falls Voice-Modul aktiv)
    if (guild && moduleService.isEnabled(guild.id, "voice")) {
      try {
        await tempVoiceService.handleVoiceStateUpdate(oldState, newState);
      } catch (error) {
        console.error("[VoiceStateUpdate Error] Fehler in handleVoiceStateUpdate:", error);
      }
    }

    // 3. Musik-Kanäle: leere, ungenutzte Kanäle nach Karenzzeit löschen (falls Musik-Modul aktiv)
    if (guild && moduleService.isEnabled(guild.id, "music")) {
      handleMusicVoiceState(
        oldState.channel && oldState.channel.isVoiceBased() ? oldState.channel : null,
        newState.channel && newState.channel.isVoiceBased() ? newState.channel : null,
      );
    }
  },
};

export default voiceStateUpdateEvent;
