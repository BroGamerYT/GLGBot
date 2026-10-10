import dotenv from "dotenv";

dotenv.config({ quiet: true } as any);

/**
 * Name & Links deiner Community - alles über die .env einstellbar:
 *   COMMUNITY_NAME  Name des Servers/der Community (Standard: "Discord-Community")
 *   BOT_NAME        Anzeigename des Bots in Footern (Standard: "GLGBot")
 *   DASHBOARD_URL   Öffentliche Adresse des Web-Dashboards (optional)
 */
export const BRANDING = {
  community: (process.env.COMMUNITY_NAME || "").trim() || "Discord-Community",
  bot: (process.env.BOT_NAME || "").trim() || "GLGBot",
  dashboardUrl: (process.env.DASHBOARD_URL || "").trim().replace(/\/+$/, ""),
};

/** Baut einen Link ins Dashboard - oder null, wenn keine DASHBOARD_URL gesetzt ist. */
export function dashboardLink(pathname = ""): string | null {
  if (!BRANDING.dashboardUrl || !/^https?:\/\//i.test(BRANDING.dashboardUrl)) return null;
  return BRANDING.dashboardUrl + pathname;
}
