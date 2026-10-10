import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  OverwriteType,
  PermissionFlagsBits,
  TextChannel,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";
import { RULES, RulesConfig } from "../config/rules";
import { rolePanelService } from "./rolePanelService";
import { BannerName, getBanner } from "../utils/banners";
import { gameNewsService } from "./gameNewsService";

const COLOR = 0x5865f2;
const RULES_FILE = path.join(process.cwd(), "data", "rules.json");
/** Eigene Standard-Regeln (nicht im Git-Repo) - ersetzen die eingebauten Beispiel-Regeln. */
const DEFAULT_RULES_FILE = path.join(process.cwd(), "config", "rules.json");

function loadDefaultRules(): RulesConfig {
  try {
    if (fs.existsSync(DEFAULT_RULES_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEFAULT_RULES_FILE, "utf-8"));
      if (data && Array.isArray(data.rules)) return { ...RULES, ...data };
    }
  } catch (e) {
    console.error("[Rules] config/rules.json ist ungültig - nutze Beispiel-Regeln:", e);
  }
  return RULES;
}

export const RULE_LIMITS = { maxRules: 25, title: 100, ruleTitle: 100, emoji: 16, text: 1000, intro: 1500, consequences: 500, acceptText: 1000 };

class RulesService {
  // ---------------------------------------------------------------
  //  Regeln laden / speichern (Dashboard-Editor)
  // ---------------------------------------------------------------
  public getRules(): RulesConfig {
    try {
      if (fs.existsSync(RULES_FILE)) {
        const data = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));
        if (data && Array.isArray(data.rules)) return { ...loadDefaultRules(), ...data };
      }
    } catch (e) {
      console.error("[Rules] data/rules.json ist ungültig - nutze Standard-Regeln:", e);
    }
    return loadDefaultRules();
  }

  public isCustomized(): boolean {
    return fs.existsSync(RULES_FILE);
  }

  /** Prüft & speichert Regeln. Gibt eine Fehlermeldung zurück oder null. */
  public saveRules(input: any): string | null {
    const L = RULE_LIMITS;
    if (!input || typeof input !== "object" || !Array.isArray(input.rules)) return "Ungültiges Format.";
    const RULES = loadDefaultRules();
    const str = (v: any) => (typeof v === "string" ? v.trim() : "");

    const rules: RulesConfig = {
      title: str(input.title) || RULES.title,
      intro: str(input.intro),
      consequences: str(input.consequences),
      acceptText: str(input.acceptText) || RULES.acceptText,
      rules: input.rules
        .map((r: any) => ({ emoji: str(r?.emoji) || "📌", title: str(r?.title), text: str(r?.text) }))
        .filter((r: any) => r.title || r.text),
    };

    if (rules.rules.length === 0) return "Es muss mindestens eine Regel geben.";
    if (rules.rules.length > L.maxRules) return `Maximal ${L.maxRules} Regeln möglich.`;
    if (rules.title.length > L.title) return `Der Titel darf max. ${L.title} Zeichen haben.`;
    if (rules.intro.length > L.intro) return `Die Einleitung darf max. ${L.intro} Zeichen haben.`;
    if (rules.consequences.length > L.consequences) return `Das Schlusswort darf max. ${L.consequences} Zeichen haben.`;
    if (rules.acceptText.length > L.acceptText) return `Der Bestätigungstext darf max. ${L.acceptText} Zeichen haben.`;
    for (const [i, r] of rules.rules.entries()) {
      if (!r.title) return `§${i + 1}: Bitte einen Titel angeben.`;
      if (r.title.length > L.ruleTitle) return `§${i + 1}: Titel zu lang (max. ${L.ruleTitle} Zeichen).`;
      if (r.emoji.length > L.emoji) return `§${i + 1}: Emoji zu lang.`;
      if (r.text.length > L.text) return `§${i + 1}: Text zu lang (max. ${L.text} Zeichen).`;
    }

    const dir = path.dirname(RULES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RULES_FILE + ".tmp", JSON.stringify(rules, null, 2), "utf-8");
    fs.renameSync(RULES_FILE + ".tmp", RULES_FILE);
    return null;
  }

  /** Setzt die Regeln auf die Standardwerte (config/rules.json bzw. src/config/rules.ts) zurück. */
  public resetRules() {
    if (fs.existsSync(RULES_FILE)) fs.unlinkSync(RULES_FILE);
  }

  // ---------------------------------------------------------------
  //  Embeds & Buttons
  // ---------------------------------------------------------------
  /**
   * Baut die Regel-Nachrichten. Lange Regelwerke werden automatisch auf mehrere
   * Embeds/Nachrichten verteilt (Discord: max. 4096 Zeichen pro Embed, 6000 pro Nachricht).
   * Die letzte Nachricht enthält den "Regeln akzeptieren"-Button.
   */
  /** Löst {@name}-Platzhalter in Erwähnungen auf (Benutzername, Anzeigename oder Nickname). */
  private async resolveMentions(guild: Guild): Promise<Map<string, string>> {
    const R = this.getRules();
    const all = [R.intro, R.consequences, R.acceptText, ...R.rules.map((r) => r.text)].join("\n");
    const names = [...new Set([...all.matchAll(/{@([^}]+)}/g)].map((m) => m[1]))];
    const result = new Map<string, string>();

    for (const name of names) {
      const lower = name.toLowerCase();
      const found = await guild.members.fetch({ query: name, limit: 10 }).catch(() => null);
      const member = found?.find(
        (m) =>
          m.user.username.toLowerCase() === lower ||
          m.user.globalName?.toLowerCase() === lower ||
          m.nickname?.toLowerCase() === lower
      ) || (found && found.size === 1 ? found.first() : undefined);

      if (member) {
        result.set(name, `<@${member.id}>`);
      } else {
        console.warn(`[Rules] Mitglied "${name}" nicht gefunden - wird als Text angezeigt.`);
        result.set(name, `**${name}**`);
      }
    }
    return result;
  }

  public async createRulesMessages(guild: Guild, permissionsChannelId?: string) {
    const icon = guild.iconURL({ size: 256 }) || undefined;
    const RULES = this.getRules();
    const mentions = await this.resolveMentions(guild);
    const fill = (text: string) =>
      text
        .replace(/{@([^}]+)}/g, (_, name: string) => mentions.get(name) || `**${name}**`)
        .replace(/{server}/g, guild.name)
        .replace(/{owner}/g, `<@${guild.ownerId}>`)
        .replace(/{permissions}/g, permissionsChannelId ? `<#${permissionsChannelId}>` : "**#berechtigungen**");

    const header = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${RULES.title} · ${guild.name}`)
      .setThumbnail(icon || null);
    if (RULES.intro) header.setDescription(fill(RULES.intro));

    // Regeln in Blöcke packen (max. ~3800 Zeichen pro Embed)
    const blocks = RULES.rules.map((r, i) => `**${r.emoji}  §${i + 1} · ${r.title}**\n${fill(r.text)}`);
    const ruleEmbeds: EmbedBuilder[] = [];
    // Gleichmäßig verteilen statt "voll bis zum Rand" - sieht in Discord ordentlicher aus
    const totalLen = blocks.reduce((n, b) => n + b.length + 2, 0);
    const target = totalLen / Math.ceil(totalLen / 3800);
    let current = "";
    for (const block of blocks) {
      if (current && (current.length + block.length + 2 > 3800 || current.length >= target)) {
        ruleEmbeds.push(new EmbedBuilder().setColor(COLOR).setDescription(current));
        current = "";
      }
      current += (current ? "\n\n" : "") + block;
    }
    if (RULES.consequences) current += `\n\n⚠️ *${fill(RULES.consequences)}*`;
    ruleEmbeds.push(new EmbedBuilder().setColor(COLOR).setDescription(current));

    const accept = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Regeln akzeptieren")
      .setDescription(fill(RULES.acceptText))
      .setFooter({ text: `${guild.name} · Zuletzt aktualisiert`, iconURL: icon })
      .setTimestamp();

    // Embeds auf Nachrichten verteilen (max. 5800 Zeichen je Nachricht)
    const all = [header, ...ruleEmbeds, accept];
    const size = (e: EmbedBuilder) => {
      const j = e.toJSON();
      return (j.title?.length || 0) + (j.description?.length || 0) + (j.footer?.text.length || 0);
    };
    const messages: { embeds: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] }[] = [];
    let batch: EmbedBuilder[] = [];
    let batchSize = 0;
    for (const e of all) {
      if (batch.length && (batchSize + size(e) > 5800 || batch.length >= 10)) {
        messages.push({ embeds: batch });
        batch = [];
        batchSize = 0;
      }
      batch.push(e);
      batchSize += size(e);
    }
    messages.push({ embeds: batch, components: this.createRulesComponents() });
    return messages;
  }

  public createRulesComponents() {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("role_btn_rules")
          .setLabel("Regeln akzeptieren")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      ),
    ];
  }

  public createPermissionsEmbed(guild: Guild) {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("🔔 Berechtigungen & Benachrichtigungen")
      .setDescription(
        "Hier entscheidest du selbst, worüber du informiert werden möchtest. " +
          "Ein Klick schaltet die Rolle **an**, ein zweiter Klick wieder **aus**.\n\n" +
          "🔴 **Live-Stream Alerts** (`bn.live`)\n" +
          "Ping, sobald jemand aus der Community live geht.\n\n" +
          "🎮 **Free-Games Alerts** (`bn.free`)\n" +
          "Ping, sobald es ein Spiel bei Epic, Steam oder GOG komplett kostenlos gibt - und Zugriff auf den Free-Games-Kanal.\n\n" +
          "📰 **Game-News** (`bn.gamenews`)\n" +
          "Spiel-Updates, Patchnotes und Events - und Zugriff auf den Game-News-Kanal.\n\n" +
          "🖥️ **Treiber-News** (`bn.treiber`)\n" +
          "Neue Grafik- und Chipsatz-Treiber (NVIDIA, AMD, Intel) - und Zugriff auf den Treiber-Kanal.\n\n" +
          "👤 **Meine Rollen** zeigt dir, was du gerade aktiviert hast."
      )
      .setThumbnail(guild.iconURL({ size: 256 }) || null)
      .setFooter({ text: `${guild.name} · 1-Klick An/Aus` });
  }

  // ---------------------------------------------------------------
  //  Kanäle anlegen & Nachrichten posten
  // ---------------------------------------------------------------

  private async findOrCreateText(guild: Guild, matches: string[], name: string, topic: string, position?: number) {
    const existing = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && matches.some((m) => c.name.toLowerCase().includes(m))
    ) as TextChannel | undefined;
    if (existing) return { channel: existing, created: false };

    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      topic,
      position,
      reason: "GLGBot: Regel-System",
    });
    return { channel, created: true };
  }

  /** Löscht ältere Nachrichten des Bots im Kanal, damit nichts doppelt dasteht. */
  private async clearBotMessages(channel: TextChannel) {
    const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (!msgs) return;
    for (const msg of msgs.values()) {
      if (msg.author.id === channel.client.user.id) await msg.delete().catch(() => null);
    }
  }

  /**
   * Legt #regeln und #berechtigungen an (falls nötig), setzt die Kanalrechte
   * und postet die Nachrichten neu.
   */
  public async setupChannels(guild: Guild) {
    const cfg = rolePanelService.getConfig(guild.id);
    const guestRoleId = cfg?.rulesRoleId;
    if (!guestRoleId || !guild.roles.cache.has(guestRoleId)) {
      throw new Error("Keine Gast-Rolle eingerichtet. Bitte zuerst `/setup-roles auto` oder `/setup-roles set gast_rolle:` ausführen.");
    }

    const rules = await this.findOrCreateText(guild, ["regeln", "rules"], "📜・regeln", "Serverregeln - bitte lesen und unten bestätigen.", 0);
    const perms = await this.findOrCreateText(
      guild,
      ["berechtigung"],
      "🔔・berechtigungen",
      "Wähle hier deine Benachrichtigungen (Live-Streams, Free-Games).",
      rules.channel.position + 1
    );

    const everyone = guild.roles.everyone.id;
    const botId = guild.members.me!.id;

    // #regeln: für ALLE sichtbar, aber niemand kann schreiben
    await rules.channel.permissionOverwrites.set(
      [
        {
          id: everyone,
          type: OverwriteType.Role,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads,
          ],
        },
        {
          id: botId,
          type: OverwriteType.Member,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
        },
      ],
      "GLGBot: Regelkanal"
    );

    // #berechtigungen: nur für Mitglieder mit Gast-Rolle, ebenfalls nur lesen
    await perms.channel.permissionOverwrites.set(
      [
        { id: everyone, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        {
          id: guestRoleId,
          type: OverwriteType.Role,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
        },
        {
          id: botId,
          type: OverwriteType.Member,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
        },
      ],
      "GLGBot: Berechtigungskanal"
    );

    // Nachrichten neu posten
    await this.clearBotMessages(rules.channel);
    const rulesBanner = getBanner("rules");
    const rulesMessages = await this.createRulesMessages(guild, perms.channel.id);
    for (const [i, msg] of rulesMessages.entries()) {
      // Animiertes Banner ganz oben über die erste Nachricht
      const withBanner = i === 0 && rulesBanner && msg.embeds.length < 10;
      await rules.channel.send({
        ...msg,
        embeds: withBanner ? [rulesBanner.embed, ...msg.embeds] : msg.embeds,
        files: withBanner ? [rulesBanner.file] : [],
        flags: [MessageFlags.SuppressNotifications],
      });
    }

    await this.clearBotMessages(perms.channel);
    const permsBanner = getBanner("permissions");
    await perms.channel.send({
      embeds: permsBanner ? [permsBanner.embed, this.createPermissionsEmbed(guild)] : [this.createPermissionsEmbed(guild)],
      files: permsBanner ? [permsBanner.file] : [],
      components: rolePanelService.createPanelComponents(false),
      flags: [MessageFlags.SuppressNotifications],
    });

    rolePanelService.updateConfig(guild.id, {
      rulesChannelId: rules.channel.id,
      permissionsChannelId: perms.channel.id,
    });

    // Kopf-Nachrichten (Banner + Erklärung) in #free-games und #game-news
    await this.postChannelHeaders(guild).catch((e) => console.error("[Rules] Kanal-Banner fehlgeschlagen:", e));

    return { rules, perms };
  }

  // ---------------------------------------------------------------
  //  Kopf-Nachricht mit animiertem Banner für #free-games & #game-news
  // ---------------------------------------------------------------

  /**
   * Postet (oder aktualisiert) eine angepinnte Kopf-Nachricht mit Banner und kurzer Erklärung.
   * Bestehende Kopf-Nachrichten werden bearbeitet statt neu gepostet - die Posts im Kanal bleiben unberührt.
   */
  public async postChannelHeaders(guild: Guild, only?: BannerName) {
    const cfg = rolePanelService.getConfig(guild.id) || {};
    const perms = cfg.permissionsChannelId ? `<#${cfg.permissionsChannelId}>` : "#berechtigungen";

    const headers: { channelId?: string; banner: BannerName; title: string; text: string }[] = [
      {
        channelId: cfg.freeGamesChannelId,
        banner: "free-games",
        title: "🎁 Kostenlose Spiele",
        text:
          "Hier postet der Bot automatisch, sobald es ein Spiel bei **Epic Games, Steam oder GOG** komplett kostenlos gibt.\n\n" +
          "🎮 Mit **„In Steam öffnen“** bzw. **„Im Epic Launcher öffnen“** startet direkt die App.\n" +
          `🔔 Ping bei neuen Spielen? Schalte in ${perms} die Rolle **bn.free** an.`,
      },
      {
        channelId: cfg.gameNewsChannelId,
        banner: "game-news",
        title: "📰 Game-News",
        text:
          "Updates, Patchnotes und Events eurer Spiele - automatisch, sobald die Entwickler etwas veröffentlichen.\n\n" +
          `🔔 Diesen Kanal und die Pings schaltest du in ${perms} mit der Rolle **bn.gamenews** an oder aus.`,
      },
      {
        channelId: cfg.driverNewsChannelId,
        banner: "driver-news",
        title: "🖥️ Treiber-News",
        text:
          "Neue **Grafik- und Chipsatz-Treiber** von NVIDIA, AMD & Intel - mit Release-Notes und Download-Link.\n\n" +
          `🔔 Diesen Kanal und die Pings schaltest du in ${perms} mit der Rolle **bn.treiber** an oder aus.`,
      },
    ];

    // #game-news & #treiber-news: immer aktuelle Liste der abonnierten Quellen + letzte Änderungen
    const ICON: Record<string, string> = { steam: "🎮", minecraft: "⛏️", nvidia: "🟩", "amd-gpu": "🟥", "amd-chipset": "🟥", "intel-gpu": "🟦" };
    const ACTION: Record<string, string> = { added: "➕ hinzugefügt", removed: "➖ entfernt", enabled: "▶️ aktiviert", disabled: "⏸️ pausiert" };
    for (const h of headers.filter((x) => (x.banner === "game-news" || x.banner === "driver-news") && x.channelId)) {
      const feeds = gameNewsService.getFeeds(guild.id).filter((f) => f.channelId === h.channelId);
      const active = feeds.filter((f) => f.enabled);
      const paused = feeds.filter((f) => !f.enabled);
      const list = active.length
        ? active.map((f) => `${ICON[f.type] || "•"} ${f.name}${f.onlyPatchnotes ? " *(nur Patchnotes)*" : ""}${f.snapshots ? " *(+ Snapshots)*" : ""}`).join("\n")
        : "*Noch nichts abonniert.*";
      const recent = gameNewsService
        .getHistory(guild.id)
        .filter((x) => x.channelId === h.channelId)
        .slice(0, 5)
        .map((x) => `${ACTION[x.action]}: **${x.name}** · <t:${Math.floor(new Date(x.at).getTime() / 1000)}:R>`)
        .join("\n");
      h.text +=
        `\n\n📋 **Aktuell abonniert (${active.length}):**\n${list.slice(0, 2500)}` +
        (paused.length ? `\n\n⏸️ **Pausiert:** ${paused.map((f) => f.name).join(", ").slice(0, 500)}` : "") +
        (recent ? `\n\n🕓 **Zuletzt geändert:**\n${recent}` : "");
    }

    const stored: Record<string, string> = { ...(cfg.headerMessages || {}) };
    for (const h of headers) {
      if (!h.channelId || (only && h.banner !== only)) continue;
      const channel = guild.channels.cache.get(h.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) continue;

      const banner = getBanner(h.banner);
      const info = new EmbedBuilder()
        .setColor(banner?.color ?? COLOR)
        .setTitle(h.title)
        .setDescription(h.text)
        .setFooter({ text: `${guild.name} · GLGBot` });
      const payload = {
        embeds: banner ? [banner.embed, info] : [info],
        files: banner ? [banner.file] : [],
      };

      const existingId = stored[h.channelId];
      const existing = existingId ? await channel.messages.fetch(existingId).catch(() => null) : null;
      if (existing && existing.author.id === guild.client.user.id) {
        // Banner-GIF bleibt als Anhang erhalten - nur der Text wird aktualisiert (kein erneuter Upload)
        const hasBanner = existing.attachments.some((a) => a.name === `${h.banner}.gif`);
        if (hasBanner || !banner) await existing.edit({ embeds: payload.embeds });
        else await existing.edit({ ...payload, attachments: [] });
      } else {
        const msg = await channel.send({ ...payload, flags: [MessageFlags.SuppressNotifications] });
        await msg.pin().catch(() => null); // braucht "Nachrichten verwalten" - optional
        stored[h.channelId] = msg.id;
      }
    }
    rolePanelService.updateConfig(guild.id, { headerMessages: stored });
  }

  // ---------------------------------------------------------------
  //  Server sperren: nur wer die Regeln akzeptiert hat, sieht alles
  // ---------------------------------------------------------------

  /** Prüft vorab, ob der Bot alles darf - sonst würde er sich selbst aussperren. */
  public checkLockPrerequisites(guild: Guild): string | null {
    const me = guild.members.me;
    if (!me) return "Bot-Mitglied nicht gefunden.";
    if (me.permissions.has(PermissionFlagsBits.Administrator)) return null;

    const needed = [
      [PermissionFlagsBits.ManageRoles, "Rollen verwalten"],
      [PermissionFlagsBits.ManageChannels, "Kanäle verwalten"],
    ] as const;
    for (const [flag, name] of needed) {
      if (!me.permissions.has(flag)) return `Dem Bot fehlt die Berechtigung **${name}**.`;
    }

    // ViewChannel muss über eine EIGENE Rolle des Bots kommen, nicht über @everyone
    const viaOwnRole = me.roles.cache.some(
      (r) => r.id !== guild.id && r.permissions.has(PermissionFlagsBits.ViewChannel)
    );
    if (!viaOwnRole) {
      return "Die Bot-Rolle braucht selbst die Berechtigung **Kanäle ansehen** (oder Administrator), sonst würde sich der Bot aussperren.";
    }

    const guestRoleId = rolePanelService.getConfig(guild.id)?.rulesRoleId;
    const guestRole = guestRoleId ? guild.roles.cache.get(guestRoleId) : undefined;
    if (!guestRole) return "Keine Gast-Rolle eingerichtet (`/setup-roles auto`).";
    if (guestRole.position >= me.roles.highest.position) {
      return `Die Bot-Rolle muss in den Server-Einstellungen **über** der Rolle ${guestRole} stehen.`;
    }
    return null;
  }

  public async lockServer(guild: Guild) {
    const cfg = rolePanelService.getConfig(guild.id);
    const guestRoleId = cfg!.rulesRoleId!;
    const guestRole = guild.roles.cache.get(guestRoleId)!;
    const everyone = guild.roles.everyone;

    // 1. Allen bestehenden Mitgliedern die Gast-Rolle geben, damit niemand ausgesperrt wird
    const members = await guild.members.fetch();
    let granted = 0;
    for (const m of members.values()) {
      if (m.user.bot || m.roles.cache.has(guestRoleId)) continue;
      await m.roles.add(guestRoleId, "GLGBot: Regel-Sperre aktiviert (bestehendes Mitglied)").catch(() => null);
      granted++;
    }

    // 2. Gast-Rolle darf Kanäle sehen, @everyone nicht mehr
    if (!guestRole.permissions.has(PermissionFlagsBits.ViewChannel)) {
      await guestRole.setPermissions(guestRole.permissions.add(PermissionFlagsBits.ViewChannel), "GLGBot: Regel-Sperre");
    }
    await everyone.setPermissions(everyone.permissions.remove(PermissionFlagsBits.ViewChannel), "GLGBot: Regel-Sperre");

    // 3. Kanäle, die @everyone ausdrücklich freigeben, auf die Gast-Rolle umstellen
    //    (#regeln bleibt für alle sichtbar)
    let adjusted = 0;
    for (const ch of guild.channels.cache.values()) {
      if (!("permissionOverwrites" in ch) || ch.id === cfg?.rulesChannelId) continue;
      const ow = ch.permissionOverwrites.cache.get(everyone.id);
      if (ow && ow.allow.has(PermissionFlagsBits.ViewChannel)) {
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: null }, { reason: "GLGBot: Regel-Sperre" }).catch(() => null);
        await ch.permissionOverwrites.edit(guestRoleId, { ViewChannel: true }, { reason: "GLGBot: Regel-Sperre" }).catch(() => null);
        adjusted++;
      }
    }

    rolePanelService.updateConfig(guild.id, { serverLocked: true });
    return { granted, adjusted };
  }

  public async unlockServer(guild: Guild) {
    const everyone = guild.roles.everyone;
    await everyone.setPermissions(everyone.permissions.add(PermissionFlagsBits.ViewChannel), "GLGBot: Regel-Sperre aufgehoben");
    rolePanelService.updateConfig(guild.id, { serverLocked: false });
  }

  // ---------------------------------------------------------------
  //  Discord-Regel-Screening (Pop-up beim Beitreten)
  // ---------------------------------------------------------------
  /**
   * Wenn in den Server-Einstellungen das Regel-Screening aktiv ist, zeigt Discord
   * neuen Mitgliedern beim Beitritt ein Regel-Pop-up. Sobald sie es bestätigen
   * (pending: true -> false), bekommen sie automatisch die Gast-Rolle.
   */
  public async handleScreeningPassed(oldMember: GuildMember, newMember: GuildMember) {
    if (!oldMember.pending || newMember.pending || newMember.user.bot) return;
    const guestRoleId = rolePanelService.getConfig(newMember.guild.id)?.rulesRoleId;
    if (!guestRoleId || newMember.roles.cache.has(guestRoleId)) return;

    await newMember.roles
      .add(guestRoleId, "Regeln im Discord-Pop-up akzeptiert")
      .then(() => console.log(`[Rules] ${newMember.user.tag} hat die Regeln im Pop-up akzeptiert -> Gast-Rolle vergeben`))
      .catch((e) => console.error("[Rules] Konnte Gast-Rolle nach Screening nicht vergeben:", e));
  }

  // ---------------------------------------------------------------
  //  Willkommens-DM für neue Mitglieder
  // ---------------------------------------------------------------
  public async sendWelcomeDM(member: GuildMember) {
    const cfg = rolePanelService.getConfig(member.guild.id);
    if (!cfg?.rulesChannelId) return;

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`👋 Willkommen auf ${member.guild.name}!`)
      .setDescription(
        `Schön, dass du da bist, **${member.displayName}**!\n\n` +
          `Bevor es losgeht, lies bitte kurz die Regeln in <#${cfg.rulesChannelId}> und klicke dort auf **„Regeln akzeptieren“**. ` +
          `Danach siehst du alle Kanäle. 🎉`
      )
      .setThumbnail(member.guild.iconURL({ size: 256 }) || null);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Zu den Regeln")
        .setEmoji("📜")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${member.guild.id}/${cfg.rulesChannelId}`)
    );

    await member.send({ embeds: [embed], components: [row] }).catch(() => null); // DMs evtl. geschlossen
  }
}

export const rulesService = new RulesService();
