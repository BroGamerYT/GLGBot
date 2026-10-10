import Link from "next/link";
import type { ReactNode } from "react";
import {
  LifeBuoy, Newspaper, Rocket, KeyRound, ScrollText, Shield, Mic, Radio, Bell, Gift, Terminal, Wrench, ChevronRight,
} from "lucide-react";

export const metadata = { title: "Hilfe | GLGBot Panel" };

const SECTIONS = [
  { id: "schnellstart", title: "Schnellstart", icon: Rocket },
  { id: "dashboard", title: "Dashboard & Login", icon: KeyRound },
  { id: "regeln", title: "Regeln & Freischaltung", icon: ScrollText },
  { id: "rollen", title: "Rollen & Benachrichtigungen", icon: Shield },
  { id: "voice", title: "Voice-Manager", icon: Mic },
  { id: "live", title: "Live-System", icon: Radio },
  { id: "alerts", title: "Stream-Alerts", icon: Bell },
  { id: "freegames", title: "Free-Games", icon: Gift },
  { id: "news", title: "Game-News", icon: Newspaper },
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
    group: "Für alle",
    items: [
      ["/ping", "Zeigt, wie schnell der Bot antwortet.", "Alle"],
      ["/free-games list", "Zeigt dir alle gerade kostenlosen Spiele (nur für dich sichtbar).", "Alle"],
      ["/voice lock | unlock", "Eigene Lobby sperren / wieder öffnen.", "Lobby-Besitzer"],
      ["/voice hide | unhide", "Eigene Lobby verstecken / wieder zeigen.", "Lobby-Besitzer"],
      ["/voice name | limit | bitrate", "Name, Personenlimit (0–99) oder Tonqualität ändern.", "Lobby-Besitzer"],
      ["/voice permit | reject", "Jemanden reinlassen bzw. rauswerfen und sperren.", "Lobby-Besitzer"],
      ["/voice transfer", "Lobby an jemanden in der Lobby übergeben.", "Lobby-Besitzer"],
      ["/voice claim", "Lobby übernehmen, wenn der Besitzer gegangen ist.", "Alle in der Lobby"],
      ["/twitch-live start | stop", "Sich selbst als live melden bzw. Live-Status beenden.", "Alle"],
    ],
  },
  {
    group: "Für Admins",
    items: [
      ["/setup-rules post", "Legt #regeln und #berechtigungen an und postet Regeln + Rollen-Panel neu.", "Administrator"],
      ["/setup-rules lock bestaetigen:True", "Regel-Sperre einschalten: nur Freigeschaltete sehen den Server.", "Administrator"],
      ["/setup-rules unlock", "Regel-Sperre wieder aufheben.", "Administrator"],
      ["/setup-roles auto", "Erstellt fehlende Rollen (Gast, bn.live, bn.free, Live) und #free-games.", "Rollen verwalten"],
      ["/setup-roles set", "Rollen und Free-Games-Kanal von Hand zuweisen.", "Rollen verwalten"],
      ["/setup-roles panel | status", "Rollen-Panel in einen Kanal posten / Einstellungen anzeigen.", "Rollen verwalten"],
      ["/setup-voice set | status | disable", "Join-to-Create-Kanal festlegen, anzeigen, abschalten.", "Kanäle verwalten"],
      ["/voice-panel", "Steuerungs-Panel für Lobbys in den aktuellen Kanal posten.", "Kanäle verwalten"],
      ["/setup-live set | status | disable", "Live-System einrichten (Live-Rolle, Kategorie, Kanal-Art).", "Kanäle verwalten"],
      ["/streamer add | edit | remove", "Streamer für Live-Alerts hinzufügen, ändern, entfernen.", "Kanäle verwalten"],
      ["/streamer list | check", "Alle Streamer anzeigen / sofort auf Live-Status prüfen.", "Kanäle verwalten"],
      ["/free-games post", "Neue Gratis-Spiele sofort posten (erneut:True = alle nochmal, ohne Ping).", "Server verwalten"],
      ["/free-games einstellungen", "Stores an/aus (Epic, Steam, GOG, andere, Epic-Vorschau).", "Server verwalten"],
      ["/dm", "Private Nachricht im Namen des Servers an ein Mitglied senden.", "Nachrichten verwalten"],
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-sky-400" />
          Hilfe & Anleitung
        </h1>
        <p className="text-gray-400 text-sm mt-1">Alles, was GLGBot kann - und wie du es einrichtest.</p>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* Inhaltsverzeichnis */}
        <nav className="hidden lg:block">
          <div className="sticky top-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold px-3 mb-2">Inhalt</p>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-discord-card transition-all">
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
                  <strong className="text-white">Bot-Rolle nach oben schieben.</strong> In Discord unter <em>Server-Einstellungen → Rollen</em> muss die Rolle des Bots{" "}
                  <strong>über</strong> der Gast-, Live- und den Benachrichtigungs-Rollen stehen. Sonst darf der Bot diese Rollen nicht vergeben.
                </>,
                <>
                  <strong className="text-white">Rollen anlegen:</strong> Unter <Link href="/roles" className="text-discord-blurple hover:underline">Rollen & Rechte</Link> auf
                  „Rollen automatisch erstellen“ klicken (oder <Cmd>/setup-roles auto</Cmd>).
                </>,
                <>
                  <strong className="text-white">Regeln posten:</strong> Unter <Link href="/rules" className="text-discord-blurple hover:underline">Regeln</Link> Text prüfen und
                  „In Discord posten“ klicken. Dabei entstehen #regeln und #berechtigungen.
                </>,
                <>
                  <strong className="text-white">Regel-Sperre aktivieren</strong> (optional): Danach sehen neue Mitglieder nur #regeln, bis sie die Regeln akzeptieren.
                </>,
                <>
                  <strong className="text-white">Voice einrichten:</strong> Unter <Link href="/voice" className="text-discord-blurple hover:underline">Voice-Manager</Link> den
                  „Join to Create“-Kanal auswählen.
                </>,
                <>
                  <strong className="text-white">Live & Free-Games:</strong> Unter <Link href="/live" className="text-discord-blurple hover:underline">Live-Streamer</Link> Streamer
                  eintragen und unter <Link href="/free-games" className="text-discord-blurple hover:underline">Free-Games</Link> die Stores auswählen.
                </>,
              ]}
            />
          </Section>

          {/* Dashboard */}
          <Section id="dashboard" title="Dashboard & Login" icon={KeyRound}>
            <p>
              Das Dashboard ist nur nach dem Login mit Discord erreichbar. Reinkommen der <strong className="text-white">Server-Owner</strong> und alle Mitglieder mit der
              Berechtigung <strong className="text-white">Administrator</strong> oder <strong className="text-white">Server verwalten</strong>.
            </p>
            <p>
              Weitere Personen kannst du in der <code>.env</code> freischalten: <code>DASHBOARD_ROLE_IDS</code> (Rollen-IDs) oder <code>DASHBOARD_USER_IDS</code>{" "}
              (Nutzer-IDs), jeweils mit Komma getrennt. Ein Login gilt 24 Stunden, abmelden kannst du unten in der Seitenleiste.
            </p>
            <Note type="tip">
              Eine Discord-ID bekommst du, indem du in Discord unter <em>Einstellungen → Erweitert</em> den <strong>Entwicklermodus</strong> einschaltest und dann per Rechtsklick
              auf eine Person oder Rolle „ID kopieren“ wählst.
            </Note>
          </Section>

          {/* Regeln */}
          <Section id="regeln" title="Regeln & Freischaltung" icon={ScrollText}>
            <p>
              Der Bot postet eure Regeln schön formatiert in <strong className="text-white">#regeln</strong> - mit einem grünen Button <strong>„Regeln akzeptieren“</strong>. Wer
              klickt, bekommt die <strong className="text-white">Gast-Rolle</strong> und sieht danach alle Kanäle, auch <strong className="text-white">#berechtigungen</strong> mit
              den Benachrichtigungs-Buttons.
            </p>
            <p className="font-semibold text-white">Regeln bearbeiten</p>
            <p>
              Auf der Seite{" "}
              <Link href="/rules" className="text-discord-blurple hover:underline">Regeln</Link> kannst du Überschrift, Einleitung, jede einzelne Regel (Emoji, Titel, Text),
              Reihenfolge und Schlusswort ändern. Unter „Vorschau“ siehst du, wie es in Discord aussieht. Nach dem Speichern auf <strong>„In Discord posten“</strong> klicken - die
              alte Regel-Nachricht des Bots wird dabei ersetzt.
            </p>
            <p>Platzhalter im Text:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><Cmd>{"{server}"}</Cmd> - der Servername</li>
              <li><Cmd>{"{@mops4ever}"}</Cmd> - wird zur anklickbaren Erwähnung dieses Mitglieds (Benutzername, Anzeigename oder Nickname)</li>
              <li><Cmd>{"{permissions}"}</Cmd> - Link zum #berechtigungen-Kanal</li>
            </ul>
            <p className="font-semibold text-white">Regel-Sperre</p>
            <p>
              Ist die Sperre aktiv, sehen neue Mitglieder <strong>nur #regeln</strong>, bis sie die Regeln akzeptieren. Beim Einschalten bekommen alle, die schon auf dem Server
              sind, automatisch die Gast-Rolle - es wird also niemand ausgesperrt. Aufheben geht jederzeit mit einem Klick.
            </p>
            <Note type="info">
              <strong>Pop-up beim Beitreten:</strong> Ein Bot darf beim Beitreten kein eigenes Fenster öffnen. Discord hat dafür aber das <strong>Regel-Screening</strong>:
              <em> Server-Einstellungen → Community aktivieren → Onboarding/Sicherheitseinrichtung → Mitgliedschaftsregeln</em>. Bestätigt jemand dieses Pop-up, vergibt der Bot die
              Gast-Rolle automatisch. Zusätzlich schickt der Bot jedem neuen Mitglied eine Willkommens-DM mit einem Link zu #regeln.
            </Note>
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
            <p>
              Welche Discord-Rolle welche Aufgabe hat, stellst du unter <Link href="/roles" className="text-discord-blurple hover:underline">Rollen & Rechte</Link> ein. Dort legst du
              auch den Free-Games-Kanal fest.
            </p>
          </Section>

          {/* Voice */}
          <Section id="voice" title="Voice-Manager (Join to Create)" icon={Mic}>
            <p>
              Betritt jemand den <strong className="text-white">„Join to Create“-Kanal</strong>, erstellt der Bot sofort eine eigene Lobby
              („🔊・Lobby von Name“) und verschiebt die Person hinein. Ist die Lobby leer, wird sie automatisch gelöscht.
            </p>
            <p>
              Der Besitzer steuert seine Lobby über das <strong className="text-white">Steuerungs-Panel</strong> im Chat der Lobby oder mit <Cmd>/voice …</Cmd>: umbenennen
              (auch auf das gerade gespielte Spiel), Personenlimit, sperren, verstecken, Leute reinlassen oder rauswerfen, eigener Textkanal und Besitz übergeben.
            </p>
            <Note type="warn">
              Discord erlaubt pro Kanal nur <strong>2 Umbenennungen in 10 Minuten</strong>. Wer öfter umbenennt, muss kurz warten.
            </Note>
          </Section>

          {/* Live */}
          <Section id="live" title="Live-System (temporäre Live-Rolle & Kanal)" icon={Radio}>
            <p>
              Wer live ist, bekommt automatisch die <strong className="text-white">Live-Rolle</strong> und einen eigenen Kanal <strong className="text-white">„🔴・Name ist live“</strong> in
              der Kategorie „🔴 Live Streams“. Endet der Stream, verschwinden Rolle und Kanal wieder.
            </p>
            <p>Der Bot erkennt „live“ auf vier Wegen:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-white">Discord-Status</strong> zeigt „Streamt“ (Twitch/YouTube mit Discord verknüpft) - wenn „Auto-Erkennung“ an ist</li>
              <li><strong className="text-white">Stream-Alert</strong> mit verknüpftem Discord-Mitglied meldet „live“ (siehe unten)</li>
              <li><Cmd>/twitch-live start</Cmd> - selbst melden, beenden mit <Cmd>/twitch-live stop</Cmd></li>
              <li>Ein Admin vergibt die Live-Rolle von Hand</li>
            </ul>
            <p>
              Rolle und Kanal bleiben, <strong>solange mindestens einer dieser Wege „live“ meldet</strong>. Wechselt z. B. dein Discord-Status, während du laut Twitch noch live bist,
              bleibt alles bestehen.
            </p>
          </Section>

          {/* Alerts */}
          <Section id="alerts" title="Stream-Alerts (Twitch & YouTube)" icon={Bell}>
            <p>
              Unter <Link href="/live" className="text-discord-blurple hover:underline">Live-Streamer</Link> oder mit <Cmd>/streamer add</Cmd> trägst du Twitch- oder
              YouTube-Kanäle ein. Der Bot prüft jede Minute und postet einen Alert mit Titel, Spiel und Vorschaubild, sobald jemand live geht.
            </p>
            <p>Eigener Text mit Platzhaltern:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><Cmd>{"{streamer}"}</Cmd> Name · <Cmd>{"{game}"}</Cmd> Spiel · <Cmd>{"{title}"}</Cmd> Stream-Titel · <Cmd>{"{url}"}</Cmd> Link</li>
              <li><Cmd>{"{ping}"}</Cmd> bestimmt, wo die Ping-Rolle steht (sonst ganz vorne)</li>
            </ul>
            <p className="font-semibold text-white">Nur ein Alert pro Stream</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Kurze Abbrüche oder Neustarts des Streams lösen keinen zweiten Alert aus.</li>
              <li>Als offline gilt ein Stream erst nach <strong>5 Minuten</strong> ohne Signal.</li>
              <li>Pro Streamer höchstens <strong>ein Alert in 30 Minuten</strong>.</li>
              <li>Angekündigte (geplante) YouTube-Streams zählen nicht als live.</li>
            </ul>
            <Note type="tip">
              Verknüpfst du einen Streamer mit einem <strong>Discord-Mitglied</strong>, bekommt diese Person beim Stream-Start automatisch die Live-Rolle und ihren Live-Kanal.
            </Note>
          </Section>

          {/* Free-Games */}
          <Section id="freegames" title="Free-Games" icon={Gift}>
            <p>
              Der Bot prüft <strong className="text-white">alle 30 Minuten</strong>, ob es Spiele komplett kostenlos gibt, und postet neue in den Free-Games-Kanal - mit Bild, altem
              Preis, Enddatum und einem Button „Kostenlos sichern“.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-white">Epic Games</strong> kommt direkt von Epic (optional mit Vorschau „Nächste Woche gratis“).</li>
              <li><strong className="text-white">Steam, GOG</strong> und weitere Stores kommen von GamerPower.</li>
              <li>Nur Vollversionen - keine DLCs oder Ingame-Items. Jedes Spiel wird nur einmal gepostet.</li>
              <li>Mehrere Spiele kommen gesammelt in <strong>einer</strong> Nachricht - nur die erste macht einen Ton, weitere gehen lautlos raus.</li>
              <li>Die Buttons <strong>„In Steam öffnen“</strong> / <strong>„Im Epic Launcher öffnen“</strong> öffnen direkt die App (dein Browser fragt einmal kurz nach).</li>
              <li><strong>Key-Verlosungen</strong> (Alienware Arena, IndieGala & Co. - dort braucht man ein Konto) sind standardmäßig ausgeblendet.</li>
            </ul>
            <p>
              Welche Stores gemeldet werden, stellst du unter <Link href="/free-games" className="text-discord-blurple hover:underline">Free-Games</Link> ein. Dort siehst du auch
              alle aktuellen Angebote und kannst sofort posten.
            </p>
          </Section>

          {/* Game-News */}
          <Section id="news" title="Game-News (Updates & Treiber)" icon={Newspaper}>
            <p>
              Unter <Link href="/news" className="text-discord-blurple hover:underline">Game-News</Link> wählst du Spiele und Treiber aus. Der Bot prüft alle{" "}
              <strong className="text-white">15 Minuten</strong> und postet neue Beiträge in den gewählten Kanal - optional mit Ping-Rolle.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-white">Spiele:</strong> Ankündigungen und Patchnotes von Steam (z. B. GTA V, CS2, Rust). Mit „Nur Patchnotes“ kommen nur Updates.</li>
              <li><strong className="text-white">Minecraft:</strong> neue Versionen der Java Edition, auf Wunsch auch Snapshots.</li>
              <li><strong className="text-white">Grafikkarten:</strong> NVIDIA GeForce, AMD Radeon und Intel Arc.</li>
              <li><strong className="text-white">CPU / Chipsatz:</strong> AMD Ryzen Chipsatz-Treiber (AM4 & AM5).</li>
              <li><strong className="text-white">Eigene Steam-Spiele:</strong> Steam-Store-Link oder App-ID einfügen, „Suchen“ und hinzufügen.</li>
            </ul>
            <p>
              Mit <strong>„Rollen & Kanäle anlegen“</strong> erstellt der Bot <strong>bn.gamenews</strong> + <strong>#📰・game-news</strong> für Spiele und{" "}
              <strong>bn.treiber</strong> + <strong>#🖥️・treiber-news</strong> für Treiber - getrennt, jeder Kanal nur mit der passenden Rolle sichtbar. Ein Klick auf eine Kachel zeigt, <strong>was enthalten ist</strong>, und die letzten echten Beiträge.
            </p>
            <p>
              Beim Hinzufügen wird nichts Altes gepostet - nur was ab dann neu erscheint. Mit dem <strong>Senden-Symbol</strong> kannst du den neuesten Beitrag sofort zum
              Testen posten (ohne Ping).
            </p>
            <Note type="info">
              Quellen mit <strong>Beta</strong>-Kennzeichnung (AMD, Intel) liest der Bot direkt von den Hersteller-Webseiten. Ändern die ihre Seite, kann die Meldung ausfallen,
              bis der Bot angepasst ist.
            </Note>
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
                "Nach einem Update müssen die Befehle bei Discord neu registriert werden. Das macht sync_server.bat automatisch (Option 1 → „J“). Danach Discord einmal neu laden (Strg+R).",
              ],
              [
                "Im Dashboard steht „Der Bot ist nicht erreichbar“",
                "Der Bot läuft nicht oder ist nicht auf dem neuesten Stand. Auf dem Server mit „pm2 status“ prüfen und mit „pm2 restart discord-bot“ neu starten.",
              ],
              [
                "Login: „Dir fehlen die Rechte“",
                "Du brauchst auf dem Discord-Server Administrator oder „Server verwalten“ - oder deine ID muss in DASHBOARD_USER_IDS stehen.",
              ],
              [
                "Regel-Sperre lässt sich nicht aktivieren",
                "Die Seite „Regeln“ zeigt den Grund an. Meist fehlt der Bot-Rolle „Kanäle ansehen“/„Rollen verwalten“ oder sie steht unter der Gast-Rolle.",
              ],
              [
                "Ein Streamer wird nicht als live erkannt",
                "Kanalnamen prüfen (Twitch: der Name aus der URL, YouTube: der @Handle). Mit /streamer check sofort prüfen. Twitch/YouTube können kurz nicht erreichbar sein - dann wird nichts geändert.",
              ],
              [
                "Free-Games werden nicht gepostet",
                "Unter „Rollen & Rechte“ muss ein Free-Games-Kanal gesetzt sein und der Bot muss dort schreiben dürfen. Unter „Free-Games“ prüfen, ob die Stores eingeschaltet sind.",
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
