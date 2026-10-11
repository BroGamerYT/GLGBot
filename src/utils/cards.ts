import fs from "fs";
import path from "path";
import { createCanvas, GlobalFonts, loadImage, SKRSContext2D, Image } from "@napi-rs/canvas";

/**
 * Grafische Karten (Rangkarte & Willkommens-Karte) als PNG.
 * Schriften liegen im Projekt (assets/fonts, SIL Open Font License) - der Server braucht keine System-Schriften.
 */
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  // src/utils bzw. dist/utils -> Projektordner/assets/fonts
  const candidates = [path.join(__dirname, "..", "..", "assets", "fonts"), path.join(process.cwd(), "assets", "fonts")];
  const dir = candidates.find((d) => fs.existsSync(path.join(d, "Inter_400Regular.ttf"))) || candidates[0];
  GlobalFonts.registerFromPath(path.join(dir, "Inter_400Regular.ttf"), "Inter");
  GlobalFonts.registerFromPath(path.join(dir, "Inter_600SemiBold.ttf"), "Inter SemiBold");
  GlobalFonts.registerFromPath(path.join(dir, "Inter_800ExtraBold.ttf"), "Inter ExtraBold");
  GlobalFonts.registerFromPath(path.join(dir, "Orbitron_800ExtraBold.ttf"), "Orbitron");
  fontsReady = true;
}

/** Bild laden (Discord-CDN), mit Zeitlimit. null bei Fehler. */
async function fetchImage(url?: string | null): Promise<Image | null> {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAvatar(ctx: SKRSContext2D, img: Image | null, cx: number, cy: number, r: number, ring: string, fallbackText: string) {
  // Ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#2b2f3a";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(r * 0.9)}px "Inter ExtraBold"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackText.slice(0, 1).toUpperCase(), cx, cy + 2);
  }
  ctx.restore();
}

/** Text auf maximale Breite kürzen (…) */
function fit(ctx: SKRSContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function background(ctx: SKRSContext2D, w: number, h: number, accent: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#14161f");
  g.addColorStop(1, "#0d0f15");
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, w, h, 28);
  ctx.fill();
  // weicher Farbschimmer
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 10, w * 0.85, h * 0.1, w * 0.6);
  glow.addColorStop(0, accent + "55");
  glow.addColorStop(1, accent + "00");
  ctx.fillStyle = glow;
  roundRect(ctx, 0, 0, w, h, 28);
  ctx.fill();
  // feines Raster
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

export interface RankCardData {
  avatarUrl?: string | null;
  displayName: string;
  username: string;
  level: number;
  maxLevel: number;
  isMaxLevel: boolean;
  rank: number;
  totalXp: number;
  currentXp: number;
  requiredXp: number;
  percent: number;
  messages: number;
  voice: string;
  streak: number;
  accent?: string;
  badges?: string[];
}

