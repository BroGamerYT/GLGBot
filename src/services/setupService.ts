import { ChannelType, Guild, GuildBasedChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { rolePanelService } from "./rolePanelService";
import { rulesService } from "./rulesService";
import { tempVoiceService } from "./tempVoiceService";
import { liveStreamService } from "./liveStreamService";
import { ticketService } from "./ticketService";
import { auditLogService } from "./auditLogService";
import { prisonService } from "./prisonService";
import { createVoicePanelComponents, createVoicePanelEmbed } from "../commands/voice/voicePanel";

/**
 * Komplett-Einrichtung: legt für ausgewählte Bereiche alle fehlenden Rollen & Kanäle an.
 * Vorhandenes wird erkannt und nur verknüpft - nichts wird doppelt erstellt.
 */
export const SETUP_MODULES = ["roles", "rules", "voice", "live", "tickets", "logs", "prison", "lock"] as const;
export type SetupModule = (typeof SETUP_MODULES)[number];

export const MODULE_INFO: Record<SetupModule, { label: string; description: string }> = {
  roles: {
    label: "Rollen & Benachrichtigungen",
    description: "Rollen Gast, bn.live, bn.free, bn.gamenews, bn.treiber, Live sowie die Kanäle #free-games, #game-news und #treiber-news.",
  },
  rules: {
    label: "Regeln & Berechtigungen",
    description: "#regeln mit „Regeln akzeptieren“-Button und #berechtigungen mit dem Rollen-Panel.",
  },
  voice: {
    label: "Temporäre Sprachkanäle",
    description: "Kategorie mit „➕ Lobby erstellen“ (Join-to-Create) und einem Steuerungs-Panel.",
  },
  live: {
    label: "Live-Streamer",
    description: "Kategorie für Live-Kanäle und #stream-alerts für die Ankündigungen.",
  },
  tickets: { label: "Support-Tickets", description: "#support mit Ticket-Button." },
  logs: { label: "Audit-Log", description: "Geschützter Log-Kanal, nur für das Team sichtbar." },
  prison: { label: "Gefängnis (/knast)", description: "Gefängnis-Rolle und #gefängnis-Kanal." },
  lock: {
    label: "Regel-Sperre aktivieren",
    description: "Neue Mitglieder sehen nur #regeln, bis sie die Regeln akzeptieren. Bestehende Mitglieder werden automatisch freigeschaltet.",
  },
};

export interface SetupItem {
  name: string;
  /** created = neu angelegt, linked = vorhanden & verknüpft, error = fehlgeschlagen */
  status: "created" | "linked" | "error";
  detail?: string;
}

export interface ModuleResult {
  module: SetupModule;
  label: string;
  ok: boolean;
  items: SetupItem[];
  error?: string;
}

function exists(guild: Guild, id?: string | null): boolean {
  return !!id && guild.channels.cache.has(id);
}
function roleExists(guild: Guild, id?: string | null): boolean {
  return !!id && guild.roles.cache.has(id);
}
function findText(guild: Guild, test: (name: string) => boolean): TextChannel | undefined {
  return guild.channels.cache.find((c) => c.type === ChannelType.GuildText && test(c.name.toLowerCase())) as TextChannel | undefined;
}

class SetupService {
  private running = new Set<string>();

  /** Was ist schon eingerichtet? (für die Häkchen im Dashboard) */
  public getStatus(guild: Guild): Record<SetupModule, boolean> {
    const rp = rolePanelService.getConfig(guild.id) || {};
    const voice = tempVoiceService.getConfig(guild.id);
    const live = liveStreamService.getConfig(guild.id);
    const logs = auditLogService.getConfig(guild.id);
    return {
      roles:
        roleExists(guild, rp.rulesRoleId) &&
        roleExists(guild, rp.streamAlertRoleId) &&
        exists(guild, rp.freeGamesChannelId) &&
        exists(guild, rp.gameNewsChannelId) &&
        exists(guild, rp.driverNewsChannelId),
      rules: !!findText(guild, (n) => n.includes("regeln") || n.includes("rules")) && exists(guild, rp.permissionsChannelId),
      voice: !!voice && exists(guild, voice.masterChannelId),
      live: !!live && roleExists(guild, live.liveRoleId) && exists(guild, live.announcementChannelId),
      tickets: !!findText(guild, (n) => n.includes("support")),
      logs: exists(guild, logs.logChannelId),
      prison: !!guild.roles.cache.find((r) => r.name === "🔒・Gefängnis" || r.name === "Gefängnis"),
      lock: !!rp.serverLocked,
    };
  }

  public isRunning(guildId: string) {
    return this.running.has(guildId);
  }

  /** Führt die gewählten Bereiche nacheinander aus (in sinnvoller Reihenfolge). */
  public async run(guild: Guild, wanted: string[]): Promise<ModuleResult[]> {
    const modules = SETUP_MODULES.filter((m) => wanted.includes(m));
    if (modules.length === 0) throw new Error("Bitte mindestens einen Bereich auswählen.");
    if (this.running.has(guild.id)) throw new Error("Die Einrichtung läuft bereits - bitte kurz warten.");

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      throw new Error("Dem Bot fehlen die Rechte „Rollen verwalten“ und „Kanäle verwalten“ (am einfachsten: Administrator).");
    }

    this.running.add(guild.id);
    const results: ModuleResult[] = [];
    try {
      await guild.channels.fetch();
      await guild.roles.fetch();

      // Regeln, Live und Sperre brauchen die Rollen - die werden bei Bedarf automatisch mit eingerichtet
      const needsRoles = modules.some((m) => m === "rules" || m === "live" || m === "lock");
      if (needsRoles && !modules.includes("roles") && !this.getStatus(guild).roles) modules.unshift("roles");

      for (const m of modules) {
        const result: ModuleResult = { module: m, label: MODULE_INFO[m].label, ok: true, items: [] };
        try {
          await this.runModule(guild, m, result.items);
        } catch (e: any) {
          result.ok = false;
          result.error = e?.message || String(e);
          console.error(`[Setup] Bereich "${m}" fehlgeschlagen:`, e);
        }
        results.push(result);
      }
      return results;
    } finally {
      this.running.delete(guild.id);
    }
  }

  private async runModule(guild: Guild, m: SetupModule, items: SetupItem[]) {
    const add = (name: string, created: boolean) => items.push({ name, status: created ? "created" : "linked" });

    switch (m) {
      case "roles": {
        const r = await rolePanelService.ensureAndAutoSetupRoles(guild);
        add(`Rolle ${r.guestRole.name}`, r.guestRole.created);
        add(`Rolle ${r.streamAlertRole.name}`, r.streamAlertRole.created);
        add(`Rolle ${r.freeGamesRole.name}`, r.freeGamesRole.created);
        add(`Rolle ${r.liveRole.name}`, r.liveRole.created);
        add(`Rolle ${r.gameNewsRole.name}`, r.gameNewsRole.created);
        add(`Rolle ${r.driverNewsRole.name}`, r.driverNewsRole.created);
        add(`#${r.freeGamesChannel.name}`, r.freeGamesChannel.created);
        add(`#${r.gameNewsChannel.name}`, r.gameNewsChannel.created);
        add(`#${r.driverNewsChannel.name}`, r.driverNewsChannel.created);
        await rulesService.postChannelHeaders(guild).catch((e) => console.error("[Setup] Kopf-Nachrichten:", e));
        return;
      }

      case "rules": {
        const { rules, perms } = await rulesService.setupChannels(guild);
        add(`#${rules.channel.name} (Regeln gepostet)`, rules.created);
        add(`#${perms.channel.name} (Rollen-Panel gepostet)`, perms.created);
        return;
      }

      case "lock": {
        if (rolePanelService.getConfig(guild.id)?.serverLocked) {
          add("Regel-Sperre ist bereits aktiv", false);
          return;
        }
        if (!this.getStatus(guild).rules) throw new Error("Zuerst „Regeln & Berechtigungen“ einrichten.");
        const problem = rulesService.checkLockPrerequisites(guild);
        if (problem) throw new Error(problem.replace(/\*\*/g, ""));
        const { granted } = await rulesService.lockServer(guild);
        add(`Regel-Sperre aktiviert (${granted} bestehende Mitglieder freigeschaltet)`, true);
        return;
      }

      case "voice": {
        const cfg = tempVoiceService.getConfig(guild.id);
        if (cfg && exists(guild, cfg.masterChannelId)) {
          const master = guild.channels.cache.get(cfg.masterChannelId)!;
          add(`🔊 ${master.name}`, false);
          return;
        }
        let category = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildCategory && /voice|sprach|talk/i.test(c.name)
        ) as GuildBasedChannel | undefined;
        const catCreated = !category;
        if (!category) {
          category = await guild.channels.create({ name: "🔊 Sprachkanäle", type: ChannelType.GuildCategory, reason: "GLGBot: Einrichtung" });
        }
        add(`Kategorie ${category.name}`, catCreated);

        const master = await guild.channels.create({
          name: "➕ Lobby erstellen",
          type: ChannelType.GuildVoice,
          parent: category.id,
          reason: "GLGBot: Join-to-Create",
        });
        add(`🔊 ${master.name}`, true);
        tempVoiceService.setMasterChannel(guild.id, master.id, category.id);

        let panel = findText(guild, (n) => n.includes("voice-steuerung") || n.includes("voice-panel"));
        const panelCreated = !panel;
        if (!panel) {
          panel = await guild.channels.create({
            name: "🎛️・voice-steuerung",
            type: ChannelType.GuildText,
            parent: category.id,
            topic: "Steuere hier deine eigene Lobby (Name, Limit, sperren, verstecken …)",
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
              { id: guild.members.me!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
            ],
            reason: "GLGBot: Voice-Steuerung",
          });
          await panel.send({ embeds: [createVoicePanelEmbed()], components: createVoicePanelComponents() });
        }
        add(`#${panel.name}${panelCreated ? " (Panel gepostet)" : ""}`, panelCreated);
        return;
      }

      case "live": {
        let cfg = liveStreamService.getConfig(guild.id);
        if (!cfg || !roleExists(guild, cfg.liveRoleId)) {
          await rolePanelService.ensureAndAutoSetupRoles(guild);
          cfg = liveStreamService.getConfig(guild.id);
        }
        if (!cfg) throw new Error("Live-Rolle konnte nicht eingerichtet werden.");
        add(`Rolle ${guild.roles.cache.get(cfg.liveRoleId)?.name || "Live"}`, false);

        const knownBefore = new Set(guild.channels.cache.keys());
        const category = await liveStreamService.ensureCategory(guild, cfg.categoryId);
        if (category) add(`Kategorie ${category.name}`, !knownBefore.has(category.id));

        let announceId = cfg.announcementChannelId;
        if (!exists(guild, announceId)) {
          const alertRoleId = rolePanelService.getConfig(guild.id)?.streamAlertRoleId;
          const alertRole = alertRoleId ? guild.roles.cache.get(alertRoleId) : undefined;
          const found = findText(guild, (n) => n.includes("stream-alert") || n.includes("live-alert"));
          const ch =
            found ||
            (await guild.channels.create({
              name: "🔴・stream-alerts",
              type: ChannelType.GuildText,
              topic: "Hier wird angekündigt, wenn jemand live geht | Benachrichtigungen mit @bn.live",
              permissionOverwrites: alertRole
                ? [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: alertRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
                    { id: guild.members.me!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
                  ]
                : [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }],
              reason: "GLGBot: Live-Ankündigungen",
            }));
          announceId = ch.id;
          add(`#${ch.name}`, !found);
        } else {
          add(`#${guild.channels.cache.get(announceId!)!.name}`, false);
        }

        liveStreamService.setConfig(
          guild.id,
          cfg.liveRoleId,
          announceId,
          category?.id || cfg.categoryId,
          cfg.channelType || "voice",
          cfg.autoRole ?? true,
          cfg.pingRoleId,
          cfg.silent ?? false,
          cfg.customMessage
        );
        return;
      }

      case "tickets": {
        const before = findText(guild, (n) => n.includes("support"));
        const ch = await ticketService.ensureSupportChannel(guild);
        add(`#${ch.name}${before ? "" : " (Ticket-Button gepostet)"}`, !before);
        return;
      }

      case "logs": {
        const before = auditLogService.getConfig(guild.id).logChannelId;
        const ch = await auditLogService.ensureLogChannel(guild);
        add(`#${ch.name}`, !exists(guild, before) && ch.createdTimestamp > Date.now() - 60_000);
        return;
      }

      case "prison": {
        const roleBefore = guild.roles.cache.find((r) => r.name === "🔒・Gefängnis" || r.name === "Gefängnis");
        const role = await prisonService.ensurePrisonRole(guild);
        add(`Rolle ${role.name}`, !roleBefore);
        const chBefore = findText(guild, (n) => n === "🔒・gefängnis" || n === "gefängnis");
        const ch = await prisonService.ensurePrisonChannel(guild, role);
        add(`#${ch.name}`, !chBefore);
        return;
      }
    }
  }
}

export const setupService = new SetupService();
