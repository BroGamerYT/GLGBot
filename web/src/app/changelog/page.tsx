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
  UserCheck,
  AlertTriangle,
  FolderTree,
  Lock,
  Blocks,
  PanelLeft,
  CalendarCheck,
  PartyPopper,
} from "lucide-react";

export const metadata = {
  title: "Changelog & Updates | GLGBot",
  description: "Entwicklungs-Historie, neue Features und Versions-Updates des GLGBots.",
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
    version: "v2.13.0",
    date: "11. Oktober 2026",
    badge: "Aktuell",
    badgeColor: "bg-discord-green/10 text-discord-green border-discord-green/30",
    title: "Game-Server-Status",
    description: "Minecraft-, CS2-/Source- und TeamSpeak-Server live im Blick - im Dashboard, mit /serverstatus und als Statistik-Kanal.",
    highlights: [
      {
        icon: Radio,
        title: "Live-Status",
        description: "Online/offline, Spieler, Map und Version - alle 2 Minuten aktualisiert, Adresse mit einem Klick kopieren.",
      },
      {
        icon: Tag,
        title: "Zähler-Kanal",
        description: "Neuer Statistik-Kanal „🎮・Game-Server: 2/3“ zeigt, wie viele eurer Server gerade laufen.",
      },
    ],
  },
  {
    version: "v2.12.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Grafische Rang- & Willkommens-Karten",
    description: "/rank zeigt jetzt eine echte Rangkarte als Bild, und neue Mitglieder werden mit einer eigenen Willkommens-Karte begrüßt.",
    highlights: [
      {
        icon: Trophy,
        title: "Rangkarte als Bild",
        description: "Profilbild, Rang, Level, Fortschrittsbalken, Nachrichten, Voice-Zeit und Daily-Serie auf einen Blick.",
      },
      {
        icon: UserCheck,
        title: "Willkommens-Karte",
        description:
          "Grafische Begrüßung im Kanal deiner Wahl - Texte und Farbe frei wählbar, mit Vorschau. Optional automatische Rolle (nur ohne Regel-Sperre).",
      },
    ],
  },
  {
    version: "v2.11.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Mitspieler-Suche & eigene Befehle",
    description: "Mit /lfg findet ihr Mitspieler samt eigener Lobby, und im Dashboard lassen sich eigene /befehle anlegen.",
    highlights: [
      {
        icon: UserCheck,
        title: "👥 /lfg Mitspieler-Suche",
        description:
          "Gruppe erstellen, andere treten per Button bei. Ist sie voll, gibt es einen Ping, eine eigene Lobby und alle im Voice werden verschoben.",
      },
      {
        icon: Sparkles,
        title: "⚡ Eigene Befehle",
        description:
          "Eigene /befehle wie /ts oder /lan mit Text- oder Embed-Antwort - sofort im Discord verfügbar, optional auch als !befehl.",
      },
    ],
  },
  {
    version: "v2.10.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Geburtstage, geplante Ankündigungen & Statistik-Kanäle",
    description:
      "Drei neue Module: Der Bot gratuliert zum Geburtstag, sendet Ankündigungen pünktlich zum geplanten Zeitpunkt und zeigt Live-Zähler ganz oben in der Kanalliste.",
    highlights: [
      {
        icon: Sparkles,
        title: "🎂 Geburtstage",
        description:
          "/birthday set trägt Tag & Monat ein. Am Geburtstag gratuliert der Bot und vergibt für 24 Stunden die Geburtstags-Rolle.",
      },
      {
        icon: Clock,
        title: "⏰ Geplante Ankündigungen",
        description:
          "Text oder Embed vorschreiben, Zeitpunkt wählen - einmalig, täglich oder wöchentlich. Mit Rollen-Ping und lautlos-Option.",
      },
      {
        icon: Tag,
        title: "📊 Statistik-Kanäle",
        description:
          "Live-Zähler ganz oben: Mitglieder, Online, Im Voice, Gerade live und Boosts - Text frei wählbar, Aktualisierung alle 10 Minuten.",
      },
    ],
  },
  {
    version: "v2.9.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Level-Belohnungen, Daten-Sicherung & Fehlerbehebungen",
    description:
      "Rollen-Belohnungen lassen sich jetzt im Dashboard einstellen, alle Bot-Daten werden täglich gesichert und mehrere bekannte Probleme sind behoben.",
    highlights: [
      {
        icon: Trophy,
        title: "Rollen-Belohnungen im Dashboard",
        description:
          "Neuer Reiter in den Level-Einstellungen: Level wählen, Rolle zuordnen, fertig. Dazu zeigt das Profil die aktuelle Daily-Serie.",
      },
      {
        icon: Archive,
        title: "Tägliche Daten-Sicherung",
        description:
          "Level, Strafen, Einstellungen, Streamer und Regeln werden jeden Tag gesichert - die letzten 7 Tage bleiben erhalten.",
      },
      {
        icon: CheckCircle2,
        title: "Fehlerbehebungen",
        description:
          "Regel-Sperre bleibt nach einer Backup-Wiederherstellung aktiv, die Ping-Antwort reagiert nur noch auf !ping, und GitHub prüft jeden Push automatisch.",
      },
    ],
  },
  {
    version: "v2.8.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Mehrere Server (max. 5)",
    description:
      "Ein Bot für bis zu 5 freigegebene Server - mit Server-Wechsel im Dashboard, getrennten Daten pro Server und automatischem Verlassen nicht freigegebener Server.",
    highlights: [
      {
        icon: Globe,
        title: "Freigabe-Liste & Limit",
        description:
          "Nur freigegebene Server (max. 5). Bei fremden Einladungen schreibt der Bot dem Owner kurz warum und verlässt den Server sofort.",
      },
      {
        icon: UserCheck,
        title: "Server wechseln",
        description:
          "Oben links im Dashboard zwischen den Servern wechseln. Jeder sieht nur Server, auf denen er Owner, Admin oder „Server verwalten“ hat.",
      },
      {
        icon: FolderTree,
        title: "Alles pro Server getrennt",
        description:
          "Einstellungen, Level, Regeln, Fälle, Logs und Module gelten pro Server. Neue Server starten mit den Grundmodulen.",
      },
    ],
  },
  {
    version: "v2.7.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Streamer Control Panel, Passwortschutz & Modulares System",
    description:
      "Umfassendes Creator-Update: Volle Kanalrechte für Streamer, interaktives Streamer-Panel mit Passwortschutz & Gästeverifizierung, sowie modulare Feature-Schalter für alle Bot-Funktionen.",
    highlights: [
      {
        icon: Radio,
        title: "Streamer-Panel mit vollen Rechten",
        description:
          "Streamer erhalten automatisch volle Kanalrechte für ihren Live-Kanal und steuern alles direkt im Chat über /stream-panel (Benutzerlimit, Umbenennen mit Rate-Limit-Schutz, Sperren, Bitrate).",
      },
      {
        icon: Lock,
        title: "Passwortschutz für Kanäle & Gäste-Modal",
        description:
          "Kanäle können mit einem Passwort gesperrt werden. Gäste können über einen Klick-Button das Passwort per Modal eingeben und werden bei Erfolg sofort in den Kanal verschoben.",
      },
      {
        icon: Shield,
        title: "Modulares Feature-Toggle-System (/modules)",
        description:
          "Alle 15 Bot-Bereiche lassen sich einzeln über /modules oder das Dashboard aktivieren bzw. deaktivieren – dynamische Event-Gates schalten ungenutzte Funktionen sofort stumm.",
      },
      {
        icon: Blocks,
        title: "Dashboard-Seite „Module“",
        description:
          "Alle Module mit Schaltern auf einer Seite. Ausgeschaltete Module pausieren auch ihre Hintergrund-Aufgaben und Buttons – Daten und Einstellungen bleiben erhalten.",
      },
      {
        icon: CalendarCheck,
        title: "/daily mit Streak-Bonus",
        description:
          "Jeden Tag XP abholen: 50 XP plus 15 XP pro Streak-Tag (max. +150). Die Serie hält, solange man spätestens nach 36 Stunden wieder abholt.",
      },
      {
        icon: PartyPopper,
        title: "/giveaway & Level-Belohnungen",
        description:
          "Verlosungen mit Teilnahme-Button, automatischer Ziehung und Reroll. Dazu Level-Rollen-Belohnungen, die beim Level-Up automatisch vergeben werden (/level sync-roles für Nachzügler).",
      },
      {
        icon: PanelLeft,
        title: "Neues Dashboard-Menü",
        description:
          "Die Seitenleiste ist in Bereiche gegliedert (Start, Community, Server, Moderation, Hilfe) – mit Button-Optik, Hervorhebung der aktuellen Seite und auf-/zuklappbaren Bereichen.",
      },
      {
        icon: Gift,
        title: "Öffentliche Free Games & Game News",
        description:
          "Gratis-Spiele und Gaming-Nachrichten im Web-Dashboard sind jetzt ohne Login für die gesamte Community als Gast frei einsehbar.",
      },
    ],
  },
  {
    version: "v2.6.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Server einrichten per Knopfdruck",
    description:
      "Neue Dashboard-Seite „Server einrichten“ und der Befehl /setup-all: Bereiche ankreuzen, ein Klick legt alle fehlenden Rollen und Kanäle an.",
    highlights: [
      {
        icon: CheckCircle2,
        title: "Alles auf einmal",
        description:
          "Rollen & Benachrichtigungen, Regeln, Join-to-Create mit Steuerungs-Panel, Live-Kategorie mit #stream-alerts, Support-Tickets, Audit-Log, Gefängnis und optional die Regel-Sperre.",
      },
      {
        icon: FolderTree,
        title: "Nichts doppelt",
        description:
          "Vorhandene Rollen und Kanäle werden erkannt und nur verknüpft. Die Seite zeigt für jeden Bereich, ob er schon eingerichtet ist.",
      },
    ],
  },
  {
    version: "v2.5.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Open Source – für jeden Server nutzbar",
    description:
      "Der Bot ist jetzt öffentlich auf GitHub (MIT-Lizenz) und lässt sich auf jedem Discord-Server einsetzen. Alles Server-Spezifische wird über die .env bzw. den config-Ordner eingestellt.",
    highlights: [
      {
        icon: Globe,
        title: "Eigener Name & eigene Domain",
        description:
          "COMMUNITY_NAME, BOT_NAME und DASHBOARD_URL in der .env steuern Footer, Transkripte, Hilfe-Links und das Dashboard. Ohne Domain werden die Dashboard-Buttons einfach ausgeblendet.",
      },
      {
        icon: FolderTree,
        title: "Eigene Regeln & Banner",
        description:
          "Eigene Standard-Regeln in config/rules.json, eigene animierte Banner mit dem Servernamen per scripts/make_banners.py in config/banners/ – beides bleibt bei Updates erhalten.",
      },
      {
        icon: LifeBuoy,
        title: "Installationsanleitung",
        description:
          "Schritt-für-Schritt-Anleitung in der README: Discord-App anlegen, .env ausfüllen, bauen, mit PM2 betreiben und per Caddy veröffentlichen.",
      },
    ],
  },
  {
    version: "v2.4.0",
    date: "10. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Sicherheits-Update, /knast, /level status & Treiber-News",
    description:
      "Großes Sicherheits- und Komfort-Update: mehrere Lücken im Dashboard geschlossen, automatischer Logout bei Rechte-Entzug, überarbeitetes Gefängnis-System, neuer Level-Status und getrennte Kanäle für Spiel- und Treiber-News.",
    highlights: [
      {
        icon: Shield,
        title: "Sicherheit & automatischer Logout",
        description:
          "Moderationsfälle sind nicht mehr öffentlich sichtbar, Admin-Rollen kann nur noch ein Administrator vergeben, Moderatoren können niemanden über sich bestrafen. Wer seine Admin-Rechte verliert, wird im Dashboard sofort abgemeldet.",
      },
      {
        icon: Lock,
        title: "/knast statt /prison",
        description:
          "Das Gefängnis heißt in deutschem Discord jetzt /knast einsperren | freilassen | liste, sperrt wirklich alle Kanäle, wirft Inhaftierte aus dem Voice und lässt sich nicht mehr über die Rollen-Buttons umgehen.",
      },
      {
        icon: Trophy,
        title: "/level status",
        description:
          "Zeigt dir privat dein Level, deinen Fortschritt und wie viele Nachrichten oder Voice-Minuten bis zum nächsten Level fehlen.",
      },
      {
        icon: Newspaper,
        title: "Treiber-News getrennt & Game-News-Details",
        description:
          "Eigene Rolle bn.treiber mit Kanal #treiber-news. Im Dashboard zeigt ein Klick auf eine Kachel, was enthalten ist und die letzten Beiträge, dazu ein Verlauf aller Änderungen.",
      },
      {
        icon: CheckCircle2,
        title: "Fehlerbehebungen",
        description:
          "Phishing-Filter sperrt keine echten Steam-Links mehr, XP & Daten sind gegen Abstürze beim Speichern geschützt, Voice-Lobbys lassen sich zuverlässig umbenennen und verstecken.",
      },
    ],
  },
  {
    version: "v2.3.0",
    date: "Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-indigo-300 border-discord-blurple/30",
    title: "Benutzerverwaltung, Gefängnis-System & Transparente XP-Aufschlüsselung",
    description:
      "Umfangreiches Verwaltungs- und Transparenz-Upgrade: Vollständige Benutzerverwaltung im Web, Gefängnis-System (/prison) mit Isolations-Rolle, automatischer Minus-Level XP-Abzug bei Regelverstößen, Support-Kategorie und transparente Aufschlüsselung aller gesammelten Erfahrungspunkte.",
    highlights: [
      {
        icon: UserCheck,
        title: "Benutzerverwaltung & Admin-Panel (/users)",
        description:
          "Zentrale Mitgliederverwaltung mit Nickname-Änderung, Rollen-Zuweisung, manueller XP-Korrektur, Admin-Notizen und intelligenter Filterung nach Server-Auffälligkeiten.",
      },
      {
        icon: Lock,
        title: "Gefängnis-System (/prison) & Bad-Name Filter",
        description:
          "Isolations-Modus für Regelbrecher mit eigener Gefängnis-Rolle und Zelle (#knast-zelle). Automatischer Filter für unangemessene Nicknames inklusive Zwangsumbenennung und Chat-Wortfilter.",
      },
      {
        icon: Trophy,
        title: "Transparente XP-Aufschlüsselung & Vorfall-Historie",
        description:
          "Exakte Aufschlüsselung im Nutzer-Modal: Woher stammen die XP (Chat-Ertrag mit Nachrichtenanzahl, Voice-Ertrag mit Minuten)? Plus lückenlose Historie aller Mod-Eingriffe mit Datum, Grund und abgezogenen Minuspunkten (-XP).",
      },
      {
        icon: FolderTree,
        title: "Support-Kategorie & Sticky-Sidebar Layout",
        description:
          "Automatische Erstellung der Support-Kategorie mit #ticket-support, #hilfe-faq und #support-voice. Die Web-Sidebar und das Nutzerprofil bleiben nun beim Scrollen fixiert am Bildschirm verankert.",
      },
    ],
  },
  {
    version: "v2.2.0",
    date: "Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
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
      "Die Geburtsstunde des GLGBots.",
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