export async function renderRankCard(d: RankCardData): Promise<Buffer> {
  ensureFonts();
  const W = 1000;
  const H = 320;
  const accent = d.accent || (d.isMaxLevel ? "#ffac33" : "#5865f2");
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  background(ctx, W, H, accent);

  const avatar = await fetchImage(d.avatarUrl);
  drawAvatar(ctx, avatar, 150, 160, 92, accent, d.displayName);

  const left = 285;
  // Name
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = '38px "Inter ExtraBold"';
  ctx.fillText(fit(ctx, d.displayName, 380), left, 88);
  ctx.fillStyle = "#8b90a0";
  ctx.font = '18px "Inter"';
  ctx.fillText(fit(ctx, `@${d.username}`, 240), left, 116);

  // Badges & Meilensteine (Pills)
  if (d.badges && d.badges.length > 0) {
    let bx = left;
    const by = 127;
    ctx.font = '12px "Inter SemiBold"';
    for (const badge of d.badges.slice(0, 4)) {
      const textWidth = ctx.measureText(badge).width;
      const pw = textWidth + 14;
      const ph = 22;
      // Pill-Hintergrund
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      roundRect(ctx, bx, by, pw, ph, 11);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Pill-Text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e0e3ed";
      ctx.fillText(badge, bx + pw / 2, by + ph / 2 + 1);
      bx += pw + 8;
    }
  }

  // Rang & Level rechts oben
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8b90a0";
  ctx.font = '18px "Inter SemiBold"';
  ctx.fillText("RANG", 820, 60);
  ctx.fillText("LEVEL", 950, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = '44px "Orbitron"';
  ctx.fillText(`#${d.rank}`, 820, 108);
  ctx.fillStyle = accent;
  ctx.fillText(String(d.level), 950, 108);

  // Fortschrittsbalken
  const barX = left;
  const barY = 168;
  const barW = W - left - 50;
  const barH = 28;
  ctx.fillStyle = "#232734";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  const pct = d.isMaxLevel ? 100 : Math.max(0, Math.min(100, d.percent));
  if (pct > 0) {
    const fillW = Math.max(barH, (barW * pct) / 100);
    const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, "#9aa5ff");
    ctx.fillStyle = grad;
    roundRect(ctx, barX, barY, fillW, barH, barH / 2);
    ctx.fill();
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#c9cdd8";
  ctx.font = '17px "Inter SemiBold"';
  ctx.fillText(
    d.isMaxLevel ? "MAX LEVEL erreicht" : `${d.currentXp.toLocaleString("de-DE")} / ${d.requiredXp.toLocaleString("de-DE")} XP bis Level ${d.level + 1}`,
    barX,
    barY + barH + 28
  );
  ctx.textAlign = "right";
  ctx.fillText(`${pct}%`, barX + barW, barY + barH + 28);

  // Kennzahlen unten
  const stats: [string, string][] = [
    ["Gesamt-XP", d.totalXp.toLocaleString("de-DE")],
    ["Nachrichten", d.messages.toLocaleString("de-DE")],
    ["Voice", d.voice],
    ["Daily-Serie", d.streak === 1 ? "1 Tag" : `${d.streak} Tage`],
  ];
  const colW = barW / stats.length;
  stats.forEach(([label, value], i) => {
    const x = barX + i * colW;
    ctx.textAlign = "left";
    ctx.fillStyle = "#6e7385";
    ctx.font = '14px "Inter SemiBold"';
    ctx.fillText(label.toUpperCase(), x, 270);
    ctx.fillStyle = "#ffffff";
    ctx.font = '20px "Inter ExtraBold"';
    ctx.fillText(fit(ctx, value, colW - 10), x, 296);
  });

  return canvas.toBuffer("image/png");
}

export interface WelcomeCardData {
  avatarUrl?: string | null;
  displayName: string;
  guildName: string;
  memberCount: number;
  title: string;
  subtitle?: string;
  accent?: string;
  backgroundImageUrl?: string | null;
}

export async function renderWelcomeCard(d: WelcomeCardData): Promise<Buffer> {
  ensureFonts();
  const W = 1100;
  const H = 400;
  const accent = d.accent || "#5865f2";
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bgImg = await fetchImage(d.backgroundImageUrl);
  if (bgImg) {
    ctx.save();
    roundRect(ctx, 0, 0, W, H, 28);
    ctx.clip();
    ctx.drawImage(bgImg, 0, 0, W, H);
    // Dunkler Glassmorphismus-Filter für optimale Lesbarkeit
    ctx.fillStyle = "rgba(13, 15, 21, 0.78)";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
    glow.addColorStop(0, accent + "33");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else {
    background(ctx, W, H, accent);
  }

  const avatar = await fetchImage(d.avatarUrl);
  drawAvatar(ctx, avatar, W / 2, 130, 78, accent, d.displayName);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = '46px "Orbitron"';
  ctx.fillText(fit(ctx, d.title.toUpperCase(), W - 120), W / 2, 270);

  ctx.fillStyle = accent;
  ctx.font = '30px "Inter ExtraBold"';
  ctx.fillText(fit(ctx, d.displayName, W - 160), W / 2, 315);

  ctx.fillStyle = "#9aa0b2";
  ctx.font = '22px "Inter SemiBold"';
  ctx.fillText(fit(ctx, d.subtitle || `Du bist Mitglied #${d.memberCount.toLocaleString("de-DE")} auf ${d.guildName}`, W - 160), W / 2, 356);

  // Akzentleiste
  ctx.fillStyle = accent;
  roundRect(ctx, W / 2 - 60, 380, 120, 5, 2.5);
  ctx.fill();

  return canvas.toBuffer("image/png");
}
