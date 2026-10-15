import Link from "next/link";
import type { ReactNode } from "react";
import {
  LifeBuoy,
  Newspaper,
  Rocket,
  KeyRound,
  ScrollText,
  Shield,
  Mic,
  Radio,
  Bell,
  Gift,
  Terminal,
  Wrench,
  ChevronRight,
  Trophy,
  Ticket,
  FileText,
  Sparkles,
  ShieldAlert,
  Server,
  Coins,
  LayoutTemplate,
  Archive,
  Music,
} from "lucide-react";
import DynamicRulesView from "@/components/DynamicRulesView";

export const metadata = { title: "Hilfe & Befehle | GLGBot Panel" };

const SECTIONS = [
  { id: "schnellstart", title: "Schnellstart", icon: Rocket },
  { id: "dashboard", title: "Dashboard & Login", icon: KeyRound },
  { id: "economy", title: "Wirtschaft & Shop", icon: Coins },
  { id: "server", title: "Mehrere Server", icon: Server },
  { id: "templates", title: "1-Klick Templates", icon: LayoutTemplate },
  { id: "backups", title: "Backups & Transfer", icon: Archive },
  { id: "level", title: "Level & Talk-Partner", icon: Trophy },
  { id: "tickets", title: "Support-Tickets", icon: Ticket },
  { id: "regeln", title: "Regeln & Freischaltung", icon: ScrollText },
  { id: "rollen", title: "Rollen & Benachrichtigungen", icon: Shield },
  { id: "voice", title: "Voice-Manager", icon: Mic },
  { id: "radiomusik", title: "Radio, Musik & Soundboard", icon: Music },
  { id: "live", title: "Live-System", icon: Radio },
  { id: "alerts", title: "Stream-Alerts", icon: Bell },
  { id: "freegames", title: "Free-Games & Releases", icon: Gift },
  { id: "news", title: "News & Hardware", icon: Newspaper },
  { id: "audit", title: "Silent Audit-Logs", icon: FileText },
  { id: "moderation", title: "Moderations-Suite", icon: ShieldAlert },
  { id: "befehle", title: "Alle Befehle", icon: Terminal },
  { id: "probleme", title: "Probleme & Lösungen", icon: Wrench },
];

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-discord-blurple" />
        {title}
      </h2>
      <div className="text-sm text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Cmd({ children }: { children: ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-discord-dark border border-discord-border text-discord-blurple font-mono text-[13px] whitespace-nowrap">{children}</code>;
}

function Note({ type = "info", children }: { type?: "info" | "warn" | "tip"; children: ReactNode }) {
  const styles = {
    info: "border-sky-500/30 bg-sky-500/5 text-sky-100",
    warn: "border-yellow-400/30 bg-yellow-400/5 text-yellow-100",
    tip: "border-discord-green/30 bg-discord-green/5 text-green-100",
  }[type];
  const label = { info: "ℹ️ Hinweis", warn: "⚠️ Wichtig", tip: "💡 Tipp" }[type];
  return (
    <div className={`p-4 rounded-xl border ${styles}`}>
      <p className="font-semibold text-xs uppercase tracking-wide mb-1 opacity-80">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-discord-blurple/20 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <div>{item}</div>
        </li>
      ))}
    </ol>
  );
}

