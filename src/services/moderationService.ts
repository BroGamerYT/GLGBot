import fs from "fs";
import path from "path";
import { Guild, User, GuildMember, EmbedBuilder, Client } from "discord.js";
import { auditLogService } from "./auditLogService";

export type ModAction = "WARN" | "TIMEOUT" | "KICK" | "BAN" | "UNBAN";

export interface ModCase {
  id: number;
  guildId: string;
  targetId: string;
  targetTag: string;
  targetAvatar?: string;
  moderatorId: string;
  moderatorTag: string;
  moderatorAvatar?: string;
  action: ModAction;
  reason: string;
  duration?: string;
  createdAt: string;
}

interface CaseStorage {
  [guildId: string]: ModCase[];
}

const DATA_DIR = path.join(__dirname, "../../data");
const CASES_FILE = path.join(DATA_DIR, "mod_cases.json");

class ModerationService {
  private cases: CaseStorage = {};

  constructor() {
    this.ensureDataDir();
    this.loadCases();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadCases() {
    try {
      if (fs.existsSync(CASES_FILE)) {
        this.cases = JSON.parse(fs.readFileSync(CASES_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[ModerationService] Fehler beim Laden der Mod-Cases:", e);
      this.cases = {};
    }
  }

  private saveCases() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(CASES_FILE, JSON.stringify(this.cases, null, 2), "utf-8");
    } catch (e) {
      console.error("[ModerationService] Fehler beim Speichern der Mod-Cases:", e);
    }
  }

  public getNextCaseId(guildId: string): number {
    const list = this.cases[guildId] || [];
    if (list.length === 0) return 1;
    return Math.max(...list.map((c) => c.id)) + 1;
  }

  public async createCase(
    guild: Guild,
    moderator: User,
    target: User,
    action: ModAction,
    reason: string,
    options: { duration?: string; client?: Client } = {}
  ): Promise<ModCase> {
    if (!this.cases[guild.id]) {
      this.cases[guild.id] = [];
    }

    const caseId = this.getNextCaseId(guild.id);
    const newCase: ModCase = {
      id: caseId,
      guildId: guild.id,
      targetId: target.id,
      targetTag: target.tag || target.username,
      targetAvatar: target.displayAvatarURL(),
      moderatorId: moderator.id,
      moderatorTag: moderator.tag || moderator.username,
      moderatorAvatar: moderator.displayAvatarURL(),
      action,
      reason,
      duration: options.duration,
      createdAt: new Date().toISOString(),
    };

    this.cases[guild.id].unshift(newCase);
    this.saveCases();

    // 1. Audit Log protokollieren
    if (options.client) {
      const actionName =
        action === "WARN"
          ? "MEMBER_WARN"
          : action === "TIMEOUT"
          ? "MEMBER_TIMEOUT"
          : action === "KICK"
          ? "MEMBER_KICK"
          : action === "BAN"
          ? "MEMBER_BAN"
          : "MEMBER_UNBAN";

      await auditLogService.log(
        {
          guildId: guild.id,
          category: "member",
          action: actionName,
          executor: {
            id: moderator.id,
            tag: moderator.tag || moderator.username,
            avatar: moderator.displayAvatarURL(),
          },
          target: {
            id: target.id,
            tag: target.tag || target.username,
            name: target.displayName || target.username,
          },
          details: {
            caseId,
            reason,
            duration: options.duration,
          },
        },
        options.client
      );
    }

    // 2. DM an den betroffenen Nutzer senden (falls möglich)
    try {
      const actionText =
        action === "WARN"
          ? "verwarnt"
          : action === "TIMEOUT"
          ? `in den Timeout versetzt (${options.duration || "temporär"})`
          : action === "KICK"
          ? "vom Server gekickt"
          : action === "BAN"
          ? "vom Server gebannt"
          : "entbannt";

      const dmEmbed = new EmbedBuilder()
        .setColor(action === "WARN" ? 0xfee75c : action === "TIMEOUT" ? 0xe67e22 : 0xed4245)
        .setTitle(`🛡️ Moderations-Mitteilung: ${guild.name}`)
        .setDescription(`Du wurdest auf **${guild.name}** ${actionText}.`)
        .addFields(
          { name: "Fall-ID", value: `#${caseId}`, inline: true },
          { name: "Moderator", value: moderator.tag || moderator.username, inline: true },
          { name: "Begründung", value: reason || "Keine Begründung angegeben", inline: false }
        )
        .setTimestamp();

      await target.send({ embeds: [dmEmbed] }).catch(() => {
        // Direct messages could be disabled
      });
    } catch {
      // Ignorieren falls DMs geschlossen sind
    }

    return newCase;
  }

  public getCases(guildId: string, targetId?: string): ModCase[] {
    const list = this.cases[guildId] || [];
    if (!targetId) return list;
    return list.filter((c) => c.targetId === targetId);
  }

  public getCaseById(guildId: string, caseId: number): ModCase | undefined {
    const list = this.cases[guildId] || [];
    return list.find((c) => c.id === caseId);
  }

  public deleteCase(guildId: string, caseId: number): boolean {
    const list = this.cases[guildId] || [];
    const index = list.findIndex((c) => c.id === caseId);
    if (index === -1) return false;
    list.splice(index, 1);
    this.saveCases();
    return true;
  }
}

export const moderationService = new ModerationService();
