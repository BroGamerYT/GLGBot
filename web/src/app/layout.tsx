import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { Mic, Radio, LayoutDashboard, Shield, LogOut, Gift, ScrollText, LifeBuoy, FileText, Archive, Newspaper, Palette, Ticket, Trophy, Sparkles, LogIn, Gavel } from "lucide-react";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GLGBot Web-Dashboard | GermanyLanGame",
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
                GLG
              </div>
              <div>
                <h1 className="font-bold text-white text-sm leading-tight">GLGBot Panel</h1>
                <p className="text-[11px] text-gray-400">GermanyLanGame</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
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
                GLG
              </div>
              <div>
                <h1 className="font-bold text-white leading-tight">GLGBot Panel</h1>
                <p className="text-xs text-gray-400">GermanyLanGame</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1 pb-2">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-discord-blurple" />
                Übersicht
              </Link>
              <Link
                href="/voice"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Mic className="w-4 h-4 text-discord-green" />
                Voice-Manager
              </Link>
              <Link
                href="/live"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Radio className="w-4 h-4 text-red-500" />
                Live-Streamer
              </Link>
              <Link
                href="/roles"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Shield className="w-4 h-4 text-discord-yellow" />
                Rollen & Rechte
              </Link>
              <Link
                href="/rules"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <ScrollText className="w-4 h-4 text-amber-300" />
                Regeln
              </Link>
              <Link
                href="/free-games"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Gift className="w-4 h-4 text-discord-green" />
                Free-Games
              </Link>
              <Link
                href="/news"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Newspaper className="w-4 h-4 text-orange-400" />
                Game-News
              </Link>
              <Link
                href="/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                Audit-Logs
              </Link>
              <Link
                href="/backups"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                Backups
              </Link>
              <Link
                href="/embeds"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Palette className="w-4 h-4 text-fuchsia-400" />
                Embed-Builder
              </Link>
              <Link
                href="/moderation"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Gavel className="w-4 h-4 text-rose-400" />
                Benutzerverwaltung
              </Link>
              <Link
                href="/tickets"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Ticket className="w-4 h-4 text-indigo-400" />
                Support-Tickets
              </Link>
              <Link
                href="/stats"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Level & Rangliste
              </Link>
              <div className="my-2 border-t border-discord-border" />
              <Link
                href="/hilfe"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <LifeBuoy className="w-4 h-4 text-sky-400" />
                Hilfe & Befehle
              </Link>
              <Link
                href="/changelog"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-discord-card transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Changelog
              </Link>
            </nav>
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
                24/7 Proxmox
              </span>
              <span className="text-gray-500">CT 109</span>
            </div>
            <div className="px-2 py-1.5 bg-discord-card rounded-md text-[11px] text-gray-400 flex items-center justify-between">
              <span>Domain:</span>
              <span className="text-discord-blurple font-mono">glgbot.brogameryt.de</span>
            </div>
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
