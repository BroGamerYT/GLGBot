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
} from "lucide-react";

export const metadata = { title: "Hilfe & Befehle | GLGBot Panel" };

const SECTIONS = [
  { id: "schnellstart", title: "Schnellstart", icon: Rocket },
  { id: "dashboard", title: "Dashboard & Login", icon: KeyRound },
  { id: "level", title: "Level & Talk-Partner", icon: Trophy },
  { id: "tickets", title: "Support-Tickets", icon: Ticket },
  { id: "regeln", title: "Regeln & Freischaltung", icon: ScrollText },
  { id: "rollen", title: "Rollen & Benachrichtigungen", icon: Shield },
  { id: "voice", title: "Voice-Manager", icon: Mic },
  { id: "live", title: "Live-System", icon: Radio },
  { id: "alerts", title: "Stream-Alerts", icon: Bell },
  { id: "freegames", title: "Free-Games", icon: Gift },
  { id: "news", title: "Game-News", icon: Newspaper },
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
      ["/rank [mitglied]", "Zeigt dein Level, aktuelle XP, Server-Rang und Fortschrittsbalken an.", "Alle"],
      ["/level status", "Dein Level-Status: Fortschritt und wie viele Nachrichten / Voice-Minuten bis zum nächsten Level fehlen (nur für dich sichtbar).", "Alle"],
      ["/leaderboard [kategorie]", "Zeigt die Top 10 Rangliste (Gesamt-XP, Voice-Minuten, Chat-Nachrichten).", "Alle"],
      ["/voice-stats [mitglied]", "Zeigt deine Voice-Aktivität, Online-Dauer und Top Talk-Partner.", "Alle"],
      ["/top-voice", "Rangliste der aktivsten Gesprächs-Duos und Voice-Nutzer auf dem Server.", "Alle"],
      ["/suggest [vorschlag]", "Reicht einen Server-Vorschlag mit Abstimmungs-Buttons im Feedback-Kanal ein.", "Alle"],
      ["/free-games list", "Zeigt alle aktuell kostenlosen Spiele (ephemeral, nur für dich sichtbar).", "Alle"],
      ["/ping", "Prüft die Latenz und Erreichbarkeit des Bots.", "Alle"],
      ["/twitch-live start | stop", "Sich selbst als live melden bzw. Live-Status vorzeitig beenden.", "Alle"],
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
      ["/knast einsperren | freilassen | liste", "Gefängnis: entzieht alle Rollen, sperrt alle Kanäle außer #gefängnis, -1.000 XP. Freilassen stellt die Rollen wieder her. (Englisches Discord: /prison)", "Mitglieder moderieren"],
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
          <Section id="dashboard" title="Dashboard & Öffentliche Seiten" icon={KeyRound}>
            <p>
              Das Dashboard bietet getrennte Bereiche für Admins und für die allgemeine Community:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Öffentlich erreichbar (ohne Login):</strong> Alle Mitglieder können{" "}
                <Link href="/hilfe" className="text-discord-blurple hover:underline">/hilfe</Link>,{" "}
                <Link href="/changelog" className="text-discord-blurple hover:underline">/changelog</Link> und die{" "}
                <Link href="/stats" className="text-discord-blurple hover:underline">/stats</Link> Ranglisten frei im Browser
                aufrufen.
              </li>
              <li>
                <strong className="text-white">Admin-Bereich (mit Login):</strong> Der Zugriff auf Ticket-Chats,
                Server-Backups, Logs und Bot-Konfiguration ist durch Discord-OAuth geschützt. Reinkommen der Server-Owner
                sowie Mitglieder mit Administrator-Rechten oder in <Cmd>DASHBOARD_USER_IDS</Cmd>.
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

          {/* Regeln */}
          <Section id="regeln" title="Regeln & Freischaltung" icon={ScrollText}>
            <p>
              Der Bot postet eure Regeln schön formatiert in <strong className="text-white">#regeln</strong> - mit einem
              grünen Button <strong>„Regeln akzeptieren“</strong>. Wer klickt, bekommt die{" "}
              <strong className="text-white">Gast-Rolle</strong> und sieht danach alle freigegebenen Kanäle.
            </p>
            <p className="font-semibold text-white">Regel-Sperre</p>
            <p>
              Ist die Sperre aktiv, sehen neue Mitglieder <strong>nur #regeln</strong>, bis sie die Regeln akzeptieren.
              Beim Einschalten bekommen alle, die schon auf dem Server sind, automatisch die Gast-Rolle.
            </p>
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

          {/* Free-Games */}
          <Section id="freegames" title="Free-Games" icon={Gift}>
            <p>
              Der Bot prüft <strong className="text-white">alle 30 Minuten</strong>, ob es Spiele komplett kostenlos gibt,
              und postet neue in den Free-Games-Kanal - mit Bild, altem Preis, Enddatum und Buttons für Steam / Epic Launcher.
            </p>
          </Section>

          {/* Game-News */}
          <Section id="news" title="Game-News (Updates & Treiber)" icon={Newspaper}>
            <p>
              Unter <Link href="/news" className="text-discord-blurple hover:underline">Game-News</Link> wählst du Spiele und
              Treiber aus. Der Bot postet neue Patchnotes und Treiberversionen (NVIDIA, AMD, Intel) automatisch.
            </p>
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
