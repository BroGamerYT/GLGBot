import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { LogOut, Gift, LifeBuoy, Newspaper, Trophy, Sparkles, LogIn } from "lucide-react";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import SidebarNav from "@/components/SidebarNav";
import GuildSwitcher from "@/components/GuildSwitcher";
import { BRANDING, BOT_INITIALS, DASHBOARD_HOST } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${BRANDING.bot} Web-Dashboard | ${BRANDING.community}`,
  description: "Zentrales Web-Dashboard für VoiceMaster, Live-Streamer und Server-Management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);

  // Nicht eingeloggt (Öffentliche Seiten / Login): mit schicker Gast-Navigation
  if (!session) {
    return (
      <html lang="de" className="dark">
        <body className="min-h-screen bg-discord-darker text-gray-200 flex flex-col">
          <header className="border-b border-discord-border bg-discord-dark/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-discord-blurple to-indigo-400 flex items-center justify-center font-bold text-white shadow-md shadow-discord-blurple/20">
                {BOT_INITIALS}
              </div>
              <div>
                <h1 className="font-bold text-white text-sm leading-tight">{BRANDING.bot} Panel</h1>
                <p className="text-[11px] text-gray-400">{BRANDING.community}</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <Link
                href="/free-games"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Gift className="w-4 h-4 text-discord-green" />
                <span>Gratis-Spiele</span>
              </Link>
              <Link
                href="/news"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Newspaper className="w-4 h-4 text-emerald-400" />
                <span>Game-News</span>
              </Link>
              <Link
                href="/hilfe"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <LifeBuoy className="w-4 h-4 text-sky-400" />
                <span>Hilfe & Befehle</span>
              </Link>
              <Link
                href="/changelog"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Changelog</span>
              </Link>
              <Link
                href="/stats"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Rangliste</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-discord-blurple hover:bg-indigo-600 text-white font-medium transition-all shadow-md shadow-discord-blurple/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </Link>
            </nav>
          </header>

          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </body>
      </html>
    );
  }

  const avatarUrl = session.avatar
    ? `https://cdn.discordapp.com/avatars/${session.uid}/${session.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(session.uid) >> BigInt(22)) % 6}.png`;

  return (
    <html lang="de" className="dark">
      <body className="min-h-screen md:h-screen md:overflow-hidden bg-discord-darker flex flex-col md:flex-row text-gray-200">
        {/* Sidebar */}
        <aside className="w-full md:w-64 md:h-screen bg-discord-dark border-r border-discord-border p-4 flex flex-col justify-between shrink-0 md:sticky md:top-0">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Header / Logo */}
            <div className="flex items-center gap-3 px-2 py-3 mb-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-discord-blurple to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-discord-blurple/20">
                {BOT_INITIALS}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white leading-tight">{BRANDING.bot} Panel</h1>
                <GuildSwitcher fallbackName={BRANDING.community} />
              </div>
            </div>

            {/* Navigation */}
            <SidebarNav />
          </div>

          {/* Footer Info */}
          <div className="pt-3 border-t border-discord-border space-y-2 shrink-0">
            <div className="flex items-center gap-2 px-2 py-2 bg-discord-card rounded-lg">
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              <span className="flex-1 text-sm text-white truncate">{session.name}</span>
              <form action="/api/auth/logout" method="post">
                <button type="submit" title="Abmelden" className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-discord-dark transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 px-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-discord-green animate-pulse"></span>
                Online
              </span>
              <span className="text-gray-500">{BRANDING.bot}</span>
            </div>
            {DASHBOARD_HOST && (
              <div className="px-2 py-1.5 bg-discord-card rounded-md text-[11px] text-gray-400 flex items-center justify-between gap-2">
                <span>Domain:</span>
                <span className="text-discord-blurple font-mono truncate">{DASHBOARD_HOST}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 md:overflow-y-auto md:h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
