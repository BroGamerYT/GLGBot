/**
 * Name & Adresse der Community für das Dashboard.
 * Kommt aus der .env im Bot-Hauptordner (COMMUNITY_NAME, BOT_NAME, DASHBOARD_URL)
 * und wird beim Build über next.config.js eingebunden.
 */
export const BRANDING = {
  community: process.env.NEXT_PUBLIC_COMMUNITY_NAME || "Discord-Community",
  bot: process.env.NEXT_PUBLIC_BOT_NAME || "GLGBot",
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || "",
};

/** Kurzes Logo-Kürzel aus dem Bot-Namen, z. B. "GLGBot" -> "GLG". */
export const BOT_INITIALS = (BRANDING.bot.replace(/bot$/i, "") || BRANDING.bot).slice(0, 3).toUpperCase();

/** Host des Dashboards ohne https:// (z. B. "bot.example.com") oder "". */
export const DASHBOARD_HOST = BRANDING.dashboardUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
