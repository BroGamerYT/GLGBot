import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Mic, Radio, LayoutDashboard, Shield, ExternalLink, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "GLGBot Web-Dashboard | GermanyLanGame",
  description: "Zentrales Web-Dashboard für VoiceMaster, Live-Streamer und Server-Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-discord-darker flex flex-col md:flex-row text-gray-200">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-discord-dark border-r border-discord-border p-4 flex flex-col justify-between shrink-0">
          <div>
            {/* Header / Logo */}
            <div className="flex items-center gap-3 px-2 py-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-discord-blurple to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-discord-blurple/20">
                GLG
              </div>
              <div>
                <h1 className="font-bold text-white leading-tight">GLGBot Panel</h1>
                <p className="text-xs text-gray-400">GermanyLanGame</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
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
            </nav>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-discord-border space-y-2">
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
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
