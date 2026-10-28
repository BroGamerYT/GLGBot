import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const OWNER_FILE = path.join(process.cwd(), "data", "bot_owner.json");

interface BotOwnerData {
  owners: { id: string; name?: string; addedAt: number; addedBy?: string }[];
}

function readOwners(): BotOwnerData {
  try {
    if (fs.existsSync(OWNER_FILE)) {
      return JSON.parse(fs.readFileSync(OWNER_FILE, "utf-8"));
    }
  } catch {}
  return { owners: [] };
}

function saveOwners(data: BotOwnerData) {
  fs.mkdirSync(path.dirname(OWNER_FILE), { recursive: true });
  fs.writeFileSync(OWNER_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const args = process.argv.slice(2);
const targetId = args[0]?.trim();

if (!targetId) {
  const current = readOwners();
  console.log("=== GLGBot Bot-Besitzer Übersicht ===");
  console.log("BOT_OWNER_ID in .env:", process.env.BOT_OWNER_ID || "(nicht gesetzt)");
  console.log("Gespeicherte Owner in data/bot_owner.json:");
  if (current.owners.length === 0) {
    console.log("  (keine)");
  } else {
    for (const o of current.owners) {
      console.log(`  - ${o.name || "User"} (${o.id})`);
    }
  }
  console.log("\nVerwendung: npm run set-owner <Discord-User-ID> [Name]");
  console.log("Beispiel: npm run set-owner 123456789012345678 BroGamerYT");
  process.exit(0);
}

if (!/^\d{15,25}$/.test(targetId)) {
  console.error("❌ Ungültige Discord-User-ID. Bitte nur Ziffern (17-20 Zeichen) angeben.");
  process.exit(1);
}

const customName = args[1]?.trim() || "Console Admin";
const data = readOwners();
if (data.owners.some((o) => o.id === targetId)) {
  console.log(`ℹ️ User ${targetId} ist bereits als Bot-Besitzer eingetragen.`);
} else {
  data.owners.push({ id: targetId, name: customName, addedAt: Date.now(), addedBy: "CLI" });
  saveOwners(data);
  console.log(`✅ User ${customName} (${targetId}) erfolgreich als Bot-Besitzer in data/bot_owner.json gespeichert!`);
}
