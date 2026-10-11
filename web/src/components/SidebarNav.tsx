"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wand2,
  Blocks,
  Mic,
  Radio,
  Trophy,
  Gift,
  Newspaper,
  Shield,
  ScrollText,
  Palette,
  Archive,
  Gavel,
  Ticket,
  FileText,
  LifeBuoy,
  Sparkles,
  ChevronDown,
  Home,
  Users,
  Settings2,
  ShieldCheck,
  BookOpen,
  Server,
  Clapperboard,
  Terminal,
  Cake,
  BarChart3,
  AlarmClock,
  Zap,
  HandHeart,
  MonitorPlay,
  Calendar,
  Coins,
  LayoutTemplate,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  color: string;
  /** nur für den Bot-Besitzer sichtbar */
  ownerOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

/** Menü-Struktur: Bereiche mit Unterpunkten */
const GROUPS: NavGroup[] = [
  {
    id: "start",
    label: "Start",
    icon: Home,
    items: [
      { href: "/", label: "Übersicht", icon: LayoutDashboard, color: "text-discord-blurple" },
      { href: "/setup", label: "Server einrichten", icon: Wand2, color: "text-indigo-300" },
      { href: "/templates", label: "Server-Templates", icon: LayoutTemplate, color: "text-purple-300" },
      { href: "/modules", label: "Module", icon: Blocks, color: "text-indigo-300" },
      { href: "/servers", label: "Server-Freigabe", icon: Server, color: "text-amber-300", ownerOnly: true },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    items: [
      { href: "/voice", label: "Voice-Manager", icon: Mic, color: "text-discord-green" },
      { href: "/live", label: "Live-Streamer", icon: Radio, color: "text-red-500" },
      { href: "/stats", label: "Level & Rangliste", icon: Trophy, color: "text-amber-400" },
      { href: "/economy", label: "Wirtschaft & Shop", icon: Coins, color: "text-yellow-400" },
      { href: "/free-games", label: "Free-Games", icon: Gift, color: "text-discord-green" },
      { href: "/releases", label: "Release-Kalender", icon: Calendar, color: "text-purple-400" },
      { href: "/news", label: "Game-News", icon: Newspaper, color: "text-orange-400" },
      { href: "/game-servers", label: "Game-Server", icon: MonitorPlay, color: "text-emerald-400" },
      { href: "/birthdays", label: "Geburtstage", icon: Cake, color: "text-pink-400" },
      { href: "/welcome", label: "Willkommens-Karte", icon: HandHeart, color: "text-pink-300" },
      { href: "/clips", label: "Clip der Woche", icon: Clapperboard, color: "text-orange-300" },
    ],
  },
  {
    id: "server",
    label: "Server",
    icon: Settings2,
    items: [
      { href: "/roles", label: "Rollen & Rechte", icon: Shield, color: "text-discord-yellow" },
      { href: "/rules", label: "Regeln", icon: ScrollText, color: "text-amber-300" },
      { href: "/embeds", label: "Embed-Builder", icon: Palette, color: "text-fuchsia-400" },
      { href: "/announcements", label: "Ankündigungen", icon: AlarmClock, color: "text-amber-400" },
      { href: "/custom-commands", label: "Eigene Befehle", icon: Zap, color: "text-yellow-300" },
      { href: "/server-stats", label: "Statistik-Kanäle", icon: BarChart3, color: "text-cyan-400" },
      { href: "/backups", label: "Backups", icon: Archive, color: "text-emerald-400" },
    ],
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: ShieldCheck,
    items: [
      { href: "/moderation", label: "Benutzerverwaltung", icon: Gavel, color: "text-rose-400" },
      { href: "/tickets", label: "Support-Tickets", icon: Ticket, color: "text-indigo-400" },
      { href: "/console", label: "Web-Konsole", icon: Terminal, color: "text-lime-300" },
      { href: "/logs", label: "Audit-Logs", icon: FileText, color: "text-cyan-400" },
    ],
  },
  {
    id: "help",
    label: "Hilfe",
    icon: BookOpen,
    items: [
      { href: "/hilfe", label: "Hilfe & Befehle", icon: LifeBuoy, color: "text-sky-400" },
      { href: "/changelog", label: "Changelog", icon: Sparkles, color: "text-amber-400" },
    ],
  },
];

const STORAGE_KEY = "glg_nav_closed";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function SidebarNav() {
  const pathname = usePathname() || "/";
  // Zugeklappte Bereiche merken (pro Browser)
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Server-Freigabe nur dem Bot-Besitzer anzeigen
    fetch("/api/bot/guild-access")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIsOwner(!!j?.isOwner))
      .catch(() => null);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setClosed(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  function toggle(id: string) {
    setClosed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  return (
    <nav className="overflow-y-auto flex-1 min-h-0 pr-1 pb-2 space-y-2.5">
      {GROUPS.map((group) => {
        const hasActive = group.items.some((i) => isActive(pathname, i.href));
        // Der Bereich mit der aktuellen Seite ist immer offen
        const open = hasActive || !closed.has(group.id);
        const GroupIcon = group.icon;
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={open}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                hasActive ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <GroupIcon className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>

            {open && (
              <div className="mt-1 grid gap-1">
                {group.items.filter((item) => !item.ownerOnly || isOwner || isActive(pathname, item.href)).map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                        active
                          ? "bg-discord-blurple/15 border-discord-blurple/60 text-white shadow-md shadow-discord-blurple/10"
                          : "bg-discord-card/60 border-discord-border text-gray-300 hover:text-white hover:border-gray-500 hover:bg-discord-card"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          active ? "bg-discord-blurple/25" : "bg-discord-dark"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
