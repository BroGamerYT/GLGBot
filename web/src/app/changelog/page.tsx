import Link from "next/link";
import {
  Sparkles,
  Ticket,
  Trophy,
  Globe,
  LifeBuoy,
  Shield,
  Archive,
  Gift,
  Newspaper,
  Mic,
  Radio,
  Clock,
  CheckCircle2,
  Tag,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Changelog & Updates | GLGBot",
  description: "Entwicklungs-Historie, neue Features und Versions-Updates des GLGBots für GermanyLanGame.",
};

interface Release {
  version: string;
  date: string;
  badge: "Aktuell" | "Feature-Update" | "Major Release";
  badgeColor: string;
  title: string;
  description: string;
  highlights: {
    icon: any;
    title: string;
    description: string;
  }[];
}

const RELEASES: Release[] = [
  {
    version: "v2.2.0",
    date: "Oktober 2026",
    badge: "Aktuell",
    badgeColor: "bg-discord-green/10 text-discord-green border-discord-green/30",
    title: "Echtzeit-Tickets, Balancierte Level & Öffentliche Seiten",
    description:
      "Umfangreiches Update für Community-Interaktion und nahtlose Verwaltung: Live-Chat im Ticket-Webinterface, neu ausbalanciertes Leveling und öffentlicher Zugriff ohne Login.",
    highlights: [
      {
        icon: Ticket,
        title: "Echtzeit-Chat im Ticket-Webinterface",
        description:
          "Live-Synchronisation alle 2 Sekunden zwischen Discord und dem Web-Dashboard. Admins sehen Nachrichten, Bot-Embeds und Anhänge sofort und können direkt aus dem Browser im Ticket-Kanal antworten.",
      },
      {
        icon: Trophy,
        title: "Schwierigeres & Steileres Level-System",
        description:
          "Die XP-Formel wurde anspruchsvoller gestaltet (400 * Level^1.55 + 100). Chat-Nachrichten geben 10–20 XP (mit 60s Cooldown) und aktive Sprachzeit 5 XP/Min. So bleibt das Leveln langfristig herausfordernd.",
      },
      {
        icon: Globe,
        title: "Öffentlicher Community-Zugriff ohne Login",
        description:
          "Seiten wie Hilfe (/hilfe), Changelog (/changelog) und Ranglisten (/stats) können nun von allen Discord-Mitgliedern direkt und ohne Admin-Login im Browser aufgerufen werden.",
      },
      {
        icon: LifeBuoy,
        title: "Erweiterter /help Slash-Befehl & Support-Setup",
        description:
          "Der /help Befehl verlinkt direkt auf das Webinterface und das Support-System. Automatisches Setup des Support-Kanals (#🎫・support) im Dashboard.",
      },
    ],
  },
  {
    version: "v2.1.0",
    date: "Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Talk-Partner Tracking & Support-Ticket System",
    description:
      "Einführung von präzisen Sprachzeit-Analysen und einem vollständig integrierten Ticket-Tool für privaten Community-Support.",
    highlights: [
      {
        icon: Clock,
        title: "Talk-Partner Tracking & Top-Duos",
        description:
          "Minütliche Erfassung, wer mit wem wie lange in Sprachkanälen gesprochen hat. Serverweite Top 10 Ranglisten für die aktivsten Gesprächspaare und individuelle Nutzer-Profile.",
      },
      {
        icon: Ticket,
        title: "Vollständiges Support-Ticket System",
        description:
          "Interaktives Ticket-Erstellungs-Panel im Discord-Kanal mit Buttons für Allgemeine Hilfe, Bug-Reports und Feedback. Private Ticket-Kanäle mit Schließen-, Claim- und Transkript-Funktion.",
      },
      {
        icon: Trophy,
        title: "Ranglisten & Level-Karten (/rank & /leaderboard)",
        description:
          "Slash-Befehle für persönliche Rang-Karten mit dynamischen ASCII-Fortschrittsbalken und serverweiten Toplisten für Gesamt-XP, Nachrichten und Voice-Minuten.",
      },
    ],
  },
  {
    version: "v2.0.0",
    date: "Oktober 2026",
    badge: "Major Release",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    title: "Silent Audit-Logs, Server-Backups & Moderation",
    description:
      "Großes Administrations- und Sicherheits-Update mit stiller Audit-Protokollierung und One-Click Server-Backups.",
    highlights: [
      {
        icon: Shield,
        title: "Silent Audit-Logging (Stille Benachrichtigungen)",
        description:
          "Protokollierung aller Kanal-, Rollen-, Berechtigungs- und Servereinstellungs-Änderungen in #🛡️・audit-logs mit Flag SuppressNotifications (stille Nachrichten ohne nervige Pings) und Erkennung des ausführenden Admins.",
      },
      {
        icon: Archive,
        title: "Server-Backups & Snapshots",
        description:
          "Sicherung der gesamten Server-Konfiguration (Rollen, Berechtigungen, Kanäle, Kategorien) als JSON mit Download und 1-Klick-Wiederherstellung im Dashboard.",
      },
      {
        icon: Shield,
        title: "Moderations-Suite (/warn, /timeout, /kick, /ban)",
        description:
          "Vollständiges Fall-Management (/cases) mit Begründungen, automatischer Benachrichtigung der Betroffenen per DM und Audit-Log-Einträgen.",
      },
    ],
  },
  {
    version: "v1.5.0",
    date: "September 2026",
    badge: "Feature-Update",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    title: "Game-News, Treiber-Alerts & Free-Games Ausbau",
    description:
      "Automatisierte Benachrichtigungen für Gratis-Spiele und Hardware-/Spiel-Updates.",
    highlights: [
      {
        icon: Gift,
        title: "Free-Games System mit Deep-Links",
        description:
          "30-minütiger Scan nach 100% kostenlosen Vollversionen auf Epic Games, Steam und GOG. Launcher-Buttons für direkte Installationen und Store-Vorschau.",
      },
      {
        icon: Newspaper,
        title: "Game-News & Hardware-Treiber Feeds",
        description:
          "Automatische Patchnotes für Steam-Titel, Minecraft Updates sowie neue Grafikkarten- (NVIDIA, AMD, Intel) und AMD-Chipsatz-Treiber in getrennten Kanälen.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "September 2026",
    badge: "Major Release",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    title: "Basis-Release: VoiceMaster & Live-Streamer",
    description:
      "Die Geburtsstunde des GLGBots auf dem Proxmox CT 109 Container.",
    highlights: [
      {
        icon: Mic,
        title: "VoiceMaster (Join-to-Create)",
        description:
          "Automatische temporäre Sprachkanäle mit eigenem Chat-Panel für Kanalumbenennung, Sperren, Verstecken und Mitgliederlimit.",
      },
      {
        icon: Radio,
        title: "Live-Streamer System",
        description:
          "Erkennung von Live-Streams auf Twitch & YouTube mit automatischer Vergabe der temporären Live-Rolle und eigenem temporären Live-Kanal.",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-discord-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Changelog & Updates</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Alle Versions-Veröffentlichungen, neue Features und Verbesserungen des GLGBots
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hilfe"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-sm text-gray-300 hover:text-white transition-all"
          >
            <LifeBuoy className="w-4 h-4 text-sky-400" />
            <span>Hilfe & Befehle</span>
          </Link>
          <Link
            href="/stats"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-sm text-gray-300 hover:text-white transition-all"
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Ranglisten</span>
          </Link>
        </div>
      </div>

      {/* Release List */}
      <div className="space-y-8">
        {RELEASES.map((rel, idx) => (
          <div
            key={rel.version}
            className="relative bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-lg shadow-black/20"
          >
            {/* Release Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-discord-border/60">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white tracking-tight">{rel.version}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${rel.badgeColor}`}>
                  {rel.badge}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{rel.date}</span>
              </div>
            </div>

            {/* Release Title & Description */}
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white mb-1.5">{rel.title}</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{rel.description}</p>
            </div>

            {/* Highlights Grid */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              {rel.highlights.map((item, hIdx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={hIdx}
                    className="p-4 rounded-xl bg-discord-dark/60 border border-discord-border/70 flex gap-3.5 items-start hover:border-discord-blurple/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-discord-card border border-discord-border flex items-center justify-center shrink-0 text-discord-blurple mt-0.5">
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
