import assert from "node:assert/strict";
import { test } from "node:test";
import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { safePermissions } from "../src/services/backupService";
import { safeInternalPath } from "../web/src/lib/safePath";
import { authCodeService } from "../src/services/authCodeService";

/**
 * Diese Tests sichern die Korrekturen aus v2.26.0 ab, damit die Lücken
 * nicht bei einem späteren Umbau unbemerkt wieder aufgehen.
 */

test("Weiterleitung: nur eigene Pfade, keine fremden Domains", () => {
  // Angriffe: protokoll-relative URLs landen sonst auf einer fremden Seite
  assert.equal(safeInternalPath("//evil.com/phish"), "");
  assert.equal(safeInternalPath("/\\evil.com"), "");
  assert.equal(safeInternalPath("https://evil.com"), "");
  assert.equal(safeInternalPath("http://evil.com"), "");
  assert.equal(safeInternalPath("evil.com"), "");
  assert.equal(safeInternalPath("/\u0000/evil.com"), "");
  assert.equal(safeInternalPath(null), "");
  assert.equal(safeInternalPath(""), "");

  // Erlaubt: echte interne Ziele
  assert.equal(safeInternalPath("/economy"), "/economy");
  assert.equal(safeInternalPath("/stats?tab=voice"), "/stats?tab=voice");
  assert.equal(safeInternalPath("/news#top"), "/news#top");
  assert.equal(safeInternalPath("  /backups  "), "/backups");
});

test("Backup-Restore: gefährliche Rechte werden gefiltert", () => {
  const angriff = (
    PermissionFlagsBits.Administrator |
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages
  ).toString();

  // Moderator mit "Server verwalten" darf keine Admin-Rechte wiederherstellen
  const gefiltert = safePermissions(angriff, false);
  assert.equal(gefiltert.stripped, true);
  const rechte = new PermissionsBitField(gefiltert.value);
  assert.equal(rechte.has(PermissionFlagsBits.Administrator), false);
  assert.equal(rechte.has(PermissionFlagsBits.ViewChannel), true, "harmlose Rechte bleiben erhalten");

  // Server-Inhaber / Administrator darf weiterhin alles wiederherstellen
  const erlaubt = safePermissions(angriff, true);
  assert.equal(erlaubt.stripped, false);
  assert.equal(new PermissionsBitField(erlaubt.value).has(PermissionFlagsBits.Administrator), true);

  // Harmlose Rolle löst keine Warnung aus
  const harmlos = (PermissionFlagsBits.ViewChannel | PermissionFlagsBits.Connect).toString();
  assert.equal(safePermissions(harmlos, false).stripped, false);

  // Kaputter Wert führt nicht zum Absturz
  assert.equal(safePermissions("keine-zahl", false).value, BigInt(0));

  // Auch Moderationsrechte sind gesperrt
  assert.equal(
    new PermissionsBitField(safePermissions(PermissionFlagsBits.BanMembers.toString(), false).value).has(
      PermissionFlagsBits.BanMembers
    ),
    false
  );
});

test("Login-Code: lang, zufällig und nicht erratbar", () => {
  const guild = { id: "1" } as any;
  const member = {} as any;
  const codes = new Set<string>();

  for (let i = 0; i < 200; i++) {
    const user = { id: `user_${i}`, username: "Test", displayName: "Test", avatar: null } as any;
    const { code } = authCodeService.generateCode(guild, user, member);
    assert.match(code, /^GLG-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/, `unerwartetes Format: ${code}`);
    codes.add(code);
  }

  // 200 Codes müssen verschieden sein (bei 4 Ziffern wäre das Raten trivial gewesen)
  assert.equal(codes.size, 200, "Codes dürfen sich nicht wiederholen");
});

test("Login-Code: falscher Code wird abgewiesen", async () => {
  const client = { guilds: { cache: new Map() } } as any;
  for (const falsch of ["GLG-0000", "1234", "", "GLG-AAAAAA", "völlig falsch"]) {
    const res = await authCodeService.verifyCode(falsch, client);
    assert.equal(res.valid, false, `"${falsch}" hätte abgelehnt werden müssen`);
  }
});

test("Login-Code: gültiger Code funktioniert genau einmal", async () => {
  const guild = { id: "99" } as any;
  const user = { id: "4711", username: "Dominik", displayName: "Dominik", avatar: null } as any;
  const client = { guilds: { cache: new Map() } } as any;

  const { code } = authCodeService.generateCode(guild, user, {} as any);
  const ersterVersuch = await authCodeService.verifyCode(code, client);
  assert.equal(ersterVersuch.valid, true);
  assert.equal(ersterVersuch.user?.id, "4711");

  // Zweite Verwendung muss scheitern (Einmal-Code)
  const zweiterVersuch = await authCodeService.verifyCode(code, client);
  assert.equal(zweiterVersuch.valid, false);
});

test("Login-Code: Eingabe ohne Präfix wird erkannt", async () => {
  const guild = { id: "99" } as any;
  const user = { id: "815", username: "Dominik", displayName: "Dominik", avatar: null } as any;
  const client = { guilds: { cache: new Map() } } as any;

  const { code } = authCodeService.generateCode(guild, user, {} as any);
  const ohnePrefix = code.replace("GLG-", "").toLowerCase();
  const res = await authCodeService.verifyCode(ohnePrefix, client);
  assert.equal(res.valid, true, "Code ohne GLG- und klein geschrieben muss trotzdem gehen");
});