const COMMANDS: { group: string; items: [string, string, string][] }[] = [
  {
    group: "Community & Ranglisten (Für alle)",
    items: [
      ["/help", "Zeigt die strukturierte Hilfe-Übersicht und Links zum Webinterface & Support.", "Alle"],
      ["/rules [paragraph]", "Zeigt das offizielle, aktuelle Regelwerk unseres Servers (oder einen bestimmten Paragraphen wie §1) direkt im Chat an.", "Alle"],
      ["/web-login", "Generiert einen 30 Minuten gültigen Einmal-Code und 1-Klick-Link zum Anmelden im Webinterface / Shop.", "Alle"],
      ["/rank [mitglied]", "Grafische Rangkarte mit Level, Server-Rang, Fortschrittsbalken, Nachrichten, Voice-Zeit und Daily-Serie.", "Alle"],
      ["/level status", "Dein Level-Status: Fortschritt und wie viele Nachrichten / Voice-Minuten bis zum nächsten Level fehlen (nur für dich sichtbar).", "Alle"],
      ["/level sync-roles [mitglied]", "Vergibt nachträglich alle verdienten Level-Belohnungsrollen.", "Alle"],
      ["/balance [mitglied]", "Zeigt dein aktuelles Guthaben (Coins), deinen Vermögens-Rang und die letzten Transaktionen an.", "Alle"],
      ["/pay [mitglied] [betrag]", "Überweist Coins von deinem Konto an ein anderes Mitglied.", "Alle"],
      ["/shop uebersicht | kaufen [artikel] | code", "Belohnungs-Shop: Durchstöbere exklusive Rollen, Badges & Namensfarben oder generiere deinen 30-Minuten Web-Login-Code.", "Alle"],
      ["/daily", "Tägliche Belohnung: 50 Coins + 50 XP + Streak-Bonus (bis zu +150 Coins/XP). Streak hält bis 36 Std. nach dem letzten Abholen.", "Alle"],
      ["/leaderboard [kategorie]", "Zeigt die Top 10 Rangliste (Gesamt-XP, Voice-Minuten, Chat-Nachrichten, Vermögen/Coins).", "Alle"],
      ["/serverstatus", "Zeigt den Live-Status der eingetragenen Game-Server (Spieler, Map, Version, Adresse zum Kopieren).", "Alle"],
      ["/lfg [spiel] [spieler] [rang] [beschreibung]", "Mitspieler suchen: Gruppe mit Beitreten-Button. Ist sie voll, pingt der Bot alle, erstellt eine eigene Lobby und verschiebt alle, die im Voice sind.", "Alle"],
      ["/birthday set | remove | list", "Geburtstag eintragen (nur Tag & Monat), entfernen oder die nächsten Geburtstage anzeigen. Der Bot gratuliert am Tag selbst.", "Alle"],
      ["/voice-stats [mitglied]", "Zeigt deine Voice-Aktivität, Online-Dauer und Top Talk-Partner.", "Alle"],
      ["/top-voice", "Rangliste der aktivsten Gesprächs-Duos und Voice-Nutzer auf dem Server.", "Alle"],
      ["/suggest [vorschlag]", "Reicht einen Server-Vorschlag mit Abstimmungs-Buttons im Feedback-Kanal ein.", "Alle"],
      ["/giveaway start | end | reroll", "Verlosung mit Teilnahme-Button starten (Dauer, Gewinner, Preis, optional Rolle), vorzeitig beenden oder neu auslosen.", "Server verwalten"],
      ["/free-games list", "Zeigt alle aktuell kostenlosen Spiele (ephemeral, nur für dich sichtbar).", "Alle"],
      ["/releases uebersicht | post-woche", "Game-Release-Kalender: Übersicht aller kommenden Blockbuster, Triple-A Titel und großen Spiele-Updates nach Zeitraum & Plattform filtern oder die Wochen-Releases im Kanal posten.", "Alle"],
      ["/font <text> [stil]", "Wandelt jeden Text in stylische Unicode-Schriftarten (Small Caps, Bold Sans, Gothic, Double-Struck, Monospace, Bubble etc.) um.", "Alle"],
      ["/ping", "Prüft die Latenz und Erreichbarkeit des Bots.", "Alle"],
      ["/twitch-live start | stop", "Sich selbst als live melden bzw. Live-Status vorzeitig beenden.", "Alle"],
      ["/radio start <url> | stop | pause | resume | status | ton", "Web-Radio-Stream im eigenen Voice-Kanal abspielen. Mit ton einen 5s-Testton zur Prüfung abspielen.", "Alle"],
      ["/radio panel", "Postet das Radio-Panel: Sender per Dropdown starten, Pause/Weiter/Stop und Lautstärke ±10 % regeln.", "Kanäle verwalten"],
      ["/music play <suche|url|local:name> | skip | queue | shuffle | loop | volume | nowplaying | history | stop", "YouTube- & lokale Musik mit Warteschlange: Song suchen, URL oder Datei aus data/music abspielen, Queue verwalten, Verlauf ansehen.", "Alle"],
      ["/music spotify <link>", "Importiert eine Spotify-Playlist (bis 30 Titel) als YouTube-Suche in die Queue.", "Alle"],
      ["/music upload <datei> [code]", "MP3/WAV/OGG/M4A hochladen. Braucht „Kanäle verwalten“, die DJ-Rolle (im Economy-Shop für Coins kaufbar) oder einen Upload-Code aus dem Dashboard.", "Alle"],
      ["/music-panel", "Postet das permanente Musik-Panel mit Pause/Skip/Stop/Shuffle, Lautstärke ±10 % und Loop-Umschaltung.", "Kanäle verwalten"],
      ["/soundboard list | play <sound>", "Kurze Sounds aus data/music im eigenen Voice-Kanal abspielen.", "Alle"],
      ["/radio add <name> <url> | remove | list", "Eigene Radio-Sender speichern, löschen und auflisten.", "Kanäle verwalten"],
    ],
  },
  {
    group: "VoiceMaster Lobbys (Lobby-Besitzer)",
    items: [
      ["/voice lock | unlock", "Eigene Lobby für andere sperren / wieder entsperren.", "Lobby-Besitzer"],
      ["/voice hide | unhide", "Eigene Lobby unsichtbar machen / wieder sichtbar schalten.", "Lobby-Besitzer"],
      ["/voice name [name]", "Lobby umbenennen (auch Spielname wählbar).", "Lobby-Besitzer"],
      ["/voice limit [anzahl]", "Personenlimit der Lobby ändern (0 = unbegrenzt, bis 99).", "Lobby-Besitzer"],
      ["/voice bitrate [kbps]", "Audioqualität der Sprachlobby anpassen.", "Lobby-Besitzer"],
      ["/voice permit [user]", "Einem Mitglied gezielt Zutritt zur gesperrten Lobby gewähren.", "Lobby-Besitzer"],
      ["/voice reject [user]", "Jemanden aus der Lobby werfen und den Wiedereintritt sperren.", "Lobby-Besitzer"],
      ["/voice transfer [user]", "Lobby-Besitz an eine andere Person in der Lobby übergeben.", "Lobby-Besitzer"],
      ["/voice claim", "Lobby übernehmen, wenn der bisherige Besitzer den Kanal verlassen hat.", "Alle in Lobby"],
    ],
  },
  {
    group: "Moderation & Fallverwaltung",
    items: [
      ["/warn [user] [grund]", "Verwarnt ein Mitglied mit automatischer DM und speichert Fall-ID.", "Mitglieder kicken"],
      ["/timeout [user] [dauer] [grund]", "Schaltet ein Mitglied für 1m bis 1w stumm (Discord Timeout).", "Stummschalten"],
      ["/kick [user] [grund]", "Kickt ein Mitglied vom Discord-Server.", "Mitglieder kicken"],
      ["/knast einsperren [mitglied] [grund] [dauer] | freilassen | liste", "Gefängnis: Entzieht Rollen, sperrt Kanäle, isoliert in #gefängnis & #gefängnis-voice, Timer (z. B. 60m), -1.000 XP. Bei Haftende automatisches Wiederherstellen der Rollen und Verschieben in den AFK-Kanal. (Englisches Discord: /prison)", "Mitglieder moderieren"],
      ["/ban [user] [grund] [delete_days]", "Bannt ein Mitglied dauerhaft und löscht optional Nachrichten (0-7 Tage).", "Bannen"],
      ["/unban [user_id] [grund]", "Hebt den Bann eines Nutzers anhand der Discord-ID auf.", "Bannen"],
      ["/cases view [id]", "Zeigt Details zu einem gespeicherten Moderationsfall an.", "Nachrichten verwalten"],
      ["/cases user [user]", "Listet alle bisherigen Verwarnungen und Strafen eines Mitglieds auf.", "Nachrichten verwalten"],
      ["/cases delete [id]", "Löscht einen Moderationsfall aus der Datenbank.", "Administrator"],
      ["/clear [anzahl] [user]", "Löscht 1 bis 100 Nachrichten (optional nur von einem bestimmten Nutzer).", "Nachrichten verwalten"],
      ["/dm [user] [nachricht]", "Sendet eine offizielle DM im Namen des Servers (mit Log).", "Nachrichten verwalten"],
    ],
  },
  {
    group: "Administration & Server-Setup",
    items: [
      ["/setup-all [bereich] [regel_sperre]", "Richtet alle fehlenden Rollen & Kanäle auf einmal ein (wie die Dashboard-Seite „Server einrichten“).", "Administrator"],
      ["/server-setup [template] [style] [wipe]", "1-Klick Server-Templates: Richtet komplette Server-Strukturen von klein bis groß (Kompakt, Standard, Groß, Mega) mit 10 wählbaren Schriftstilen und Auto-Backup ein.", "Administrator"],
      ["/channel-style [stil] [name] [kanal]", "Benennt Kanäle und Kategorien in stylische Unicode-Schriftarten & Designs (Small Caps, Bold Sans, Gothic, Aesthetic, Boxed etc.) um.", "Kanäle verwalten"],
      ["/birthday setup [kanal] [rolle]", "Legt den Kanal für Glückwünsche fest und erstellt die Geburtstags-Rolle (24 Std.).", "Server verwalten"],
      ["/server-stats einrichten | entfernen | status", "Statistik-Kanäle ganz oben (Mitglieder, Online, Im Voice, Gerade live, Boosts), Aktualisierung alle 10 Min.", "Kanäle verwalten"],
      ["/modules status | enable | disable | toggle", "Schaltet einzelne Funktionen (Module) an oder aus – wie die Dashboard-Seite „Module“. Daten bleiben erhalten.", "Administrator"],
      ["/economy geben | abziehen | setzen | reset", "Verwaltet das Wirtschaftssystem und passt Nutzer-Guthaben direkt an (mit Begründung im Audit-Log).", "Administrator"],
      ["/setup-tickets panel", "Postet das interaktive Support-Ticket-Panel in den aktuellen Kanal.", "Kanäle verwalten"],
      ["/setup-logs set [channel]", "Richtet den Silent-Audit-Log Kanal ein (stille Benachrichtigungen).", "Server verwalten"],
      ["/setup-logs toggle [modul]", "Schaltet einzelne Audit-Kategorien (Rollen, Kanäle, Server, etc.) an/aus.", "Server verwalten"],
      ["/backup create [name]", "Erstellt ein vollständiges Snapshot-Backup (Rollen, Kanäle, Berechtigungen).", "Administrator"],
      ["/backup list", "Zeigt alle gespeicherten Server-Backups mit Datum und Größe an.", "Administrator"],
      ["/backup restore [backup_id]", "Stellt Rollen und Kanalstrukturen aus einem Backup wieder her.", "Administrator"],
      ["/setup-rules post", "Legt #regeln und #berechtigungen an und postet Regeln + Rollen-Panel.", "Administrator"],
      ["/setup-rules lock bestaetigen:True", "Aktiviert die Regel-Sperre: nur freigeschaltete Gäste sehen Kanäle.", "Administrator"],
      ["/setup-rules unlock", "Hebt die Regel-Sperre wieder auf.", "Administrator"],
      ["/setup-roles auto", "Erstellt automatisch alle benötigten Rollen und den #free-games Kanal.", "Rollen verwalten"],
      ["/setup-roles set", "Weist Gast-, Live- und Benachrichtigungs-Rollen manuell zu.", "Rollen verwalten"],
      ["/setup-voice set | status | disable", "Richtet den Join-to-Create VoiceMaster Kanal ein.", "Kanäle verwalten"],
      ["/voice-panel | /interface", "Postet das interaktive Steuerungs-Panel für Lobbys in den Kanal.", "Kanäle verwalten"],
      ["/setup-live set | status | disable", "Richtet das automatische Live-Streamer System ein.", "Kanäle verwalten"],
      ["/streamer add | edit | remove | check", "Verwaltet Streamer (Twitch/YouTube) und prüft Live-Status.", "Kanäle verwalten"],
      ["/stream-panel", "Postet das Steuer-Panel für den Live-Kanal (Passwort, Benutzerlimit, Umbenennen, Sperren, Bitrate).", "Kanäle verwalten"],
      ["/free-games post | einstellungen", "Postet Gratis-Spiele sofort und konfiguriert unterstützte Stores.", "Server verwalten"],
      ["/sticky set [nachricht] | remove", "Fixiert eine angeheftete Nachricht am Ende des aktuellen Kanals.", "Nachrichten verwalten"],
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-sky-400" />
            Hilfe & Dokumentation
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Vollständige Anleitung, alle 30+ Slash-Befehle und Systemkonfiguration für GLGBot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/changelog"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-sm text-gray-300 hover:text-white transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Changelog</span>
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

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* Inhaltsverzeichnis */}
        <nav className="hidden lg:block">
          <div className="sticky top-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold px-3 mb-2">Inhalt</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-discord-card transition-all"
              >
                <s.icon className="w-4 h-4" />
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-6 min-w-0">
          {/* Schnellstart */}
          <Section id="schnellstart" title="Schnellstart" icon={Rocket}>
            <p>So richtest du den Bot auf einem Server in der richtigen Reihenfolge ein:</p>
            <Steps
              items={[
                <>
                  <strong className="text-white">Bot-Rolle nach oben schieben:</strong> In Discord unter{" "}
                  <em>Server-Einstellungen → Rollen</em> muss die Rolle des Bots <strong>über</strong> allen Rollen
                  stehen, die er verwalten soll (Gast, Live, Benachrichtigungs-Rollen).
                </>,
                <>
                  <strong className="text-white">Rollen & Support einrichten:</strong> Im Dashboard unter{" "}
                  <Link href="/roles" className="text-discord-blurple hover:underline">Rollen & Rechte</Link> auf
                  „Rollen automatisch erstellen“ klicken (oder <Cmd>/setup-roles auto</Cmd>) und unter{" "}
                  <Link href="/tickets" className="text-discord-blurple hover:underline">Support-Tickets</Link> das
                  Ticket-Panel erstellen.
                </>,
                <>
                  <strong className="text-white">Regeln posten:</strong> Unter{" "}
                  <Link href="/rules" className="text-discord-blurple hover:underline">Regeln</Link> den Text prüfen
                  und „In Discord posten“ anklicken. Dabei entstehen #regeln und #berechtigungen.
                </>,
                <>
                  <strong className="text-white">Voice & Audit-Logs:</strong> Unter{" "}
                  <Link href="/voice" className="text-discord-blurple hover:underline">Voice-Manager</Link> den Join-to-Create
                  Kanal festlegen und unter <Link href="/logs" className="text-discord-blurple hover:underline">Audit-Logs</Link>{" "}
                  den geschützten Logging-Kanal aktivieren.
                </>,
                <>
                  <strong className="text-white">Live & Free-Games:</strong> Unter{" "}
                  <Link href="/live" className="text-discord-blurple hover:underline">Live-Streamer</Link> Twitch/YouTube
                  eintragen und unter <Link href="/free-games" className="text-discord-blurple hover:underline">Free-Games</Link>{" "}
                  die gewünschten Spiele-Stores aktivieren.
                </>,
              ]}
            />
          </Section>

          {/* Dashboard */}
          <Section id="dashboard" title="Dashboard & Login (Code & Discord)" icon={KeyRound}>
            <p>
              Das Dashboard bietet getrennte Bereiche für Admins und für die allgemeine Community:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Öffentlich erreichbar (ohne Login):</strong> Alle Mitglieder können{" "}
                <Link href="/hilfe" className="text-discord-blurple hover:underline">/hilfe</Link>,{" "}
                <Link href="/changelog" className="text-discord-blurple hover:underline">/changelog</Link>,{" "}
                <Link href="/stats" className="text-discord-blurple hover:underline">/stats</Link> (Ranglisten),{" "}
                <Link href="/news" className="text-discord-blurple hover:underline">/news</Link> (Game- & Software-News),{" "}
                <Link href="/free-games" className="text-discord-blurple hover:underline">/free-games</Link> und{" "}
                <Link href="/releases" className="text-discord-blurple hover:underline">/releases</Link> (Release-Kalender) frei im Browser
                aufrufen.
              </li>
              <li>
                <strong className="text-white">Shop- & Community-Login:</strong> Normale Server-Mitglieder können sich ganz
                einfach per Discord OAuth oder mit einem <strong>30-Minuten-Code</strong> (<Cmd>/web-login</Cmd> oder <Cmd>/shop code</Cmd>)
                auf der <Link href="/login" className="text-discord-blurple hover:underline">Login-Seite</Link> anmelden, um im{" "}
                <Link href="/economy" className="text-discord-blurple hover:underline">Shop</Link> Rollen, Badges und Namensfarben zu kaufen
                oder Level-XP umzutauschen.
              </li>
              <li>
                <strong className="text-white">Admin-Bereich (mit Login):</strong> Der Zugriff auf Ticket-Chats,
                Server-Backups, Logs und Bot-Konfiguration ist durch Discord-OAuth geschützt. Reinkommen der Server-Owner
                sowie Mitglieder mit Administrator-Rechten oder in <Cmd>DASHBOARD_USER_IDS</Cmd>.
              </li>
              <li>
                <strong className="text-white">Web-Konsole:</strong> Unter{" "}
                <Link href="/console" className="text-discord-blurple hover:underline">Web-Konsole</Link> liest du Kanäle live
                mit und schreibst oder antwortest als Bot. Du siehst nur Kanäle, in denen du „Nachrichten verwalten“ hast;
                jede Nachricht landet mit deinem Namen im Audit-Log.
              </li>
              <li>
                <strong className="text-white">Clip der Woche:</strong> Clips im Clip-Kanal bekommen 🔥 und 😂. Einmal pro Woche
                wird der Clip mit den meisten 🔥 angepinnt und angekündigt - einstellbar unter{" "}
                <Link href="/clips" className="text-discord-blurple hover:underline">Clip der Woche</Link>.
              </li>
            </ul>
          </Section>

          {/* Wirtschaft, Coins, Börse & Shop */}
          <Section id="economy" title="Wirtschaft, Coins, XP-Börse & Shop" icon={Coins}>
            <p>
              GLGBot verfügt über ein vollständiges virtuelles Wirtschaftssystem mit eigenem Belohnungs-Shop,
              dynamischer XP-Börse und Discord-Namensfarben:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Coins verdienen:</strong>
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400">
                  <li><Cmd>/daily</Cmd> – Täglich 50 Coins + bis zu 150 Streak-Bonus abholen.</li>
                  <li>Text- & Voice-Aktivität (XP sammeln und an der Börse eintauschen).</li>
                  <li>Überweisungen von Freunden mit <Cmd>/pay @User [Betrag]</Cmd>.</li>
                  <li>Events, Verlosungen (<Cmd>/giveaway</Cmd>) und Server-Aktionen.</li>
                </ul>
              </li>
              <li>
                <strong className="text-white">📈 Dynamische XP-Börse (Marktwirtschaft):</strong> Im Web-Dashboard unter{" "}
                <Link href="/economy" className="text-discord-blurple hover:underline">Wirtschaft & Shop</Link> können verdiente
                Level-Punkte (XP) in Coins umgetauscht werden. Der Wechselkurs schwankt wie an der echten Börse je nach
                serverweiten Transaktionen dynamisch!
              </li>
              <li>
                <strong className="text-white">🎨 Namensfarben & Farb-Rollen:</strong> Mitglieder können sich im Shop knallige
                Farben für ihren Namen aussuchen. Sobald eine Farbe gekauft oder ausgewählt wird, schaltet der Bot die
                zugehörige Farb-Rolle auf Discord live und passt die Chat-Farbe an.
              </li>
              <li>
                <strong className="text-white">🛒 Belohnungs-Shop:</strong> Kaufe Rollen, Profil-Badges und Perks entweder direkt
                über Discord mit <Cmd>/shop kaufen [Artikel]</Cmd> oder mit visueller Vorschau im Web-Shop unter{" "}
                <Link href="/economy" className="text-discord-blurple hover:underline">/economy</Link>.
              </li>
              <li>
                <strong className="text-white">🔑 30-Minuten Code-Login:</strong> Keine Lust auf Discord-OAuth? Gib einfach{" "}
                <Cmd>/web-login</Cmd> oder <Cmd>/shop code</Cmd> in Discord ein, erhalte einen 30 Minuten gültigen Code und
                einen 1-Klick-Link, der dich sofort im Shop anmeldet!
              </li>
            </ul>
            <div className="flex gap-2 pt-1">
              <Link
                href="/economy"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                Zum Web-Shop & zur XP-Börse
              </Link>
            </div>
          </Section>

          {/* Mehrere Server */}
          <Section id="server" title="Mehrere Server (max. 5)" icon={Server}>
            <p>
              Der Bot kann bis zu <strong className="text-white">5 Server</strong> gleichzeitig betreuen - aber nur
              freigegebene. Wird er woanders eingeladen, schreibt er dem Owner kurz warum und verlässt den Server sofort.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Server wechseln:</strong> oben links unter dem Bot-Namen. Du siehst nur
                Server, auf denen du Owner, Administrator oder „Server verwalten“ hast.
              </li>
              <li>
                <strong className="text-white">Freigeben:</strong> Der Bot-Besitzer trägt unter{" "}
                <Link href="/servers" className="text-discord-blurple hover:underline">Server-Freigabe</Link> die Server-ID
                ein und lädt den Bot dann über „Bot einladen“ ein.
              </li>
              <li>
                <strong className="text-white">Getrennte Daten:</strong> Einstellungen, Level, Regeln, Fälle und Logs gelten
                immer nur für den jeweiligen Server. Auf neuen Servern sind zuerst nur Regeln, Rollen, Moderation und Voice
                an - den Rest schaltest du unter <Link href="/modules" className="text-discord-blurple hover:underline">Module</Link> ein.
              </li>
            </ul>
          </Section>

          {/* 1-Klick Server-Templates */}
          <Section id="templates" title="1-Klick Server-Templates & Auto-Setup" icon={LayoutTemplate}>
            <p>
              Unter <Link href="/templates" className="text-discord-blurple hover:underline">Server-Templates</Link> oder mit <Cmd>/server-setup</Cmd> richtet der Bot in unter 15 Sekunden eine komplette, professionelle Discord-Server-Struktur ein:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">5 vorkonfigurierte Vorlagen:</strong> 🎮 Gaming Clan & E-Sport, 🌐 Multi-Gaming Community, 💻 Coding / Dev / Tech, 🌸 Anime & Hangout, 🔴 Content Creator & Streamer.
              </li>
              <li>
                <strong className="text-white">4 Design- & Emoji-Stile:</strong> Modern mit Emojis (<Cmd>💬・hauptchat</Cmd>), Clean (<Cmd>hauptchat</Cmd>), Aesthetic (<Cmd>〢・hauptchat</Cmd>) oder Box/Bold (<Cmd>「💬」hauptchat</Cmd>).
              </li>
              <li>
                <strong className="text-white">Automatischer Snapshot-Schutz:</strong> Vor jedem Ausrollen wird automatisch ein vollständiges Sicherheits-Backup angelegt.
              </li>
            </ul>
          </Section>

          {/* Server-Backups & Cross-Server Transfer */}
          <Section id="backups" title="Server-Backups, Download & Server-Transfer" icon={Archive}>
            <p>
              Unter <Link href="/backups" className="text-discord-blurple hover:underline">Server-Backups</Link> oder mit <Cmd>/backup</Cmd> verwaltest du vollständige Snapshots aller Rollen, Kanäle und Berechtigungen:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">💾 Tägliche automatische Sicherung:</strong> Der Bot archiviert jeden Tag automatisch bis zu 20 Stände rollierend.
              </li>
              <li>
                <strong className="text-white">📥 Download als JSON:</strong> Jeder Snapshot kann mit einem Klick auf den PC heruntergeladen werden.
              </li>
              <li>
                <strong className="text-white">📤 Backup hochladen (Upload):</strong> Externe Backups können direkt per Dateiauswahl importiert und auf dem Server wiederhergestellt werden.
              </li>
              <li>
                <strong className="text-white">🌐 Server-Transfer auf andere Discord-Server:</strong>
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400">
                  <li><strong className="text-gray-200">Owner als oberste Rolle sichern:</strong> Weist dem aktuellen Server-Inhaber automatisch die oberste Admin-Rolle zu, sodass der Inhaber garantiert auf dem höchsten Rang bleibt.</li>
                  <li><strong className="text-gray-200">Mitglieder-Berechtigungen bereinigen:</strong> Entfernt nutzerspezifische Berechtigungen aus dem alten Server, sodass nur saubere Rollen und Kategorien übernommen werden.</li>
                  <li><strong className="text-gray-200">Cross-Server Transfer:</strong> Erlaubt das Einspielen von Backups auf beliebigen anderen freigegebenen Servern.</li>
                  <li><strong className="text-gray-200">Wipe-Option:</strong> Bereinigt auf Wunsch alte Kanäle vor dem Setup für einen sauberen Neuanfang.</li>
                </ul>
              </li>
            </ul>
          </Section>

          {/* Level & Talk-Partner */}
          <Section id="level" title="Level-System & Talk-Partner Tracking" icon={Trophy}>
            <p>
              GLGBot belohnt aktive Community-Mitglieder im Chat und in Sprachkanälen mit XP und errechnet daraus
              automatisch Level und Server-Ränge:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Text-Chat XP:</strong> Jede Nachricht bringt zufällig 10–20 XP (mit 60
                Sekunden Cooldown zum Schutz vor Spam).
              </li>
              <li>
                <strong className="text-white">Voice-XP:</strong> Jede aktive Minute im Sprachkanal (nicht stummgestellt,
                nicht taub, nicht im AFK-Kanal) belohnt mit 5 XP.
              </li>
              <li>
                <strong className="text-white">Steilere XP-Kurve:</strong> Die Formel lautet{" "}
                <code className="text-xs bg-discord-dark px-1.5 py-0.5 rounded text-indigo-300">400 × Level^1.55 + 100</code>.
                Höhere Stufen erfordern kontinuierliche Aktivität und sind eine echte Auszeichnung.
              </li>
              <li>
                <strong className="text-white">Talk-Partner Tracking:</strong> Der Bot misst minütlich, wer mit wem in
                Sprachkanälen redet. Mit <Cmd>/voice-stats</Cmd> oder im Web-Dashboard unter Rangliste kannst du deine
                persönlichen Top Talk-Partner und die serverweiten Top-Duos ansehen!
              </li>
            </ul>
            <div className="flex gap-2 pt-1">
              <Link
                href="/stats"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-discord-blurple/20 text-indigo-300 hover:bg-discord-blurple/30 font-medium transition-colors"
              >
                <Trophy className="w-3.5 h-3.5" />
                Zur Live-Rangliste & Talk-Duos
              </Link>
            </div>
          </Section>

          {/* Support-Tickets */}
          <Section id="tickets" title="Support-Ticket System" icon={Ticket}>
            <p>
              Mit dem integrierten Ticket-System können Mitglieder per Knopfdruck private Support-Räume öffnen:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Ticket-Panel:</strong> Unter <Link href="/tickets" className="text-discord-blurple hover:underline">Support-Tickets</Link>{" "}
                kann mit einem Klick das Panel in #🎫・support gepostet werden.
              </li>
              <li>
                <strong className="text-white">Echtzeit Live-Sync im Web:</strong> Admins sehen offene Tickets im Webinterface
                mit 2-Sekunden Live-Sync. Eingehende Nachrichten, Embeds und Bilder aus Discord erscheinen sofort im Browser,
                und Antworten können direkt aus dem Webmodal in den Discord-Kanal gesendet werden.
              </li>
              <li>
                <strong className="text-white">Ticket schließen & Transkript:</strong> Beim Schließen wird ein vollständiges
                Text-Transkript gespeichert und der Kanal nach 5 Sekunden aufgeräumt.
              </li>
            </ul>
          </Section>

          {/* Regeln & Live-Regelwerk */}
          <Section id="regeln" title="Serverregeln & Freischaltung" icon={ScrollText}>
            <p>
              Hier findest du das offizielle, aktuell gültige Regelwerk unseres Discord-Servers.
              Diese Ansicht ist <strong>live mit dem Bot synchronisiert</strong> — wenn Administratoren Regeln im Dashboard
              oder über Befehle anpassen, wird der Inhalt hier sofort aktualisiert.
            </p>

            <DynamicRulesView />

            <div className="pt-3 border-t border-discord-border space-y-2">
              <p className="font-semibold text-white">Funktionsweise der Regel-Sperre</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Der Bot postet eure Regeln formatiert in <strong className="text-white">#regeln</strong> — mit einem
                grünen Button <strong>„Regeln akzeptieren“</strong>. Wer klickt, bekommt automatisch die{" "}
                <strong className="text-white">Gast-Rolle</strong> und sieht danach alle freigegebenen Kanäle.
                Ist die Regel-Sperre aktiv (<Cmd>/setup-rules lock</Cmd>), sehen neue Mitglieder ausschließlich den Regelkanal, bis sie die Regeln bestätigt haben.
              </p>
            </div>
          </Section>

          {/* Rollen */}
          <Section id="rollen" title="Rollen & Benachrichtigungen" icon={Shield}>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["@Gast", "Bekommt, wer die Regeln akzeptiert. Schaltet den Server frei."],
                ["bn.live", "Ping, wenn jemand aus der Community live geht. An/aus per Button in #berechtigungen."],
                ["bn.free", "Ping bei kostenlosen Spielen + Zugriff auf #free-games. An/aus per Button."],
                ["bn.gamenews", "Spiel-Updates & Patchnotes + Zugriff auf #game-news. An/aus per Button."],
                ["bn.treiber", "Neue Grafik- & Chipsatz-Treiber + Zugriff auf #treiber-news. An/aus per Button."],
                ["🔴 Live", "Bekommt nur, wer gerade live ist - wird automatisch vergeben und wieder entfernt."],
              ].map(([name, text]) => (
                <div key={name} className="p-4 rounded-xl bg-discord-dark border border-discord-border">
                  <p className="font-semibold text-white">{name}</p>
                  <p className="text-xs text-gray-400 mt-1">{text}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Voice */}
          <Section id="voice" title="Voice-Manager (Join to Create)" icon={Mic}>
            <p>
              Betritt jemand den <strong className="text-white">„Join to Create“-Kanal</strong>, erstellt der Bot sofort
              eine eigene Lobby („🔊・Lobby von Name“) und verschiebt die Person hinein. Ist die Lobby leer, wird sie
              automatisch gelöscht.
            </p>
            <p>
              Der Besitzer steuert seine Lobby über das Steuerungs-Panel im Voice-Chat oder mit <Cmd>/voice …</Cmd>:
              umbenennen, Personenlimit, sperren, verstecken, Bitrate und Besitz übertragen.
            </p>
            <Note type="warn">
              Discord erlaubt pro Kanal nur <strong>2 Umbenennungen in 10 Minuten</strong>. Wer öfter umbenennt, muss kurz warten.
            </Note>
          </Section>

          {/* Radio, Musik & Soundboard */}
          <Section id="radiomusik" title="Radio, Musik & Soundboard" icon={Music}>
            <p>
              Unter <Link href="/radio" className="text-discord-blurple hover:underline font-semibold">Radio & Musik</Link> im Web-Dashboard
              oder per Discord-Befehl streamst du werbefreie Webradios, YouTube-Musik und eigene Soundboard-Dateien:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-1">
              <li>
                <strong className="text-white">📻 4 strukturierte Dashboard-Tabs:</strong>
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400">
                  <li><strong className="text-gray-200">Radio-Sender:</strong> Sofortsuche, Sender-Kategorien (SUNSHINE LIVE, SomaFM, laut.fm, Eigene), URL-Audio-Probe und 1-Klick-Start.</li>
                  <li><strong className="text-gray-200">Soundboard & Musik:</strong> Live-Filter über alle Audio-Dateien, Ordner-Pills, Sofort-Abspielen, Download (⬇) und Drag & Drop in Playlisten.</li>
                  <li><strong className="text-gray-200">Upload-Zentrale:</strong> Drag & Drop Uploader (ganze Ordner werden automatisch als Playlist angelegt!) und DM-Upload-Code Generator.</li>
                  <li><strong className="text-gray-200">Playlisten & Queue:</strong> Eigene Playlisten erstellen, verwalten und sortieren; parallele Anzeige der Live-Warteschlange.</li>
                  <li><strong className="text-gray-200">Bot-Einstellungen:</strong> Anzeigename, dedizierter Worker-Status (PID, Uptime, Restarts, Start/Stop) und Token-Verwaltung für Multi-Bot Betrieb.</li>
                </ul>
              </li>
              <li>
                <strong className="text-white">🎛️ Persistenter Mini-Player:</strong> Die obere Player-Leiste zeigt immer den Live-Status (🟢 Läuft / ⏸️ Pausiert / ⚪ Bereit), ICY-Titel („Was läuft gerade“), den aktuellen Sprachkanal, Play/Pause/Stop und Lautstärke-Tasten (±10%).
              </li>
              <li>
                <strong className="text-white">🎙️ Intelligentes Audio-Ducking:</strong> Redet jemand im Sprachkanal, wird der Stream automatisch auf 35 % geduckt (-65 % Lautstärke). Nach dem Sprechen kehrt die Musik nach 800 ms sanft zur Originallautstärke zurück.
              </li>
              <li>
                <strong className="text-white">📻 Steuerpanel-Textkanäle & Auto-Cleanup:</strong> Mit <Cmd>/radio panel</Cmd> wird der Textkanal <Cmd>#📻・radio-steuerung</Cmd> und mit <Cmd>/music panel</Cmd> der Kanal <Cmd>#🎵・musik-steuerung</Cmd> bereitgestellt. Alle Klicks aktualisieren das Panel direkt im Embed ohne Pop-ups. Beliebige Textnachrichten in diesen Kanälen werden nach 2,5 Sekunden automatisch gelöscht, sodass der Kanal dauerhaft aufgeräumt bleibt.
              </li>
              <li>
                <strong className="text-white">⚡ Temporäre Sender-Kanäle & Auto-Cleanup:</strong> Klickst du im Dashboard auf <em>„+ Temp-Kanal“</em>, legt der Bot einen temporären Sprachkanal (<Cmd>📻・&lt;Sender&gt;</Cmd>) mit 120s Beitrittsfrist an. Wenn alle Personen den Kanal verlassen, läuft ein 60s Countdown ab, nach dem der Bot sich trennt und den Kanal automatisch wieder löscht.
              </li>
              <li>
                <strong className="text-white">💬 Discord-Befehle:</strong> <Cmd>/radio start</Cmd>, <Cmd>/radio panel</Cmd>, <Cmd>/music play &lt;suche|url|local:name&gt;</Cmd>, <Cmd>/music panel</Cmd> und <Cmd>/soundboard play &lt;sound&gt;</Cmd>.
              </li>
            </ul>
          </Section>

          {/* Live */}
          <Section id="live" title="Live-System (temporäre Live-Rolle & Kanal)" icon={Radio}>
            <p>
              Wer live ist, bekommt automatisch die <strong className="text-white">Live-Rolle</strong> und einen eigenen Kanal{" "}
              <strong className="text-white">„🔴・Name ist live“</strong> in der Kategorie „🔴 Live Streams“. Endet der Stream,
              verschwinden Rolle und Kanal wieder.
            </p>
            <p>Der Bot erkennt „live“ über Twitch/YouTube Stream-Alerts, Discord-Status („Streamt“) oder <Cmd>/twitch-live start</Cmd>.</p>
          </Section>

          {/* Alerts */}
          <Section id="alerts" title="Stream-Alerts (Twitch & YouTube)" icon={Bell}>
            <p>
              Unter <Link href="/live" className="text-discord-blurple hover:underline">Live-Streamer</Link> oder mit{" "}
              <Cmd>/streamer add</Cmd> trägst du Kanäle ein. Der Bot prüft jede Minute und postet einen Alert mit Titel,
              Spiel und Vorschaubild, sobald jemand live geht.
            </p>
          </Section>

          {/* Free-Games & Releases */}
          <Section id="freegames" title="Free-Games & Game-Release-Kalender" icon={Gift}>
            <p>
              Alles rund um Spiele-Schnäppchen und anstehende Veröffentlichungen:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Kostenlose Spiele:</strong> Der Bot prüft <strong className="text-white">alle 30 Minuten</strong>,
                ob es Spiele komplett kostenlos gibt (Epic Games Store, Steam, GOG, Prime) und postet neue Schnäppchen in <Cmd>#free-games</Cmd>.
              </li>
              <li>
                <strong className="text-white">1 Post pro Spiel mit Direkt-Buttons:</strong> Jedes Spiel erhält eine eigene Nachricht mit Enddatum, Beschreibung und Klick-Buttons direkt darunter: <strong className="text-indigo-300">„In Launcher öffnen“</strong> (startet direkt Steam/Epic), <strong className="text-indigo-300">„Im Browser öffnen“</strong> und Link zur Web-Übersicht.
              </li>
              <li>
                <strong className="text-white">Game-Release-Kalender:</strong> Unter <Link href="/releases" className="text-discord-blurple hover:underline">/releases</Link>{" "}
                oder mit <Cmd>/releases uebersicht</Cmd> siehst du alle kommenden Blockbuster, Triple-A Titel und großen
                Spiele-Updates/DLCs nach Monat und Plattform (PC, PS5, Xbox, Switch). Mit <Cmd>/releases post-woche</Cmd> kann
                das Team die Wochen-Releases im Chat ankündigen!
              </li>
            </ul>
          </Section>

          {/* Game-, Software- & Treiber-News */}
          <Section id="news" title="Game-, Software-, Hardware- & Treiber-News" icon={Newspaper}>
            <p>
              Unter <Link href="/news" className="text-discord-blurple hover:underline">News-Magazin</Link> wählst du
              Spiele, Software, NAS-Systeme und Treiberquellen aus. Der Bot postet Neuigkeiten vollautomatisch in die passenden Kanäle:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">🎮 Game-Updates & Patchnotes:</strong> Offizielle Patchnotes für beliebte Spiele
                (z. B. Palworld, Enshrouded, Satisfactory, Minecraft, CS2, Fortnite, Rust, GTA) in <Cmd>#game-news</Cmd> mit Rolle <Cmd>@bn.gamenews</Cmd>. Steam-Grafiken und BBCode werden automatisch bereinigt.
              </li>
              <li>
                <strong className="text-white">🖥️ Grafikkarten-Treiber:</strong> NVIDIA GeForce Game Ready, AMD Radeon Adrenalin und
                Intel Arc Grafiktreiber in <Cmd>#🖥️・treiber-software</Cmd> mit Rolle <Cmd>@bn.treiber</Cmd>.
              </li>
              <li>
                <strong className="text-white">💾 NAS-Betriebssysteme:</strong> Wichtige Updates für UGREEN NAS (Docker-Engine & UGOS Pro), Synology DSM, TrueNAS SCALE,
                Unraid OS und QNAP QTS.
              </li>
              <li>
                <strong className="text-white">⚙️ Tools, Codecs & Server-Software:</strong> CubeCoders AMP Game Server Manager,
                K-Lite Codec Pack / LAV Filters, OBS Studio und HandBrake.
              </li>
              <li>
                <strong className="text-white">📰 Technik- & Hardware-News:</strong> Im Web-Dashboard unter News gibt es einen eigenen Filter für Berichte von ComputerBase, Hardwareluxx, Heise Online, Golem.de und WinFuture.
              </li>
            </ul>
          </Section>

          {/* Silent Audit-Logs */}
          <Section id="audit" title="Silent Audit-Logs (Stille Benachrichtigungen)" icon={FileText}>
            <p>
              GLGBot überwacht sicherheitsrelevante Ereignisse auf dem Server und dokumentiert sie in einem internen
              Admin-Log-Kanal (<Cmd>#🛡️・audit-logs</Cmd>):
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Stille Benachrichtigungen:</strong> Alle Log-Nachrichten werden mit dem
                Discord-Flag <Cmd>SuppressNotifications</Cmd> versendet. Es gibt keine störenden Pings oder Benachrichtigungstöne.
              </li>
              <li>
                <strong className="text-white">Erfasser-Tracking:</strong> Der Bot ermittelt über das Discord-Audit-Log,{" "}
                <em>welcher Moderator oder Admin</em> eine Rolle vergeben, einen Kanal gelöscht oder die Servereinstellungen
                geändert hat.
              </li>
              <li>
                <strong className="text-white">Gefilterte Kategorien:</strong> Rollen, Kanäle, Servereinstellungen und
                Moderation können im Dashboard einzeln an- oder abgewählt werden.
              </li>
            </ul>
          </Section>

          {/* Moderations-Suite */}
          <Section id="moderation" title="Moderations-Suite & Fall-Management" icon={ShieldAlert}>
            <p>
              Vollständige Moderationswerkzeuge mit integriertem Fall-Tracking und Revisionssicherheit:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Strafen aussprechen:</strong> <Cmd>/warn</Cmd>, <Cmd>/timeout</Cmd>,{" "}
                <Cmd>/kick</Cmd> und <Cmd>/ban</Cmd> benachrichtigen das betroffene Mitglied automatisch per DM über den Grund
                und die Laufzeit.
              </li>
              <li>
                <strong className="text-white">Gefängnis-System (/knast):</strong> Mit <Cmd>/knast einsperren [User] [Grund] [Dauer]</Cmd>{" "}
                wird ein auffälliges Mitglied temporär isoliert: Sämtliche Server-Rollen werden entzogen und gesichert, der
                Nutzer wird in <Cmd>#gefängnis</Cmd> und <Cmd>#gefängnis-voice</Cmd> isoliert und verliert 1.000 XP. Nach
                Ablauf der Strafe (z. B. 60 Minuten) werden alle Rollen automatisch wiederhergestellt und der Nutzer wird zum
                Schutz der Community direkt in den AFK-Sprachkanal verschoben!
              </li>
              <li>
                <strong className="text-white">Fall-Verwaltung:</strong> Mit <Cmd>/cases user [user]</Cmd> sieht das Team
                sofort die gesamte Vorgeschichte eines Spielers.
              </li>
              <li>
                <strong className="text-white">Chat-Bereinigung:</strong> <Cmd>/clear 50</Cmd> bereinigt Spam blitzschnell
                (optional gefiltert nach einem bestimmten Nutzer).
              </li>
            </ul>
          </Section>

          {/* Befehle */}
          <Section id="befehle" title="Alle Befehle" icon={Terminal}>
            {COMMANDS.map((group) => (
              <div key={group.group} className="space-y-2">
                <p className="font-semibold text-white">{group.group}</p>
                <div className="overflow-x-auto rounded-xl border border-discord-border">
                  <table className="w-full text-sm">
                    <thead className="bg-discord-dark text-gray-400 text-xs">
                      <tr>
                        <th className="text-left font-medium px-4 py-2.5">Befehl</th>
                        <th className="text-left font-medium px-4 py-2.5">Was er macht</th>
                        <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">Wer darf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-discord-border">
                      {group.items.map(([cmd, text, who]) => (
                        <tr key={cmd}>
                          <td className="px-4 py-2.5 align-top"><Cmd>{cmd}</Cmd></td>
                          <td className="px-4 py-2.5 text-gray-300">{text}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap align-top">{who}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Section>

          {/* Probleme */}
          <Section id="probleme" title="Probleme & Lösungen" icon={Wrench}>
            {[
              [
                "Der Bot vergibt keine Rollen / sagt „Rolle konnte nicht vergeben werden“",
                "Die Bot-Rolle steht zu weit unten. In Discord unter Server-Einstellungen → Rollen die Bot-Rolle per Drag & Drop über alle Rollen ziehen, die er vergeben soll.",
              ],
              [
                "Slash-Befehle tauchen nicht auf",
                "Nach einem Update müssen die Befehle bei Discord neu registriert werden. Das macht der Bot beim Neustart oder über sync_server.bat. Danach Discord einmal mit Strg+R neu laden.",
              ],
              [
                "Im Dashboard steht „Der Bot ist nicht erreichbar“",
                "Prüfe auf dem Server mit „pm2 status“, ob discord-bot und discord-web online sind. Bei Bedarf mit „pm2 restart all“ neu starten.",
              ],
              [
                "Login: „Dir fehlen die Rechte“",
                "Du brauchst auf dem Discord-Server Administrator oder „Server verwalten“ - oder deine ID muss in DASHBOARD_USER_IDS in der .env hinterlegt sein.",
              ],
              [
                "Free-Games oder News werden nicht gepostet",
                "Prüfe unter Rollen & Rechte, ob der jeweilige Kanal zugewiesen ist und der Bot dort Schreibrechte besitzt.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl bg-discord-dark border border-discord-border">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-white font-medium">
                  <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform shrink-0" />
                  {q}
                </summary>
                <p className="px-4 pb-4 pl-10 text-gray-300">{a}</p>
              </details>
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}
