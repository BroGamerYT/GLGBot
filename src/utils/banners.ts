import fs from "fs";
import path from "path";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";

/**
 * Animierte GIF-Banner für die Bot-Kanäle (liegen in assets/banners/).
 * Discord kann keinen animierten Text - ein animiertes Bild aber schon.
 * Eigene Banner (z. B. mit deinem Servernamen, siehe scripts/make_banners.py) kannst du
 * unter config/banners/<name>.gif ablegen - sie haben Vorrang vor den mitgelieferten.
 */
export type BannerName = "rules" | "permissions" | "free-games" | "game-news" | "driver-news";

const COLORS: Record<BannerName, number> = {
  rules: 0xfec440,
  permissions: 0x5865f2,
  "free-games": 0x57f287,
  "game-news": 0xff8c28,
  "driver-news": 0x00b4d8,
};

export function getBanner(name: BannerName) {
  const custom = path.join(process.cwd(), "config", "banners", `${name}.gif`);
  const file = fs.existsSync(custom) ? custom : path.join(process.cwd(), "assets", "banners", `${name}.gif`);
  if (!fs.existsSync(file)) return null;
  return {
    file: new AttachmentBuilder(file, { name: `${name}.gif` }),
    embed: new EmbedBuilder().setColor(COLORS[name]).setImage(`attachment://${name}.gif`),
    color: COLORS[name],
  };
}
