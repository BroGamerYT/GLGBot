import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ChannelType } from "discord.js";
import { backupService, decryptBackupFile, encryptBackupFile, GuildBackup } from "../src/services/backupService";
import { guildBotSettingsSchema } from "../src/services/backupConfigService";

const testBackups: string[] = [];
const encryptionKey = "test-key-with-more-than-thirty-two-characters";

afterEach(() => {
  for (const id of testBackups.splice(0)) backupService.deleteBackup(id);
});

function sourceSnapshot(): Omit<GuildBackup, "schemaVersion" | "checksum"> {
  return {
    id: "backup_1_deadbeef",
    guildId: "source-guild",
    guildName: "Quellserver",
    createdAt: new Date().toISOString(),
    summary: { roleCount: 1, categoryCount: 0, channelCount: 0 },
    roles: [{
      id: "source-role",
      name: "Moderator",
      color: 0,
      hoist: false,
      position: 1,
      permissions: "0",
      mentionable: false,
      managed: false,
      isEveryone: false,
    }],
    categories: [],
    channels: [],
  };
}

test("imports legacy JSON and writes a checksummed current snapshot", () => {
  const imported = backupService.importBackup("source-guild", sourceSnapshot());
  testBackups.push(imported.id);

  const loaded = backupService.getBackup(imported.id, "source-guild");
  assert.equal(loaded?.schemaVersion, 1);
  assert.match(loaded?.checksum || "", /^[a-f0-9]{64}$/);
  assert.equal(backupService.getBackup(imported.id, "another-guild"), null);
});

test("rejects changed backup content when the checksum no longer matches", () => {
  const original = backupService.importBackup("source-guild", sourceSnapshot());
  testBackups.push(original.id);

  assert.throws(() => backupService.importBackup("source-guild", {
    ...original,
    roles: [{ ...original.roles[0], name: "Changed" }],
  }), /Prüfsumme/);
});

test("encrypts and authenticates compressed backup files", () => {
  const snapshot = { ...sourceSnapshot(), schemaVersion: 1 } as GuildBackup;
  const encrypted = encryptBackupFile(snapshot, encryptionKey);
  const decrypted = decryptBackupFile(encrypted, encryptionKey) as GuildBackup;
  assert.equal(decrypted.guildId, snapshot.guildId);
  assert.throws(() => decryptBackupFile(encrypted, `${encryptionKey}-wrong`));

  const tampered = Buffer.from(encrypted);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptBackupFile(tampered, encryptionKey));

  const previousKey = "previous-backup-key-that-is-also-long-enough";
  const beforeRotation = encryptBackupFile(snapshot, previousKey);
  assert.equal((decryptBackupFile(beforeRotation, [encryptionKey, previousKey]) as GuildBackup).guildId, snapshot.guildId);
});

test("preserves source guild identity and blocks ambiguous cross-server role matches", async () => {
  const imported = backupService.importBackup("target-guild", sourceSnapshot());
  testBackups.push(imported.id);
  assert.equal(imported.sourceGuildId, "source-guild");

  const makeCache = (entries: Array<{ id: string; name: string; managed?: boolean }>) =>
    new Map(entries.map((entry) => [entry.id, entry]));
  const targetGuild = {
    id: "target-guild",
    name: "Zielserver",
    roles: {
      cache: makeCache([
        { id: "role-one", name: "Moderator" },
        { id: "role-two", name: "Moderator" },
      ]),
      fetch: async () => undefined,
    },
    channels: { cache: makeCache([]), fetch: async () => undefined },
  } as any;

  const preview = await backupService.previewRestore(targetGuild, imported.id, { allowCrossServer: true });
  assert.equal(preview.crossServer, true);
  assert.ok(preview.ambiguousMappings.some((mapping) => mapping.includes("Rolle")));

  const roleCandidate = preview.mappingCandidates.find((candidate) => candidate.kind === "role");
  assert.ok(roleCandidate);
  const resolved = await backupService.previewRestore(targetGuild, imported.id, {
    allowCrossServer: true,
    idMappings: { [roleCandidate.sourceId]: "role-one" },
  });
  assert.equal(resolved.ambiguousMappings.length, 0);
  assert.deepEqual(resolved.roles.update, ["Moderator"]);
});

test("rejects imported channel types outside Discord's channel enum", () => {
  const invalid = {
    ...sourceSnapshot(),
    summary: { roleCount: 1, categoryCount: 0, channelCount: 1 },
    channels: [{ id: "bad-channel", name: "bad", type: 999, position: 0, overwrites: [] }],
  };
  assert.throws(() => backupService.importBackup("source-guild", invalid), /Kanaltyp/);
  assert.ok(Object.values(ChannelType).includes(ChannelType.GuildText));
});

test("guild settings snapshots allow only bounded, non-runtime configuration", () => {
  const parsed = guildBotSettingsSchema.parse({
    modules: { voice: true, economy: false },
    gameServers: [{ id: "server-1", name: "Minecraft", type: "minecraft", host: "game.example.com", port: 25565 }],
    freeGames: { epic: true, steam: true, gog: true, other: false, upcoming: false, keys: false },
    clips: { channelId: "clip-channel", weekday: 0, hour: 20 },
    statsChannels: { counters: { voice: { enabled: true, template: "Voice {count}", channelId: "voice-counter" } } },
    streamNotifications: [{ id: "alert-1", platform: "twitch", channelName: "streamer", discordChannelId: "alerts" }],
    customCommands: [{ id: "custom-1", name: "rules", description: "Show rules", content: "Read the rules", ephemeral: true, textTrigger: false, uses: 0, updatedAt: 0 }],
    newsFeeds: [{ id: "feed-1", type: "steam", appId: "730", name: "Counter-Strike", channelId: "news", enabled: true, createdAt: new Date().toISOString() }],
  });
  assert.equal(parsed.modules?.voice, true);
  assert.equal(parsed.gameServers?.[0]?.port, 25565);
  assert.equal(parsed.freeGames?.epic, true);
  assert.equal(parsed.clips?.weekday, 0);
  assert.equal(parsed.streamNotifications?.[0]?.channelName, "streamer");
  assert.equal(parsed.customCommands?.[0]?.uses, 0);
  assert.equal(parsed.newsFeeds?.[0]?.type, "steam");
  assert.throws(() => guildBotSettingsSchema.parse({ runtimeStats: { playerCount: 4 } }));
  assert.throws(() => guildBotSettingsSchema.parse({ gameServers: [{ id: "bad", name: "Bad", type: "tcp", host: "https://example.com", port: 70000 }] }));
});