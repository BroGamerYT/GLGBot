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
  Clapperboard,
  Terminal,
  Calendar,
  Coins,
  ShoppingBag,
  LayoutTemplate,
  Award,
  Image as ImageIcon,
  Cpu,
  RotateCcw,
  HardDrive,
  ExternalLink as ExternalLinkIcon,
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
    version: "v2.28.0",
    date: "16. Oktober 2026",
    badge: "Aktuell",
    badgeColor: "bg-discord-green/10 text-discord-green border-discord-green/30",
    title: "Sicherheits-Update & Musik-Korrekturen",
    description:
      "Eine Sicherheitsprüfung des gesamten Projekts hat mehrere Lücken aufgedeckt - alle sind geschlossen. Dazu zwei hartnäckige Fehler im Musik-Player, die bisher unbemerkt blieben.",
    highlights: [
      {
        icon: Lock,
        title: "Login-Code nicht mehr erratbar",
        description:
          "Der Code aus /web-login hatte nur 4 Ziffern und keine Versuchsbremse - er war in Minuten durchprobierbar. Jetzt 6 zufällige Zeichen (GLG-K7P2WD) und maximal 10 Fehlversuche pro Viertelstunde.",
      },
      {
        icon: Shield,
        title: "Keine Admin-Rechte mehr über Backups",
        description:
          "Aus hochgeladenen Backup-Dateien übernimmt nur noch der Server-Inhaber oder ein Administrator Admin- und Moderationsrechte. Zuvor konnte sich jeder mit „Server verwalten“ darüber selbst hochstufen.",
      },
      {
        icon: ExternalLinkIcon,
        title: "Weiterleitung & Shop abgesichert",
        description:
          "Server-Kurzlinks führen nur noch auf eigene Seiten (kein Phishing über die echte Adresse mehr), und im Shop kann nicht mehr zweimal gleichzeitig vom selben Guthaben gekauft werden.",
      },
      {
        icon: Mic,
        title: "Bot verlässt leere Sprachkanäle",
        description:
          "Die Leer-Erkennung im Musik-Player hat nie funktioniert - der Bot blieb dauerhaft im leeren Kanal. Jetzt beendet er die Wiedergabe nach etwa einer Minute ohne Zuhörer, die Warteschlange übersteht kurze Verbindungsabrisse.",
      },
    ],
  },
  {
    version: "v2.27.0",
    date: "15. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Audio-Ducking, Radio-Steuerpanel Textkanal & Panel-Auto-Cleanup",
    description: "Automatisches Audio-Ducking (Lautstärke sinkt beim Reden auf 35 % und kehrt nach Sprechende zurück), dedizierter Textkanal #📻・radio-steuerung mit interaktivem Steuerpanel sowie Auto-Löschung aller störenden Chatnachrichten in Panel-Kanälen und In-Place Updates ohne Pop-up-Meldungen.",
    highlights: [
      {
        icon: Mic,
        title: "Intelligentes Audio-Ducking",
        description: "Sobald Mitglieder im Sprachkanal sprechen, wird die Musik- bzw. Radio-Lautstärke sanft um 65 % geduckt, damit Gespräche glasklar bleiben, und nach 800 ms Release-Pause wiederhergestellt.",
      },
      {
        icon: Radio,
        title: "Radio-Steuerkanal & Lautstärke-Befehle",
        description: "Mit /radio panel wird ein persistenter Steuerkanal #📻・radio-steuerung bereitgestellt. Mit /radio volume (oder /radio volumen) lässt sich die Stream-Lautstärke direkt im Chat regeln.",
      },
      {
        icon: Sparkles,
        title: "Auto-Cleanup & In-Place Updates",
        description: "Keine lästigen Pop-ups mehr beim Klick auf Buttons im Panel. Fremdnachrichten in Panel-Kanälen werden nach 2,5s automatisch gelöscht, sodass der Kanal dauerhaft sauber bleibt.",
      },
    ],
  },
  {
    version: "v2.26.0",
    date: "15. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Radio & Web-Zentrale Redesign, Auto-Cleanup & Stabilität",
    description: "Komplett neu gestaltetes Radio- & Musik-Dashboard mit persistentem Top-Player, 4 strukturierten Tabs (Sender, Soundboard, Playlisten/Queue, Einstellungen), temporären Musik-Kanälen mit automatischer Löschung und Voice-Stabilitätsfixes.",
    highlights: [
      {
        icon: Radio,
        title: "Strukturiertes 4-Tab Dashboard & Mini-Player",
        description: "Persistente Player-Leiste oben mit Kanal-Auswahl, Lautstärke-Regelung (±10%), Live-Statusanzeige und übersichtlichen Reitern für Sender, Sounds, Playlisten und Bot-Settings.",
      },
      {
        icon: Mic,
        title: "Temporäre Musik-Kanäle & Auto-Cleanup",
        description: "Automatische Erstellung temporärer 📻-Sprachkanäle mit 120s Beitrittsfrist und 60s Leerlauf-Countdown – der Bot verlässt den Kanal und löscht ihn nach Inaktivität selbstständig.",
      },
      {
        icon: Clapperboard,
        title: "Soundboard-Filter & Ordner-Upload",
        description: "Sofortsuche in allen Sound-Dateien, Ordner-Pills, Drag & Drop Uploads (ganze Ordner werden automatisch als Playlist gespeichert) und dedizierter Worker-Status.",
      },
    ],
  },
  {
    version: "v2.25.0",
    date: "14. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Radio & Musik-Zentrale",
    description: "Eigene Radio-Seite mit Sender-Verwaltung, Musik-Warteschlange mit YouTube-Suche, Soundboard mit Ordnern und Playlisten sowie Panels mit Lautstärke-Steuerung direkt in Discord.",
    highlights: [
      {
        icon: Radio,
        title: "Radio-Seite mit Sendern & Steuerung",
        description: "Sender anlegen, URL testen, Kanal mit Limit erstellen und starten, Lautstärke regeln, Live-Titel und Fehler live sehen.",
      },
      {
        icon: Mic,
        title: "/music, /radio panel & /music-panel",
        description: "YouTube-Suche mit Queue, Radio-Panel mit Sender-Dropdown und Lautstärke-Buttons, Musik-Panel mit Steuerung und Sound-Dropdown.",
      },
      {
        icon: Clapperboard,
        title: "Soundboard, Uploads & Playlisten",
        description: "MP3-Upload per Drag & Drop oder DM-Code, Unterordner, Download, Playlisten mit Drag & Drop und lokale Wiedergabe per /music play local.",
      },
    ],
  },
  {
    version: "v2.24.0",
    date: "13. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Rollen- & Rechte-Zentrum",
    description: "Die Rollen-Seite wird zur zentralen Serverrollen-Verwaltung: Rollen durchsuchen und nach Hierarchie prüfen, Rechte gruppiert bearbeiten, Mitglieder zuordnen sowie Farben, Sichtbarkeit und Erwähnbarkeit konfigurieren.",
    highlights: [
      {
        icon: Shield,
        title: "Rollen erstellen, bearbeiten & löschen",
        description: "Durchsuchbare Hierarchie mit Rollenfarbe, Position, Mitgliederanzahl und klaren Aktionen. Die bisherige Panel-Zuordnung bleibt als eigener Bereich erhalten.",
      },
      {
        icon: Lock,
        title: "Gruppierte Rechte-Matrix",
        description: "Verwaltungs-, Mitglieder-, Text- und Sprachrechte übersichtlich bearbeiten. Kritische Serverrechte bleiben Ownern und Administratoren vorbehalten.",
      },
      {
        icon: UserCheck,
        title: "Mitglieder & Discord-Hierarchie",
        description: "Mitglieder suchen und Rollen vergeben oder entziehen. Bot und angemeldeter Nutzer können nur Rollen unterhalb ihrer höchsten Rolle verändern; Integrationsrollen sind gesperrt.",
      },
      {
        icon: Newspaper,
        title: "Getrennte News-Filter",
        description: "Treiber-/Software-, NAS- und Technikartikel bleiben in ihren eigenen Reitern. Der Treiber-Reiter zeigt keine Technik-News mehr mit an.",
      },
    ],
  },
  {
    version: "v2.23.0",
    date: "12. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "System-Manager, Live-Logkonsole & Umfassendes Sicherheits-Audit",
    description: "Neue Live-Logkonsole mit Terminal-Ansicht (/system-logs), PM2-Prozessüberwachung und 1-Klick Neustart-Steuerung. Vollständige Behebung von Sicherheitsrisiken (Command-Injection, API-Tokens, IDOR), Inflationsschutz und atomare Dateisystem-Härtung.",
    highlights: [
      {
        icon: Terminal,
        title: "Live System-Logs & Terminal (/system-logs)",
        description: "Echtzeit-Webkonsole für Discord-Bot und Next.js Webinterface mit Auto-Scroll, Service- & Level-Filtern, Volltextsuche und statischen, flackerfreien Zeitstempeln.",
      },
      {
        icon: RotateCcw,
        title: "Prozess-Manager & 1-Klick Neustart",
        description: "Live-Metriken für CPU, RAM, Uptime und Neustartzähler beider PM2-Prozesse sowie sichere Neustart-Ausführung (Bot, Web oder Alle) mit 4s Reconnect-Countdown.",
      },
      {
        icon: Shield,
        title: "Kritisches Sicherheits-Audit & Hardening",
        description: "Schutz vor Command-Injection durch spawn ohne Shell, 32-Zeichen Mindestlänge für API-Tokens, Multi-Guild IDOR-Serverprüfung und konfigurierbare Twitch-Client-ID.",
      },
      {
        icon: HardDrive,
        title: "Atomare Dateizugriffe & Crash-Schutz",
        description: "Isolierte temporäre Dateien und automatischer Lock-Schutz für alle JSON-Speicher verhindern Datenverlust bei gleichzeitigen Schreibvorgängen oder Serverabstürzen.",
      },
    ],
  },
  {
    version: "v2.22.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Unicode-Kanal-Designer, 10 Schriftarten & Mega-Server Templates",
    description: "Umfassender Kanal-Designer mit Unicode-Schriftarten (Small Caps, Bold Sans, Gothic, Aesthetic, Boxed, Cyber), neuen Vorlagen von Kompakt bis Mega sowie Slash-Befehlen /channel-style und /font.",
    highlights: [
      {
        icon: Sparkles,
        title: "Live Kanal-Schriftarten & Designer Tool",
        description: "Im Dashboard und per Chat: Teste 10 stylische Schriftarten in Echtzeit, kopiere sie per Klick oder wende das Design mit 1 Klick direkt auf echte Discord-Kanäle an.",
      },
      {
        icon: LayoutTemplate,
        title: "Templates von Klein bis Groß (Kompakt bis Mega)",
        description: "Neue modulare Vorlagen: '🌱 Minimal Starter' für schlanke Server, '🏆 E-Sport Pro' für Turniere & Scrims sowie die gewaltige '🏰 Mega-Community' mit 8 Kategorien und 32 Kanälen.",
      },
      {
        icon: Terminal,
        title: "Befehle /channel-style & /font",
        description: "Mit /channel-style Kanäle im Discord sofort umstylen und mit /font beliebigen Text in stylische Unicode-Schriften umwandeln und kopieren.",
      },
    ],
  },
  {
    version: "v2.21.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Backup-Transfer, JSON Download/Upload & 1-Klick Templates",
    description: "Vollständiger Im- und Export von Server-Backups als JSON mit Cross-Server Transfer, automatischer Bereinigung alter Mitglieder und Inhaber-Rangschutz. Plus UGREEN NAS, Hardware-News und Free-Games Einzel-Posts.",
    highlights: [
      {
        icon: Archive,
        title: "Backup JSON Download & Upload",
        description: "Snapshots können per Klick als JSON-Datei heruntergeladen oder von externen Quellen hochgeladen und direkt im Dashboard wiederhergestellt werden.",
      },
      {
        icon: UserCheck,
        title: "Cross-Server Transfer mit Inhaber-Schutz",
        description: "Spezielle Einstellungen beim Einspielen auf fremde Server: 'Owner als oberste Rolle sichern' garantiert den höchsten Rang, während 'Mitglieder-Rechte bereinigen' alte Nutzer-Overwrites entfernt.",
      },
      {
        icon: LayoutTemplate,
        title: "1-Klick Server-Templates & Auto-Setup",
        description: "5 vorgefertigte Strukturen (Gaming Clan, Multi-Gaming, Dev/Tech, Anime Hangout, Creator) mit 4 Design-Stilen und automatischem Snapshot-Sicherheitsnetz.",
      },
      {
        icon: Newspaper,
        title: "UGREEN NAS, Hardware-News & Clean Steam",
        description: "UGOS Pro & Docker-Updates für UGREEN NAS, Technik-News von Heise, Golem & Hardwareluxx sowie bereinigte Steam-Patchnotes ohne BBCode-Tags.",
      },
      {
        icon: Gift,
        title: "Free-Games Einzelposts mit Launcher-Buttons",
        description: "Kostenlose Spiele werden in übersichtlichen separaten Nachrichten gepostet mit direkten 'In Steam/Epic öffnen'-Buttons darunter.",
      },
      {
        icon: Coins,
        title: "30-Minuten Code-Login & XP-Börse",
        description: "Schnell-Login (/web-login) für den Shop ohne Discord-OAuth, dynamische Wechselkurse an der XP-Börse und leuchtende Discord-Namensfarben.",
      },
    ],
  },
  {
    version: "v2.19.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Voice-Knast & Automatischer Haft-Timer",
    description: "Vollständiger Voice-Knast mit Sprachkanal 🔒・gefängnis-voice, automatischer Verschiebung, Voice-Enforcement und flexibler Haftdauer (z. B. 60 Min.) mit automatischem Release-Scheduler.",
    highlights: [
      {
        icon: Mic,
        title: "Voice-Knast & Auto-Verschiebung",
        description: "Inhaftierte werden automatisch in den isolierten Sprachkanal #🔒・gefängnis-voice verschoben. Reguläre Sprachkanäle sind blockiert.",
      },
      {
        icon: Lock,
        title: "Haftdauer & Auto-Release Scheduler",
        description: "Haftstrafen können nun mit Zeitbegrenzung (z. B. 60m) vergeben werden. Der Bot entlässt Mitglieder bei Ablauf automatisch und stellt alle Rollen wieder her.",
      },
    ],
  },
  {
    version: "v2.18.2",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Gaming-News Kacheln & Interaktive Vollansicht",
    description: "Öffentliches News-Magazin mit ansprechenden Kachel-Karten, Cover-Bildern, Teasern und interaktivem Artikel-Modal für vollständige Patchnotes und Treiberdetails.",
    highlights: [
      {
        icon: Newspaper,
        title: "News-Magazin mit Bild-Kacheln",
        description: "Alle Spiele-Updates und Treiber-Neuigkeiten übersichtlich als visuelle Kacheln mit Live-Suche, Kategorien-Filtern und Spiel-Selektor.",
      },
      {
        icon: Sparkles,
        title: "Vollständige Artikel-Ansicht per Klick",
        description: "Klick auf eine Kachel öffnet das Artikel-Modal mit komplett formatierten Patchnotes, Screenshots, Listen und Direktlinks zu Steam und Downloads.",
      },
    ],
  },
  {
    version: "v2.18.1",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Community-Badges & Willkommens-Hintergrund",
    description: "Visuelle Meilenstein-Badges auf der Rangkarte (/rank), individuelles Hintergrundbild für Willkommenskarten mit Glassmorphismus-Filter und Windows-Installer Autostart-Option.",
    highlights: [
      {
        icon: Award,
        title: "Community-Badges & Aktivitäts-Meilensteine",
        description: "Automatische Abzeichen für Inhaber, Admins, Mods, Level-Meilensteine, Daily-Streaks, Chat- und Voice-Veteranen direkt auf der grafischen Rangkarte.",
      },
      {
        icon: ImageIcon,
        title: "Eigenes Hintergrundbild für Willkommenskarten",
        description: "Individuelle Banner-URL im Web-Dashboard einstellbar. Automatischer Glassmorphismus-Filter garantiert stets optimale Textlesbarkeit.",
      },
    ],
  },
  {
    version: "v2.18.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "1-Klick Server-Templates & Auto-Setup",
    description: "Komplette Server-Strukturen (Gaming Clan, Multi-Gaming, Dev/Tech, Anime, Creator) mit flexiblen Design-Stilen, Berechtigungs-Hardening und automatischem Snapshot-Backup.",
    highlights: [
      {
        icon: LayoutTemplate,
        title: "5 Vordefinierte Server-Templates",
        description: "Perfekt abgestimmte Kategorien, Kanäle, Berechtigungen und Rollen für Clans, Gaming-Communitys, Entwickler-Teams, Anime-Hangouts und Streamer.",
      },
      {
        icon: Sparkles,
        title: "Wählbare Emoji- & Design-Stile",
        description: "4 anpassbare Stile für Kanalnamen (Modern mit Emojis, Clean, Aesthetic, Box/Bold), interaktiver 3-Schritte-Assistent im Dashboard und /server-setup.",
      },
    ],
  },
  {
    version: "v2.17.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Community-Wirtschaft & Belohnungs-Shop",
    description: "Vollständiges Economy-System mit Server-Währung (Coins 🪙), Chat-/Voice-Belohnungen, Überweisungen (/pay), Kontostand (/balance) und Belohnungs-Shop (/shop) für Rollen und Badges.",
    highlights: [
      {
        icon: Coins,
        title: "Server-Währung & Belohnungsraten",
        description: "Frei konfigurierbare Währung gesammelt durch Chat-Nachrichten, aktive Voice-Zeit und tägliche /daily Belohnungen inklusive Streak-Bonus.",
      },
      {
        icon: ShoppingBag,
        title: "Belohnungs-Shop im Web & Chat",
        description: "Exklusive Discord-Rollen (automatische Zuweisung), Profil-Badges und Voice-Features mit Live-Bestand, Mindestlevel-Anforderungen und Sofortkauf.",
      },
    ],
  },
  {
    version: "v2.16.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Game-Release-Kalender & Wöchentliche Highlights",
    description: "Öffentlicher Kalender für bevorstehende Gaming-Highlights (GTA VI, Monster Hunter Wilds, Doom, Civ VII etc.) mit Filtern, Countdowns, Vorbestell-Links und automatischem Wochen-Post.",
    highlights: [
      {
        icon: Calendar,
        title: "Release-Kalender im Web & Discord",
        description: "Dashboard-Übersicht nach Zeitfenster und Plattformen (PC, PlayStation, Xbox, Switch, Game Pass Day One). Eigene Server-Releases können von Admins hinzugefügt werden.",
      },
      {
        icon: Sparkles,
        title: "Discord-Befehl & Montags-Scheduler",
        description: "Befehl /releases uebersicht und /releases post-woche. Der Bot postet jeden Montag um 10:00 Uhr die wichtigsten Releases der Woche automatisch in den News-Kanal.",
      },
    ],
  },
  {
    version: "v2.15.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Clip der Woche & Web-Konsole",
    description: "Die Community stimmt mit 🔥 über den besten Clip der Woche ab, und Moderatoren können Kanäle im Dashboard mitlesen und als Bot schreiben.",
    highlights: [
      {
        icon: Clapperboard,
        title: "Clip der Woche",
        description: "Clips im Clip-Kanal bekommen 🔥 und 😂. Einmal pro Woche wird der Gewinner angepinnt und mit Platz 2 und 3 angekündigt.",
      },
      {
        icon: Terminal,
        title: "Web-Konsole",
        description: "Kanäle live mitlesen, als Bot schreiben, antworten oder löschen - nur mit „Nachrichten verwalten“, alles landet im Audit-Log.",
      },
    ],
  },
  {
    version: "v2.14.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
    title: "Einfache Installation: Docker & Skripte",
    description: "Den Bot gibt es jetzt als Docker-Container und mit Installations-Skripten für Linux und Windows. Dazu werden Daten entfernter Server automatisch aufgeräumt.",
    highlights: [
      {
        icon: Archive,
        title: "Docker",
        description: "docker compose up -d --build - Bot und Dashboard laufen zusammen, eure Daten bleiben in eigenen Ordnern.",
      },
      {
        icon: Sparkles,
        title: "Installations-Skripte",
        description: "install_linux.sh richtet Node.js, PM2 und Autostart ein; install_windows.bat baut alles per Doppelklick.",
      },
      {
        icon: Shield,
        title: "Datenschutz bei entfernten Servern",
        description: "30 Tage nach dem Entfernen einer Freigabe werden die Daten des Servers gelöscht - oder sofort per Knopf.",
      },
    ],
  },
  {
    version: "v2.13.0",
    date: "11. Oktober 2026",
    badge: "Feature-Update",
    badgeColor: "bg-discord-blurple/10 text-discord-blurple border-discord-blurple/30",
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
