# 📋 GLGBot & Web-Dashboard – To-Do & Roadmap

Zentrale Übersicht aller geplanten Features, Verbesserungen und Erweiterungen für den GLGBot und das Web-Dashboard.

**Aktueller Stand:** v2.28.0 (siehe History ganz unten)

> ✅ **Grundsatz-Entscheidung getroffen (11.10.2026):** Ein Bot bedient **mehrere Server, maximal 5**, und nur Server auf einer **Freigabe-Liste** (Details: Punkt 16). Das Open-Source-Modell bleibt parallel bestehen – jeder kann den Bot weiterhin selbst hosten.
> 👉 **Neue Features ab jetzt immer mit `guildId` bauen** (Einstellungen pro Server speichern, nie `GUILD_ID` fest verwenden), damit sie beim Umbau nicht nochmal angefasst werden müssen.

> **Offen:** Punkte 22–26 sowie die nicht abgehakten Technik-Schulden. Die Punkte 1–21 und das Musik-System (Phase 1–2) sind abgeschlossen; die offenen Vorhaben sind noch nicht untereinander priorisiert.

---

## ✅ Abgeschlossen: Kernfeatures (Punkte 1–3)

### 1. 🎁 Free Games & Game News öffentlich (Read-Only ohne Login) ✅ v2.7.0
* [x] **Middleware & Routen:**
  * [x] `/free-games` und `/news` in `web/src/middleware.ts` zu den öffentlichen Seiten (`isPublicPage`) hinzufügen.
  * [x] GET-Endpunkte `GET /api/bot/free-games` und `GET /api/bot/news` für Gäste freigeben (`isPublicApi`).
* [x] **UI-Anpassungen:**
  * [x] Login-Status im Client über `GET /api/auth/me` prüfen (es gibt kein `useSession` – das gehört zu NextAuth) in `web/src/app/free-games/page.tsx` und `web/src/app/news/page.tsx`.
  * [x] **Gast-Modus:** Alle Spiele-Karten, Filter, Countdowns, Store-Links und Treiber-Updates anzeigen.
  * [x] **Admin-Controls verbergen:** Buttons zum Manuellen Posten in Discord, Feed-Verwaltung und Webhook-Settings nur für eingeloggte Admins sichtbar machen.
  * [x] Öffentliche Navigation in Kopfzeile (`Header`) für Gäste um Free Games & News ergänzen.

---

### 2. 📅 Game Release Kalender (`/releases` & `/kalender`) ✅ v2.16.0
* [x] **Backend & Datenservice:**
  * [x] Neuer Service `src/services/releaseService.ts` mit kuratierter Release-Liste oder API-Anbindung.
  * [x] Speicherung von Titel, Release-Datum, Plattformen (PC, PS5, Xbox Series X/S, Switch, Game Pass), Genre, Store- und Trailer-Links.
  * [x] Interne Bot-API `GET /releases` und `POST /releases` (im Dashboard über `/api/bot/releases`, für manuelle Admin-Einträge).
* [x] **Web-Dashboard:**
  * [x] Neue öffentliche Seite `web/src/app/releases/page.tsx`.
  * [x] Timeline- und Monats-Ansicht (Kommende Wochen / Dieser Monat / Nächster Monat / Später).
  * [x] Filter nach Plattform (PC, PlayStation, Xbox, Nintendo, Game Pass Day One).
  * [x] Detail-Karten mit Cover, Release-Countdown und Vorbestell-/Store-Links.
* [x] **Discord Slash-Command:**
  * [x] Befehl `/releases` (Optionen: `zeitraum: diese_woche | dieser_monat | naechster_monat`, `plattform: alle | pc | console`).
  * [x] Elegantes Discord-Embed mit Verlinkung zum Web-Kalender.
* [x] **Automatischer Wochen-Scheduler:**
  * [x] Montags-Post um 10:00 Uhr im Game-News-Kanal mit den wichtigsten Releases der laufenden Woche.

---

### 3. 🏆 Level-Rollen-Belohnungen (Automatische Meilensteine) ✅ v2.9.0
* [x] **Bot-Levelsystem (`statsService.ts`):**
  * [x] Konfigurationsfeld `roleRewards: Record<number, string>` (Level -> Discord-Rollen-ID) in der Guild-Config speichern.
  * [x] Level-Up-Handler erweitern: Prüfen, ob für das erreichte Level eine Belohnungs-Rolle hinterlegt ist.
  * [x] Automatische Zuweisung der Discord-Rolle an das Mitglied.
  * [x] Glückwunsch-Nachricht im Chat oder konfigurierten Ankündigungskanal mit Erwähnung der neuen Rolle.
* [x] **Web-Dashboard (`/stats`):** *(v2.9.0)*
  * [x] Einstellungs-Reiter „Rollen-Belohnungen“ im Stats-Konfigurationsbereich.
  * [x] Interaktive Zuweisungs-Tabelle: Level auswählen (z. B. 5, 10, 15, 20, 25) und Server-Rolle aus Dropdown zuordnen.
  * [x] Speichern über `/api/bot/stats/config` mit Prüfung (Rolle unter Bot-Rolle, keine Admin-Rechte ohne Admin).
* [x] **Retroaktive Nachrüstung:**
  * [x] Befehl `/level sync-roles`, um bestehenden Mitgliedern nachträglich die ihren Leveln entsprechenden Rollen zuzuweisen.

---

## ✅ Abgeschlossen: Community- & Interaktions-Features (Punkte 4–9)

### 4. 🔴 „Gerade Live“-Widget auf der Dashboard-Startseite ✅ v2.7.0
* [x] Live-Banner auf der Dashboard-Startseite `web/src/app/page.tsx`.
* [x] Zeigt aktuell aktive Streamer aus der Community in Echtzeit an (Twitch/YouTube/Voice).
* [x] Anzeige mit Avatar, Stream-Titel, Spiel und 1-Klick-Direktlink zum Stream.

---

### 5. 🎁 `/daily` Belohnungs- & Streak-System ✅ v2.7.0
* [x] Täglicher Belohnungs-Befehl `/daily` für Mitglieder.
* [x] Feste Basis-XP (z. B. +50 XP) plus ansteigender Streak-Bonus (z. B. Tag 2: +60 XP, Tag 7: +200 XP).
* [x] 24h-Cooldown mit 36h-Kulanzfenster für Streaks.
* [x] Hinweis: `/daily` steht auch in Punkt 15 (Economy) – **ein** gemeinsamer Befehl: erst XP, später zusätzlich Coins.
* [x] Streak-Anzeige im Rang-Befehl `/rank`.
* [x] Streak-Anzeige im Dashboard-Profil (`/stats`) *(v2.9.0)*.

---

### 6. 🎉 Giveaway-System (`/giveaway`) ✅ v2.7.0
* [x] Befehle:
  * [x] `/giveaway start <dauer> <gewinner_anzahl> <preis> [rolle]`
  * [x] `/giveaway end <message_id>`
  * [x] `/giveaway reroll <message_id>`
* [x] Interaktives Embed mit „🎉 Teilnehmen“-Button, Teilnehmerzähler in Echtzeit und Live-Countdown.
* [x] Automatische Zufallsziehung bei Ablauf mit Gewinner-Benachrichtigung und Audit-Log.
* [x] Optional: Rollen-Voraussetzung (z. B. nur für Level 5+ oder bestimmte Community-Rollen).

---

### 7. 🖼️ Grafische Rangkarte (Canvas / SVG) ✅ v2.12.0
> Zusammen mit Punkt 12 (Willkommens-Karten) bauen – beide brauchen dieselbe Bild-Bibliothek (z. B. `@napi-rs/canvas`).

* [x] Visuelle Rank-Card bei `/rank` statt reinem Text-Embed:
  * [x] Nutzer-Avatar (Online-Status-Punkt weggelassen - Discord liefert ihn nicht zuverlässig).
  * [x] Aktuelles Level & Ranglistenplatz (#1, #2, ...).
  * [x] Visueller Fortschrittsbalken mit XP bis zum nächsten Level.
  * [x] Community-Badges / Meilensteine auf der Karte (👑 Inhaber, 🛡️ Team, 💎 Level, 💬 Talker, 🎙️ Voice, 🔥 Streak, 🪙 Tycoon).

---

### 8. 🌐 TeamSpeak- & Game-Server Status-Widget ✅ v2.13.0
* [x] Live-Status-Abfrage für eigene Game-Server (TeamSpeak 3 / CS2 / Minecraft / etc.) – Server-Adressen im Dashboard einstellbar.
* [x] Anzeige im Web-Dashboard (Online-Status, Spieleranzahl, IP zum Kopieren).
* [x] Discord-Slash-Befehl `/serverstatus` mit Live-Embed.

---

### 9. 🛡️ Erweiterter Auto-Mod & Anti-Spam ✅
* [x] Automatische Erkennung und Löschung von unerlaubten Discord-Einladungslinks fremder Server *(gibt es schon in `blacklistService.ts`)*.
* [x] Mass-Mention-Schutz (>5 Mentions = Auto-Löschung + 10 Min. Timeout) *(v2.7.0)*.
* [x] Verknüpfung mit dem Levelsystem: Automatische Strafpunkte (-XP) bei moderativen Vorfällen *(Warn, Timeout, Knast, Kick, Ban, Wortfilter - einstellbar unter Level-Einstellungen)*.

---

## ✅ Abgeschlossen: Musiksystem Phase 1–3 – Web-Radio + YouTube Queue + Web-Dashboard
> **Status:** Discord-Slash-Commands `/radio` und `/music`, YouTube-Suche mit Queue, Web-Dashboard Radio-Seite mit Sender-Auswahl und Live-Anzeige.
* [x] Web-Radio mit undici HTTP Streams (Icecast/Shoutcast)
* [x] SQLite Queue (persistente Warteschlange über Bot-Neustarts)
* [x] Discord Integration: /radio start <url>, stop, pause, resume, skip, queue
* [x] Web-Dashboard API: Live-Metadaten, URL-Test, MP3-Upload
* [x] YouTube-Suche & Queue-System (`/music play|skip|stop|pause|resume|queue|shuffle|remove|volume|nowplaying`)
* [x] Web-Dashboard Radio-Seite (`/radio`) mit Sender-Auswahl, Live-Anzeige und Bot-Steuerung
* [x] Musik-Setup-Modul: Automatische "Musik"-Kategorie mit Voice-Channel beim Server-Setup
* [x] Mini-Musik-Bot (`musicbot/`, eigener Token, vom GLGBot verwaltet): Auto-Kategorie + Sender-Kanäle (384 kbps), Auto-Play aller aktiven Sender, ICY-Status, Reconnect, Panel + `/musik`, Kanal-Wiederherstellung, Dashboard-Steuerung
* [x] `/music loop` (aus/Song/Queue), Now-Playing Steuer-Buttons (⏸️/▶️/⏭️/⏹️/🔀)
* [x] `MUSIC_MODE` Schalter (`embedded`/`disabled`, `.env` + `.env.example`)
* [x] Stream-URL-Härtung: SSRF-Schutz (keine privaten/lokalen Hosts) + Erreichbarkeits-Test
* [x] Radio Auto-Resume nach Bot-Neustart (`data/radio_state.json`)
* [x] ICY-Titelanzeige „Was läuft gerade“ (Bot + Dashboard, 60s-Refresh)
* [ ] Phase 4 (TODO): Spotify/YouTube via Lavalink
* [ ] Phase 3 (TODO): Cover-Art + DM-Uploads (React-Komponente unter `/radio` ist fertig)

> **Architektur-Ziel & Strategie-Update:**
> * **Empfohlene Reihenfolge:** Fokus auf **Modus B (Embedded)** und extrem stabile Audio-Quellen:
>   1. **📻 24/7 Web-Radio:** Direkte Icecast/Shoutcast/MP3-Livestreams (Lofi, Gaming-Radio, TechnoBase etc.) ohne anfällige Scraping-Verbindungen.
>   2. **📁 Lokales Soundboard & MP3-Upload:** Eigene MP3s über das Web-Dashboard hochladen oder kurze Sounds im Voice abspielen (`/soundboard`).
>   3. **YouTube/Spotify:** Nur optional über externe Lavalink-Instanz mit Cookie-Support, da YouTube Standalone-Bots und Server-IPs blockiert.

* [x] **Konfiguration & Modus-Auswahl (`.env`):**
  * [x] Schalter `MUSIC_MODE: "embedded" | "disabled"` (Standard `embedded`).
  * [x] Im Embedded-Modus: Haupt-Bot verbindet sich direkt in den Voice-Kanal via `@discordjs/voice`.
* [x] **Audio-Engine & Quellen:**
  * [x] **📻 24/7 Web-Radio:** Direkte Icecast-/Shoutcast-/MP3-Streams abspielen, z. B. `https://stream.laut.fm/hardtekk-radio`; keine YouTube-Scraping-Quelle voraussetzen.
  * [x] Sender pro Server (`guildId`) speichern: Anzeigename, Stream-URL, Discord-Voice-Kanal, Nutzerlimit und Aktiv-Status (`data/radio_config.json`).
  * [x] **Web-Dashboard `/radio`:** Radiosender hinzufügen, bearbeiten und entfernen; URL testen; Kanal und Nutzerlimit einstellen; mit „Erstellen & starten“ die Radio-Konfiguration speichern, einen passenden Voice-Kanal `📻・<Sendername>` mit dem gewählten Nutzerlimit erstellen oder auswählen und den Bot mit dem Stream verbinden.
  * [x] Bestehende Voice-Kanäle optional auswählen; vor dem Anlegen auf Namenskonflikte prüfen. Der Bot erstellt keinen separaten Bot-Account, sondern nutzt seine Voice-Verbindung.
  * [x] **Live-Übersicht „Was läuft gerade?“:** ICY-/Icecast-Metadaten (Titel/Interpret) regelmäßig auslesen und in `/radio` anzeigen; bei Streams ohne Metadaten Sendername und Verbindungsstatus zeigen.
  * [x] Discord-Status im Voice-Kanal bei Titelwechsel aktuell halten (nur bei Änderung, Rate-Limit-schonend).
  * [x] **Discord-Befehle:** `/radio add|remove|list`, `/radio start <url>`, `/radio stop|pause|resume|status`; Verwaltung mit `MoveMembers`-Recht.
  * [x] Stream-URL strikt validieren (nur HTTP(S), Timeouts und Redirects begrenzen, lokale/private Ziele blockieren) und unerreichbare oder ungültige Streams verständlich melden.
  * [x] Radio-Verbindung nach Bot-Neustart anhand der Server-Konfiguration wiederherstellen; Stoppen/Entfernen muss die Voice-Verbindung sauber trennen.
  * [x] **📁 Lokale Dateien & Soundboard:**
    * [x] Musik-Verzeichnis auf dem Server (`data/music/`, max. 25 MB, MP3/WAV/OGG/M4A).
    * [x] Soundboard-Modus für kurze Community-Sounds (`/soundboard list|play`).
    * [x] Sound-Bibliothek im Dashboard (`/radio`) einsehbar (inkl. Ordner).
    * [x] Unterordner in `data/music/` + Sound-Dropdown im Musik-Panel zur Einzelauswahl.
    * [x] Wiedergabe lokaler MP3s als Musik-Queue (`/music play local:<dateiname>`).
    * [x] Dashboard-Upload (Typ/Größe/Duplikat geprüft, Drag & Drop, Mehrfach-Upload) und DM-Upload per Einmal-Code (`MUS-XXXXXX`, 10 Min., nur Owner/Admins).
    * [x] Download pro Sound und Playlisten (erstellen, Drag-&-Drop-Sortierung, „Alle abspielen“).
    * [ ] Speicherquote pro Server und Duplikat-Verwaltung (noch offen).
  * [ ] **🎵 Spotify-Metadaten:** Metadaten-Auflösung via Spotify Web API (braucht API-Credentials).
  * [ ] **🎥 YouTube / Lavalink:** Optionale externe Lavalink-Verbindung mit Cookie-Fallback (braucht Lavalink-Server).
* [x] **Discord Slash-Commands:**
  * [x] `/music play <suche|url>`, `/radio start <url>`, `/skip`, `/stop`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/volume <1-100>`, `/loop`, `/shuffle`, `/remove`.
  * [x] Interaktives Embed mit Steuerungs-Buttons (⏸️/▶️/⏭️/⏹️/🔀).
  * [ ] `/soundboard <sound>` für lokale Sounds (braucht MP3-Bibliothek, noch offen).
  * [x] **Web-Dashboard Musik-Zentrale (`/radio`):**
  * [x] Live-Anzeige des aktuellen Tracks mit Sendername und Hörerzahl.
  * [x] Web-Controls (Play/Pause/Stop) für Radio-Streams.
  * [x] **MP3-Eingang:** Eigene MP3s im Dashboard hochladen; geprüfte Dateien in die Bibliothek übernehmen.
  * [x] **DM-Upload:** MP3 per Bot-DM mit kurzlebigem Einmal-Code (`MUS-XXXXXX`, 10 Min.) aus dem Dashboard. Nur Owner/Admins erzeugen Codes.
  * [x] Dateigrenzen und Typ serverseitig prüfen (MP3/WAV/OGG/M4A, 25 MB, Dateiname bereinigen, Duplikate ablehnen); fehlgeschlagene Dateien mit verständlichem Status ablehnen.
  * [ ] Speicherquote und Uploads pro `guildId` getrennt halten (noch offen).
  * [x] **Warteschlange pro Server im Dashboard:** Aktueller Song + Queue mit Dauer und Uploader auf `/radio` (Live-Polling alle 10s).
  * [ ] **Live-Übersicht für alle erreichbaren Bots/Server:** Gesamtansicht mit einer getrennten Karte je Server/Voice-Kanal und Filtern nach Radio, lokaler Musik, YouTube und Spotify.
  * [ ] Pro aktiver Wiedergabe Live-Titel, Interpret, Cover (falls verfügbar), Quelle, Voice-Kanal, Listener-Zahl, Verbindungsstatus und nächsten Track anzeigen; bei Radio ohne Metadaten Streamname/Online-Status darstellen.
  * [ ] Aktionen und Uploads immer dem aktuell ausgewählten Server zuordnen; Gesamtübersicht darf nur Server anzeigen/steuern, für die der eingeloggte Nutzer Berechtigungen hat.

---

## 🚀 Offene Vorhaben: Erweiterte Automationen, Backup v3 & intelligentes Setup

### 22. 📦 Backup v3: sichere Restores, Bot-Konfigurationen & optionales Chat-Archiv
> **Ist-Stand (v2.22.0):** Rollen-/Kanal-Snapshots, JSON-Download/-Upload und ein grundlegender Cross-Server-Restore sind vorhanden. Die folgenden Aufgaben härten und erweitern diesen Bestand.
> **Ziel:** Wiederherstellung nachvollziehbar und überprüfbar machen. Kein Backup enthält Geheimnisse; Cross-Server-Zuordnungen werden bei Mehrdeutigkeit nicht automatisch geraten.

* [x] **Vorhandene Basis:** Rollen-/Kanal-Snapshot, JSON-Import/-Export und grundlegender Cross-Server-Restore *(v2.22.0)*.
* [ ] **Phase 1 – Versioniertes Format & sicherer Restore:**
  * [x] `schemaVersion` 1 ergänzen, unversionierte v2.22-Backups als Legacy-Format akzeptieren und Importdaten auf Struktur, Datentypen, Wertebereiche und Größenlimits prüfen.
  * [x] Snapshot-Integrität per SHA-256-Prüfsumme prüfen und Backup-Dateien atomar schreiben.
  * [ ] Migrationen zwischen zukünftigen Formatversionen unterstützen.
  * [x] Restore-Vorschau mit Änderungen, Member-Overwrites und Warnungen ergänzen; Cross-Server-Mehrdeutigkeiten vor Änderungen blockieren.
  * [x] Vor einem Wipe automatisch einen Vorher-Snapshot erstellen; Vorschau und ausdrückliche Bestätigung im Dashboard und Slash-Command verlangen.
  * [x] Backups auf ein striktes Rollen-/Kanal-Schema begrenzen; `.env`-Werte, Tokens und OAuth-Secrets werden nicht exportiert.
* [ ] **Phase 2 – Guild-Konfigurationen:**
  * [x] Guild-Konfigurationen pro Server exportieren und wiederherstellen: Modulstatus, Level, Economy-Shop, Tickets, Voice, Rollen-Panels, Welcome, Audit-Logging, Blacklist, Live-Streamer, Releases, News-Feeds, Geburtstags-Einstellungen, Game-Server-Endpunkte, Free Games, Clips, Statistik-Kanäle, Stream-Alerts und eigene Befehle.
  * [ ] Prison- und sonstige Modul-spezifische Einstellungen prüfen; aktive Haftfälle, Geburtstagsdaten, XP-Verläufe und Wallets bleiben aus Datenschutz-/Integritätsgründen ausgeschlossen.
  * [x] Nur bekannte Konfigurationsfelder aufnehmen; keine beliebigen Dateien aus `data/` oder `config/` spiegeln.
  * [ ] Wiederherstellung mit Round-Trip-Test (Export -> Import -> gleicher Konfigurationszustand) und Tests für ältere Formatversionen absichern.
* [ ] **Phase 3 – Optionales Chat-Archiv:**
  * [x] Archivierung nur für explizit ausgewählte Kanäle aktivieren; Nachrichtenlimit pro Kanal und Gesamtlimits anwenden.
  * [x] Autor-ID/Anzeigename, Zeitstempel, Inhalt, Embeds, Reaktionen und Pins als HTML-Transkript und JSON exportieren.
  * [x] Anhänge innerhalb fester Einzel- und Gesamtlimits herunterladen; keine CDN-URLs als Archivinhalt speichern.
  * [x] Wiederhergestellte Inhalte als Archiv markieren und nicht als ursprüngliche Autoren ausgeben.
  * [ ] Gezielt personenbezogene Archivdaten löschen können; die lokale 20-Snapshot-Retention ist keine individuelle Löschfunktion. Keine Sprachaufnahmen erstellen.
* [ ] **Phase 4 – Cross-Server-Zuordnung:**
  * [x] Im selben Server IDs bevorzugen; beim Serverwechsel Kandidaten anhand Typ und Name erkennen.
  * [x] Mehrdeutige Zuordnungen in der Vorschau manuell entscheiden lassen; fehlende Ziele werden vorab als Neuanlage angezeigt.
  * [x] Mitglieder-IDs und individuelle Member-Overwrites nicht automatisch auf einen anderen Server übertragen.
  * [x] Rollen-/Kanal-Referenzen in den unterstützten Bot-Konfigurationen mit der ID-Zuordnung aktualisieren.
* [ ] **Phase 5 – Verschlüsselter externer Notfall-Export:**
  * [x] Täglichen Scheduler für lokale Snapshots und externe Exporte einrichten; lokale Aufbewahrung auf 20 Snapshots begrenzen.
  * [x] Backups vor externem Upload mit AES-256-GCM verschlüsseln; Schlüssel bleibt in der Umgebung und außerhalb der Backup-Datei.
  * [x] Discord-Upload optional mit Größenlimit und S3-kompatiblen Objektspeicher als externes Ziel unterstützen.
  * [x] Inhaber über Backup-ID und Exportergebnis informieren; `.glgbak`-Dateien können nach Upload wieder importiert werden.
  * [x] Externe Aufbewahrung konfigurierbar machen (Standard 90 Tage) und alte Discord-/S3-Dateien bereinigen.
  * [x] Schlüsselrotation unterstützen: vorherige Schlüssel für Importe konfigurierbar halten, bis alte Dateien abgelaufen sind.
  * [ ] Regelmäßige automatisierte Wiederherstellungsübungen gegen eine isolierte Testumgebung ergänzen.

---

### 23. 🧩 Modularer 1-Klick Setup Wizard ("Alles einrichten nach Wunsch-Modulen")
> **Ziel:** Ein einziger Knopfdruck richtet auf Discord und im Bot genau die Module ein, die der Server-Inhaber haben möchte – inklusive aller Rollen, Kategorien, Kanäle, Berechtigungen und interaktiver Start-Panels.
> **Abgrenzung zu Punkt 20:** Punkt 20 richtet allgemeine Server-Templates ein. Diese Erweiterung baut auf dem bestehenden `/setup`-Service auf und ergänzt dessen Modul-Auswahl; kein zweites Setup-System anlegen.

* [ ] **Modulare Auswahl-Matrix im Dashboard (`/setup` & `/templates`) und via `/setup-all`:**
  * [ ] Übersichtliche Checkboxen für alle Kern- und Zusatzmodule:
    * [ ] 🔊 **Temporäre Voice-Lobbys** (Kategorie + „➕ Lobby erstellen“ + VoiceMaster-Steuerungs-Panel)
    * [ ] 🔴 **Live-Streamer Suite** (Kategorie + `#stream-alerts` + Rollen `@bn.live`, `@Live`)
    * [ ] 🎫 **Support-Tickets** (Kategorie + `#support` mit interaktivem Ticket-Erstellen-Button)
    * [ ] 🔒 **Gefängnis & Voice-Knast** (Rolle `@Gefängnis` + `#gefängnis` + `🔒・gefängnis-voice`)
    * [ ] 🏆 **Level- & Rangsystem** (Rollen-Belohnungen Level 5, 10, 20, 25 + `#level-ups`)
    * [ ] 🪙 **Economy & Belohnungs-Shop** (6 Discord-Namensfarben + Shop-Panel + Börsen-Kanal)
    * [ ] 🎁 **Free Games, Game-News & Software** (`#free-games`, `#game-news`, `#treiber-software` + Rollen)
    * [ ] 👥 **LFG / Mitspieler-Suche** (`#mitspieler-suche` mit LFG-Panel)
    * [ ] 🖼️ **Willkommens-System** (`#willkommen` mit Canvas-Banner & Auto-Rolle)
    * [ ] 🔒 **Regel-Sperre & Verifikation** (`#regeln` mit „Regeln akzeptieren“-Button + `@Gast`)
* [ ] **1-Klick Ausführung („🚀 Gewählte Module & Kanäle einrichten“):**
  * [ ] Der Bot durchläuft alle angekreuzten Module in einem einzigen Durchlauf.
  * [ ] Intelligente Dubletten-Erkennung: Existierende Rollen oder Kanäle werden erkannt und verknüpft, anstatt sie doppelt anzulegen.
  * [ ] Automatisches Schreiben der neuen IDs direkt in alle zugehörigen JSON-Konfigurationen (`rolesConfig`, `rulesConfig`, `ticketConfig`, `voiceConfig`, `economyConfig` etc.).
  * [ ] Automatisches Versenden der interaktiven Discord-Embeds mit Buttons (Regel-Button, Ticket-Button, VoiceMaster-Panel).
  * [ ] Aktivierung aller gewählten Module in `moduleService.ts`.

---

### 24. 📊 Dashboard Health & Server-Statistiken (`/system-logs` & Dashboard-Home)
* [x] Prozessstatus mit CPU, RAM, Uptime, Node.js-Version und Restart-Zähler in `/system-logs` *(v2.23.0)*.
* [ ] Discord-Gateway-Ping (Latenz in ms) un

## 🚀 Offene Vorhaben: Erweiterte Automationen, Backup v3 & intelligentes Setup

### 22. 📦 Backup v3: sichere Restores, Bot-Konfigurationen & optionales Chat-Archiv
> **Ist-Stand (v2.22.0):** Rollen-/Kanal-Snapshots, JSON-Download/-Upload und ein grundlegender Cross-Server-Restore sind vorhanden. Die folgenden Aufgaben härten und erweitern diesen Bestand.
> **Ziel:** Wiederherstellung nachvollziehbar und überprüfbar machen. Kein Backup enthält Geheimnisse; Cross-Server-Zuordnungen werden bei Mehrdeutigkeit nicht automatisch geraten.

* [x] **Vorhandene Basis:** Rollen-/Kanal-Snapshot, JSON-Import/-Export und grundlegender Cross-Server-Restore *(v2.22.0)*.
* [ ] **Phase 1 – Versioniertes Format & sicherer Restore:**
  * [x] `schemaVersion` 1 ergänzen, unversionierte v2.22-Backups als Legacy-Format akzeptieren und Importdaten auf Struktur, Datentypen, Wertebereiche und Größenlimits prüfen.
  * [x] Snapshot-Integrität per SHA-256-Prüfsumme prüfen und Backup-Dateien atomar schreiben.
  * [ ] Migrationen zwischen zukünftigen Formatversionen unterstützen.
  * [x] Restore-Vorschau mit Änderungen, Member-Overwrites und Warnungen ergänzen; Cross-Server-Mehrdeutigkeiten vor Änderungen blockieren.
  * [x] Vor einem Wipe automatisch einen Vorher-Snapshot erstellen; Vorschau und ausdrückliche Bestätigung im Dashboard und Slash-Command verlangen.
  * [x] Backups auf ein striktes Rollen-/Kanal-Schema begrenzen; `.env`-Werte, Tokens und OAuth-Secrets werden nicht exportiert.
* [ ] **Phase 2 – Guild-Konfigurationen:**
  * [x] Guild-Konfigurationen pro Server exportieren und wiederherstellen: Modulstatus, Level, Economy-Shop, Tickets, Voice, Rollen-Panels, Welcome, Audit-Logging, Blacklist, Live-Streamer, Releases, News-Feeds, Geburtstags-Einstellungen, Game-Server-Endpunkte, Free Games, Clips, Statistik-Kanäle, Stream-Alerts und eigene Befehle.
  * [ ] Prison- und sonstige Modul-spezifische Einstellungen prüfen; aktive Haftfälle, Geburtstagsdaten, XP-Verläufe und Wallets bleiben aus Datenschutz-/Integritätsgründen ausgeschlossen.
  * [x] Nur bekannte Konfigurationsfelder aufnehmen; keine beliebigen Dateien aus `data/` oder `config/` spiegeln.
  * [ ] Wiederherstellung mit Round-Trip-Test (Export -> Import -> gleicher Konfigurationszustand) und Tests für ältere Formatversionen absichern.
* [ ] **Phase 3 – Optionales Chat-Archiv:**
  * [x] Archivierung nur für explizit ausgewählte Kanäle aktivieren; Nachrichtenlimit pro Kanal und Gesamtlimits anwenden.
  * [x] Autor-ID/Anzeigename, Zeitstempel, Inhalt, Embeds, Reaktionen und Pins als HTML-Transkript und JSON exportieren.
  * [x] Anhänge innerhalb fester Einzel- und Gesamtlimits herunterladen; keine CDN-URLs als Archivinhalt speichern.
  * [x] Wiederhergestellte Inhalte als Archiv markieren und nicht als ursprüngliche Autoren ausgeben.
  * [ ] Gezielt personenbezogene Archivdaten löschen können; die lokale 20-Snapshot-Retention ist keine individuelle Löschfunktion. Keine Sprachaufnahmen erstellen.
* [ ] **Phase 4 – Cross-Server-Zuordnung:**
  * [x] Im selben Server IDs bevorzugen; beim Serverwechsel Kandidaten anhand Typ und Name erkennen.
  * [x] Mehrdeutige Zuordnungen in der Vorschau manuell entscheiden lassen; fehlende Ziele werden vorab als Neuanlage angezeigt.
  * [x] Mitglieder-IDs und individuelle Member-Overwrites nicht automatisch auf einen anderen Server übertragen.
  * [x] Rollen-/Kanal-Referenzen in den unterstützten Bot-Konfigurationen mit der ID-Zuordnung aktualisieren.
* [ ] **Phase 5 – Verschlüsselter externer Notfall-Export:**
  * [x] Täglichen Scheduler für lokale Snapshots und externe Exporte einrichten; lokale Aufbewahrung auf 20 Snapshots begrenzen.
  * [x] Backups vor externem Upload mit AES-256-GCM verschlüsseln; Schlüssel bleibt in der Umgebung und außerhalb der Backup-Datei.
  * [x] Discord-Upload optional mit Größenlimit und S3-kompatiblen Objektspeicher als externes Ziel unterstützen.
  * [x] Inhaber über Backup-ID und Exportergebnis informieren; `.glgbak`-Dateien können nach Upload wieder importiert werden.
  * [x] Externe Aufbewahrung konfigurierbar machen (Standard 90 Tage) und alte Discord-/S3-Dateien bereinigen.
  * [x] Schlüsselrotation unterstützen: vorherige Schlüssel für Importe konfigurierbar halten, bis alte Dateien abgelaufen sind.
  * [ ] Regelmäßige automatisierte Wiederherstellungsübungen gegen eine isolierte Testumgebung ergänzen.

---

### 23. 🧩 Modularer 1-Klick Setup Wizard ("Alles einrichten nach Wunsch-Modulen")
> **Ziel:** Ein einziger Knopfdruck richtet auf Discord und im Bot genau die Module ein, die der Server-Inhaber haben möchte – inklusive aller Rollen, Kategorien, Kanäle, Berechtigungen und interaktiver Start-Panels.
> **Abgrenzung zu Punkt 20:** Punkt 20 richtet allgemeine Server-Templates ein. Diese Erweiterung baut auf dem bestehenden `/setup`-Service auf und ergänzt dessen Modul-Auswahl; kein zweites Setup-System anlegen.

* [ ] **Modulare Auswahl-Matrix im Dashboard (`/setup` & `/templates`) und via `/setup-all`:**
  * [ ] Übersichtliche Checkboxen für alle Kern- und Zusatzmodule:
    * [ ] 🔊 **Temporäre Voice-Lobbys** (Kategorie + „➕ Lobby erstellen“ + VoiceMaster-Steuerungs-Panel)
    * [ ] 🔴 **Live-Streamer Suite** (Kategorie + `#stream-alerts` + Rollen `@bn.live`, `@Live`)
    * [ ] 🎫 **Support-Tickets** (Kategorie + `#support` mit interaktivem Ticket-Erstellen-Button)
    * [ ] 🔒 **Gefängnis & Voice-Knast** (Rolle `@Gefängnis` + `#gefängnis` + `🔒・gefängnis-voice`)
    * [ ] 🏆 **Level- & Rangsystem** (Rollen-Belohnungen Level 5, 10, 20, 25 + `#level-ups`)
    * [ ] 🪙 **Economy & Belohnungs-Shop** (6 Discord-Namensfarben + Shop-Panel + Börsen-Kanal)
    * [ ] 🎁 **Free Games, Game-News & Software** (`#free-games`, `#game-news`, `#treiber-software` + Rollen)
    * [ ] 👥 **LFG / Mitspieler-Suche** (`#mitspieler-suche` mit LFG-Panel)
    * [ ] 🖼️ **Willkommens-System** (`#willkommen` mit Canvas-Banner & Auto-Rolle)
    * [ ] 🔒 **Regel-Sperre & Verifikation** (`#regeln` mit „Regeln akzeptieren“-Button + `@Gast`)
* [ ] **1-Klick Ausführung („🚀 Gewählte Module & Kanäle einrichten“):**
  * [ ] Der Bot durchläuft alle angekreuzten Module in einem einzigen Durchlauf.
  * [ ] Intelligente Dubletten-Erkennung: Existierende Rollen oder Kanäle werden erkannt und verknüpft, anstatt sie doppelt anzulegen.
  * [ ] Automatisches Schreiben der neuen IDs direkt in alle zugehörigen JSON-Konfigurationen (`rolesConfig`, `rulesConfig`, `ticketConfig`, `voiceConfig`, `economyConfig` etc.).
  * [ ] Automatisches Versenden der interaktiven Discord-Embeds mit Buttons (Regel-Button, Ticket-Button, VoiceMaster-Panel).
  * [ ] Aktivierung aller gewählten Module in `moduleService.ts`.

---

### 24. 📊 Dashboard Health & Server-Statistiken (`/system-logs` & Dashboard-Home)
* [x] Prozessstatus mit CPU, RAM, Uptime, Node.js-Version und Restart-Zähler in `/system-logs` *(v2.23.0)*.
* [ ] Discord-Gateway-Ping (Latenz in ms) und REST-API-Antwortzeiten mit 24h-Historie.
* [ ] Mitglieder-Wachstums-Graph (Joins, Leaves, aktive Chatter).
* [ ] Übersicht der aktiven Interaktionen (ausgeführte Slash-Commands und Button-Klicks pro Stunde).

---

### 25. 🔔 Web-Benachrichtigungs-Präferenzen für Mitglieder
* [ ] Persönliches Einstellungs-Menü für angemeldete Mitglieder im Webinterface:
  * [ ] Toggles für Free Games (`@bn.free`), Game News (`@bn.gamenews`), Treiber & Software (`@bn.treiber`).
  * [ ] Granulare Streamer-Benachrichtigungen (nur für ausgewählte Lieblings-Streamer der Community).
* [ ] Der Bot synchronisiert die entsprechenden Discord-Rollen automatisch im Hintergrund.

---

### 26. 🧹 Temporäre Chat-Hygiene (Auto-Cleaner für Bot-Spam)
* [ ] Konfigurierbare Auto-Bereinigung für Bot-Kanäle (z. B. `#bot-spam`, `#musik`, `#befehle`).
* [ ] Automatisches Löschen von Bot-Befehlen und Bot-Antworten nach einer einstellbaren Frist (z. B. 2 bis 5 Minuten).

---

## ✅ Abgeschlossen: Gaming-Extras & Community-Wachstum (Punkte 10–15)

### 10. 👥 LFG-System (Looking for Group / Mitspieler-Suche) ✅ v2.11.0
* [x] Slash-Command `/lfg spiel:<name> mitspieler:<anzahl> [rang:<rang>] [beschreibung:<text>]`.
* [x] Interaktives Discord-Embed mit Echtzeit-Slot-Anzeige (`🎮 Beitreten` & `❌ Verlassen` Buttons).
* [x] **Automatischer Voice-Move:** Sobald die Gruppe voll ist, pingt der Bot alle Teilnehmer und verschiebt sie automatisch in eine neu generierte temporäre VoiceMaster-Lobby (`🎮・[Spiel] Gruppe von [Leiter]`).

---

### 11. 🎬 Community-Clip-Showcase (`#clips`) ✅ v2.15.0
* [x] Automatischer Video- & Clip-Detektor (Twitch, YouTube, Medal, Streamable, Kick, Outplayed und Videodateien).
* [x] Bot hängt automatisch Reaktionen an (🔥 Upvote, 😂 Lustig).
* [x] Wöchentliche Kür (Wochentag/Uhrzeit einstellbar, Standard Sonntag 20 Uhr): „🏆 Clip der Woche“ wird gekürt und gepinnt, Dashboard-Seite `/clips`.

---

### 12. 🖼️ Grafische Willkommens-Karten (Canvas / Dynamic Image) ✅ v2.12.0
* [x] Willkommens-Banner für neue Mitglieder:
  * [x] Nutzer-Avatar & Server-Icon gerendert.
  * [x] Benutzername, Tag und Server-Mitgliederzähler (`Du bist Mitglied #1.248!`).
* [x] Automatische Rollenvergabe (Autorole) bei Beitritt – **nur wenn die Regel-Sperre aus ist**. `@Gast` bekommt man bei uns erst mit „Regeln akzeptieren“; wer sie sofort bekommt, sieht den ganzen Server, ohne die Regeln zu lesen.
* [x] Im Web-Dashboard konfigurierbar: Willkommenskanal, Farbe, Überschrift, Untertitel und Text (mit Vorschau).
* [x] Eigenes Hintergrundbild für die Willkommens-Karte (im Dashboard per URL einstellbar mit Glassmorphismus-Filter).

---

### 13. 📊 Live Server-Statistik-Kanäle (Counter oben in der Serverliste) ✅ v2.10.0
* [x] Gesperrte Voice-Kanäle ganz oben auf dem Discord-Server, die sich alle 10 Minuten aktualisieren:
  * [x] `👥・Mitglieder: 1.250`
  * [x] `🔊・Im Voice: 24`
  * [x] `🔴・Gerade Live: 3`
  * [x] `🎮・Game-Server: 2/3` *(v2.13.0)*
* [x] Vollständig konfigurierbar im Web-Dashboard (welche Counter aktiv sind, Emojis und Beschriftungen).

---

### 14. 🎂 Geburtstags-System (`/birthday`) ✅ v2.10.0
* [x] Befehl `/birthday set <tag>.<monat>`.
* [x] Automatische Überprüfung um 00:01 Uhr jeden Tag.
* [x] Feierliches Glückwunsch-Embed im Ankündigungskanal und automatische Zuweisung einer temporären Rolle (`🎉 Geburtstagskind`) für 24 Stunden.

---

### 15. 🪙 Community-Wirtschaft & Belohnungs-Shop (Economy) ✅ v2.17.0
* [x] Server-Währung („Coins“ / frei konfigurierbar) gesammelt durch Chat-Aktivität, Voice-Zeit, Streaks und Events.
* [x] Chat-Befehle `/balance`, `/pay <user> <amount>`, `/leaderboard coins` (`/daily` aus Punkt 5 wurde um Coins erweitert).
* [x] **Belohnungs-Shop (`/shop` & im Web-Dashboard):**
  * [x] Kaufen von Rollen (z. B. VIP, Farbrollen mit automatischer Zuweisung).
  * [x] Eigene Voice-Channel Namensrechte, Profil-Badges und individuelle Vorteile.
  * [x] Web-Dashboard `/economy` mit Store, Leaderboard, Inventar & Admin-Verwaltung.

---

## ✅ Abgeschlossen: Public Release & Multi-Guild (max. 5 Server, Punkte 16–21)

> **Architektur-Konzept:** **Ein einziger Bot-Prozess** (z. B. in einem Proxmox-Container) bedient **bis zu 5 freigegebene** Discord-Server gleichzeitig.
> * **Ressourcen:** Minimaler RAM-Verbrauch (~200 MB) für alle Server zusammen.
> * **Zentrale Wartung:** 1x `git pull` & `pm2 restart` aktualisiert alle Server simultan.
> * **Onboarding nur mit Freigabe:** Server-Besitzer können den Bot einladen, er bleibt aber nur auf Servern, die auf der Freigabe-Liste stehen.

### 16. 🏛️ Multi-Guild (max. 5 Server, nur Freigabe-Liste) ✅ v2.8.0
> ✅ **Umgesetzt in v2.8.0:** maximal **5 Server**, nur Server auf der **Freigabe-Liste**.
> * Durch die Grenze von 5 Servern ist **keine Discord-Bot-Verifizierung** nötig (erst ab 100 Servern), die Privileged Intents bleiben ohne Antrag nutzbar.
> * Wer den Bot für fremde Server hostet, ist für deren Daten verantwortlich (**Datenschutz / DSGVO**, Datenschutzerklärung, Löschung auf Anfrage) – bei max. 5 bekannten Servern überschaubar, sollte aber trotzdem kurz geregelt werden.

* [x] **🔒 Server-Freigabe & Begrenzung:**
  * [x] `.env`-Werte `ALLOWED_GUILD_IDS`, `MAX_GUILDS` (1–5), `BOT_OWNER_ID`. `GUILD_ID` bleibt **Haupt-Server** (immer erlaubt).
  * [x] Event `guildCreate`: nicht freigegeben oder Limit erreicht → **DM an den Server-Owner** + **Server sofort verlassen**.
  * [x] Beim Bot-Start alle Server prüfen und nicht freigegebene verlassen.
  * [x] Dashboard-Seite **„Server-Freigabe“** (`/servers`, nur Bot-Besitzer): Liste, Belegung „x / 5“, freigeben, entfernen, Einladungs-Link.
  * [x] Freigabe entfernen → Bot verlässt den Server, Daten bleiben gespeichert („Entfernte Server“-Liste).
  * [x] Daten entfernter Server nach 30 Tagen automatisch löschen bzw. sofort auf Knopfdruck *(v2.14.0)*.
* [x] **Slash-Befehle pro Server:** werden für jeden freigegebenen Server automatisch registriert (beim Beitritt, beim Start und in `deploy-commands`) – sofort verfügbar, kein globales Warten.
* [x] **Daten- & Konfigurations-Trennung pro Server:**
  * [x] Alle Dienste speichern pro `guildId` (eine Datei je Dienst, Einträge nach Server getrennt) – kein Umbau auf `data/guilds/<guildId>/` nötig.
  * [x] Regeln pro Server (`data/rules.json` = Haupt-Server, `data/rules/<guildId>.json` = weitere), Admin-Notizen pro Server, Anti-Raid/-Nuke-Zähler pro Server.
  * [x] Getrennte Moderations-Fälle, Level, Audit-Logs, Module (neue Server starten mit Grundmodulen).
* [x] **Server-Wechsel im Web-Dashboard:**
  * [x] Auswahl oben links unter dem Bot-Namen mit allen Servern, auf denen man Owner / Administrator / „Server verwalten“ hat.
  * [x] Einladungs-Link nur für freigegebene Server (in der Server-Freigabe).
* [x] **API-Mandantenfähigkeit:**
  * [x] Aktiver Server per Cookie, Proxy schickt `x-guild-id` an die Bot-API; alte Routen (`/api/config/*`, `/api/discord/*`, `/api/action/*`) nutzen den aktiven Server.
  * [x] Serverseitige Prüfung: nur Server, die der Nutzer verwalten darf (Rechte werden pro Server alle 60 Sek. bei Discord geprüft).

---

### 17. ⚡ Eigene Custom Commands & Text-Reaktionen ✅ v2.11.0
* [x] Im Web-Dashboard unter `/custom-commands`:
  * [x] Eigene Slash- oder Prefix-Befehle erstellen (z. B. `/ts`, `/lan`, `/regeln`, `/partner`).
  * [x] Auswahl zwischen einfacher Textantwort oder formatiertem Discord-Embed mit Bildern.

---

### 18. 💬 Live Web-Konsole & Chat im Dashboard ✅ v2.15.0
* [x] Textkanal im Dashboard auswählen und Live-Nachrichten mitlesen (alle 4 Sekunden).
* [x] Nachrichten direkt als Bot in den Kanal senden, antworten oder löschen - nur mit „Nachrichten verwalten“, alles im Audit-Log.

---

### 19. ⏰ Geplante Ankündigungen (Scheduled Messages) ✅ v2.10.0
* [x] Im Web-Dashboard unter `/announcements`:
  * [x] Nachricht oder Embed vorschreiben.
  * [x] Datum und Uhrzeit für die geplante Veröffentlichung wählen (z. B. LAN-Party Start, Event-Erinnerung).
  * [x] Automatische pünktliche Ausführung durch den Bot-Scheduler.

---

### 20. 🏗️ 1-Klick Server-Templates & Auto-Setup Wizard ✅ v2.18.0

> **Ziel:** Richtet auf neuen oder bestehenden Discord-Servern in 15 Sekunden eine komplette, professionelle und sichere Server-Struktur ein.
>
> **Baut auf v2.6.0 auf:** Die Seite „Server einrichten“ (`/setup`) und `/setup-all` mit `src/services/setupService.ts` legen die Bot-Bereiche schon an – Templates ergänzen das nur um die allgemeine Server-Struktur (Kategorien, Chats, Team-Rollen) und sollten denselben Service nutzen statt eines zweiten Systems.

* [x] **Vordefinierte Server-Typen (JSON-Templates in `src/templates/`):**
  * [x] 🎮 **Gaming Clan / E-Sport:** Infos (Regeln, News), Community (Chat, Clips, Memes), Talk (VoiceMaster, AFK), Spiele-Lobbys.
  * [x] 🌐 **Multi-Gaming Community:** Spiele-Kategorien getrennt nach Games (CS2, Valorant, LoL, GTA) mit Auto-Rollen / Reaction Roles.
  * [x] 💻 **Coding / Dev / Tech:** Projekte, Dev-Talk nach Sprachen (JS/TS, Python, C++, Rust), Bug-Reports, Helpdesk.
  * [x] 🌸 **Anime / Manga / Hangout:** Lobby, Anime-Talk, Fan-Art, Musik, Mini-Games.
  * [x] 🔴 **Content Creator / Streamer:** Live-Alerts, Sub-Lounge, Giveaways, Fan-Chat, Kooperationen.
* [x] **Wählbare Emoji- & Design-Stile:**
  * [x] **Modern mit Emojis:** `💬・hauptchat`, `📢・news`, `🔊・talk-1`
  * [x] **Clean / Minimalistisch:** `hauptchat`, `news`, `talk-1` (kleingeschrieben, ohne Emojis)
  * [x] **Aesthetic / Symbole:** `〢・chat`, `〢・news`, `〢・voice`
  * [x] **Box / Bold:** `「💬」chat`, `「📢」news`, `「🔊」voice`
* [x] **Automatisches Berechtigungs-Hardening (Wasserdichte Sicherheit):**
  * [x] Sichere Rollen-Hierarchie (`@Inhaber`, `@Admin`, `@Mod`, `@VIP`, `@Member`, `@Gast`).
  * [x] Vollständige Permission Overwrites (Ankündigungen nur lesbar für `@everyone`, geschützte Mod-Logs, sichere VoiceMaster-Berechtigungen).
  * [x] Nutzung der bestehenden Backup-Engine (`backupService.ts`) zum schnellen, fehlerfreien Ausrollen.
* [x] **Bedienung via Web & Discord:**
  * [x] **Web-Dashboard (`/templates`):** Interaktiver 3-Schritte-Assistent (Typ wählen -> Stil wählen -> Vorschau prüfen -> „Server einrichten“).
  * [x] **Discord Slash-Command:** `/server-setup template:<typ> style:<stil> [wipe:true|false]` mit Sicherheits-Bestätigungs-Button.
  * [x] ⚠️ `wipe` (Server vorher leeren) **nur mit automatischem Backup davor** – sonst löscht ein Fehlklick den kompletten Server. Am besten zusätzlich: nur der Server-Owner darf `wipe` nutzen.

---

### 21. 📦 1-Klick Installer & Deployment-Pakete (Docker, Windows .bat & Linux) ✅ v2.14.0

> **Ziel:** Jeder Nutzer kann den Bot & das Web-Dashboard in unter 3 Minuten auf seinem System installieren – ohne technische Vorkenntnisse.

> **Empfehlung:** Mit **Docker** anfangen – ein Befehl startet Bot + Dashboard auf Linux, NAS und Windows. Wichtig: Bot und Dashboard sprechen über `127.0.0.1:3101` miteinander → im Compose-Setup entweder ein gemeinsamer Container oder `BOT_API_HOST` konfigurierbar machen.

* [x] **🐳 Docker & Docker-Compose (`docker-compose.yml` & `Dockerfile`):**
  * [x] Bot und Dashboard in **einem** Container (PM2 im Container) - so funktioniert die interne Verbindung über 127.0.0.1 ohne Umbau.
  * [x] Unterstützt Linux, Proxmox, Unraid, Synology/QNAP NAS, TrueNAS und Windows Docker Desktop.
  * [x] 1-Befehl-Start: `docker compose up -d --build`.
  * [x] Persistente Volumes für `data/`, `config/` und `.env`.
  * [x] Updates mit `git pull && docker compose up -d --build`.
* [x] **🪟 Windows 1-Klick Installer (`install_windows.bat` & Setup-Assistent):**
  * [x] System-Prüfung: Prüft, ob Node.js & Git vorhanden sind (mit automatischem Download-Hinweis).
  * [x] Legt die `.env` an und öffnet sie im Editor zum Ausfüllen.
  * [x] Automatischer Build (`npm install` und `npm run build` für Bot & Web).
  * [x] Optionale Autostart-Einrichtung (Start beim Windows-Boot).
  * [x] Desktop-Verknüpfung (vorerst: `start.bat` im Projektordner).
* [x] **🐧 Linux 1-Klick Setup-Skript (`install_linux.sh`):**
  * [x] Automatisches Setup-Skript für Debian/Ubuntu/Proxmox-Container.
  * [x] Richtet Node.js 22 LTS und PM2 mit Autostart ein (Caddy weiterhin von Hand, siehe README).

---

## 🧰 Bekannte Probleme & Technik-Schulden

* [x] **Automatische Sicherung des `data/`-Ordners** *(v2.9.0: täglich nach `data/_snapshots/<Datum>/`, 7 Tage)* (Level, Strafen, Einstellungen, Streamer): täglicher Export auf dem Server, z. B. 7 Tage aufbewahren. Wichtiger als die meisten neuen Features.
* [x] **Backup wiederherstellen setzt die @everyone-Rechte zurück** *(v2.9.0: Sperre wird danach automatisch neu angewendet)* – dadurch kann die Regel-Sperre aufgehoben werden. Nach dem Restore Sperre automatisch neu anwenden.
* [ ] **Twitch- & YouTube-Erkennung** läuft über inoffizielle Wege (Twitch-GQL, YouTube-Seite) und kann bei Änderungen kaputtgehen → langfristig offizielle Twitch-API (Client-ID/Secret) als Option.
* [x] **„ping“-Auto-Antwort** *(v2.9.0: nur noch `!ping`)* reagierte in jedem Kanal → auf bestimmte Kanäle beschränken oder abschaltbar machen.
* [ ] **AMD- & Intel-Treiber-News** sind Beta (Seiten-Auslesen) und können ausfallen.
* [x] **Sicherheitsprüfung durchgeführt** *(v2.28.0)*: Login-Code, Backup-Restore, Server-Kurzlinks, Shop-Käufe und Musik-Timer abgesichert.
* [ ] **Musik-Dateien gelten serverübergreifend** (`data/music` ist gemeinsam): Bei mehreren Discord-Servern sieht jeder Server die Uploads der anderen. Vor weiteren Servern auf Ordner je `guildId` umstellen.
* [ ] **Versuchsbremse beim Code-Login liegt im Arbeitsspeicher**: Beim Neustart des Dashboards ist der Zähler wieder leer. Für ein verschärftes Limit müsste er mit auf die Festplatte.
* [ ] **Öffentliches GitHub-Repo** (`BroGamerYT/GLGBot`) wird nicht automatisch aktualisiert: neue Versionen vor dem Hochladen auf private Daten prüfen (Domain, IPs, IDs, Namen).
* [x] **Automatische Tests / Build-Check** *(v2.9.0: GitHub Actions `.github/workflows/build.yml`)* (z. B. GitHub Actions: `tsc` + `next build` bei jedem Push), damit Fehler vor dem Hochladen auffallen.

---

## 📊 Abgeschlossene Meilensteine (History)

* [x] **v2.28.0 (Aktuell):**
  * [x] Sicherheitsprüfung des Gesamtprojekts: Login-Code auf 6 zufällige Zeichen (`crypto`) umgestellt und Versuchsbremse (10 pro IP / 15 Min) ergänzt.
  * [x] Rechte-Eskalation über hochgeladene Backups geschlossen (Admin-/Moderationsrechte nur noch für Inhaber & Administratoren).
  * [x] Offene Weiterleitung in den Server-Kurzlinks abgedichtet, Doppelkauf im Shop verhindert.
  * [x] Musik-Player: Bot verlässt jetzt tatsächlich leere Sprachkanäle, Timer-Leck behoben, Modul-Schalter greift auch über das Dashboard.
  * [x] Versionsnummern in allen vier Dateien zusammengeführt, neue Tests unter `tests/security.test.ts`.
* [x] **v2.27.0:**
  * [x] Audio-Ducking: Musik/Radio wird leiser, sobald jemand spricht; eigener Radio-Steuerungs-Kanal mit Auto-Aufräumen.
* [x] **v2.26.0:**
  * [x] Radio-Dashboard neu gestaltet (dauerhafter Player, Reiter), Auto-Aufräumen temporärer Musik-Kanäle.
* [x] **v2.25.0:**
  * [x] Radio- & Musik-Dashboard (`/radio`), YouTube-Musik mit Warteschlange (`/music`), Musik-Setup-Modul.
* [x] **v2.24.0:**
  * [x] Rollen- & Rechte-Verwaltung im Dashboard (`/roles`) samt Hierarchie-Schutz für sensible Rechte.
* [x] **v2.23.0:**
  * [x] System-Manager & Live-Prozess-Logkonsole (`/system-logs`) mit Volltextsuche, Auto-Scroll, Log-Level-Filtern und 1-Klick Neustart-Steuerung (Bot, Web, All mit Countdown).
  * [x] Großes Sicherheits- & Stabilitäts-Audit: Command-Injection Schutz via `spawn` mit Argument-Whitelist, API-Token Mindestlängen-Schutz (32 Zeichen), Multi-Guild IDOR-Prävention, Wirtschafts-Obergrenze `MAX_BALANCE` (1 Mrd.) & atomare JSON-Dateisystem-Schreiboperationen (`writeJsonAtomic`).
* [x] **v2.22.0:**
  * [x] Unicode-Kanal-Designer & 10 Schriftstile (`/channel-style`, `/font`) mit Live-Vorschau im Dashboard und 1-Klick Styling.
  * [x] Neue Template-Vorlagen von Minimal Starter bis Mega-Community (8 Kategorien, 32 Kanäle).
  * [x] Backup JSON Download & Upload mit Cross-Server Snapshot Transfer.
* [x] **v2.21.0:**
  * [x] 30-Minuten Schnell-Login per Discord-Code (`/web-login` & `/shop code`) mit 1-Klick Login-Button ohne OAuth2-Zwang.
  * [x] Shop- & Profil-Zugang für normale Server-Mitglieder im Web-Dashboard (`/economy`).
  * [x] Erweiterte Treiber- & Software-News (NAS-Systeme Synology/TrueNAS/Unraid, CubeCoders AMP, Codecs, Tools).
* [x] **v2.20.0:**
  * [x] Level-XP Börse (`/shop tauschen` & Dashboard) mit konfigurierbarem Wechselkurs `xpPerCoin`.
  * [x] Discord-Namensfarben & Farbrollen-Shop mit 1-Klick Rollen-Generator im Dashboard und automatischem Farbrollen-Tausch.
  * [x] Voice-Knast AFK-Verschiebung nach Haftende und erweiterter Game-Release-Kalender mit Triple-A & Update-Filtern.
* [x] **v2.19.0:**
  * [x] Voice-Knast mit isoliertem Sprachkanal `🔒・gefängnis-voice`, automatischer Verschiebung beim Inhaftieren, Rückhol-Enforcement bei Kanalwechsel und Trennung bei Entlassung.
  * [x] Flexibler Haftdauer-Timer in `/knast einsperren [mitglied] [grund] [dauer]` und im Web-Dashboard (`/moderation`), 30s-Scheduler zur automatischen Entlassung und Restzeit-Countdown in `/knast liste`.
* [x] **v2.18.2:**
  * [x] Interaktives Gaming-News Magazin mit Bild-Kacheln, Live-Suche, Kategorien-Filtern und vollständiger Artikel-Vollansicht im Modal mit Patchnotes & Screenshots (`/news`).
* [x] **v2.18.1:**
  * [x] Community-Badges & Aktivitäts-Meilensteine auf der Rangkarte (`/rank`), eigenes Hintergrundbild für Willkommens-Karten mit Glassmorphismus-Filter (Dashboard `/welcome`), Windows-Installer Autostart & Desktop-Verknüpfung.
* [x] **v2.18.0:**
  * [x] 1-Klick Server-Templates & Auto-Setup Wizard (Modul „Server-Templates“), 5 Template-Profile (Gaming, Multi-Gaming, Coding, Anime, Creator), 4 Design-Stile (Modern, Clean, Aesthetic, Box), Rollen- & Berechtigungs-Hardening, Auto-Snapshot vor Ausführung, Slash-Befehl `/server-setup` & Web-Dashboard `/templates`.
* [x] **v2.17.0:**
  * [x] Community-Wirtschaft & Belohnungs-Shop (Modul „Wirtschaft & Belohnungs-Shop“), Server-Währung (Coins 🪙), `/balance`, `/pay`, `/shop`, `/economy`, Dashboard `/economy`, Coins in `/daily` & `/rank`.
* [x] **v2.16.0:**
  * [x] Game-Release-Kalender (Modul „Game-Release-Kalender“), Timeline & Monatsfilter, Vorbestell-Links, `/releases`, Montags-Scheduler.
* [x] **v2.15.0:**
  * [x] Clip der Woche (Modul „Clip-Showcase“), Web-Konsole zum Mitlesen und Schreiben als Bot.
* [x] **v2.14.0:**
  * [x] Docker, Installations-Skripte für Linux & Windows, PM2-Konfiguration, Daten entfernter Server löschen.
* [x] **v2.13.0:**
  * [x] Game-Server-Status (Minecraft, Source/Steam, Port-Check), `/serverstatus`, Statistik-Kanal „Game-Server“.
* [x] **v2.12.0:**
  * [x] Grafische Rangkarte bei `/rank`, Willkommens-Karte mit Dashboard-Seite, automatische Rolle (nur ohne Regel-Sperre).
* [x] **v2.11.0:**
  * [x] `/lfg` Mitspieler-Suche mit eigener Lobby, eigene Befehle im Dashboard.
* [x] **v2.10.0:**
  * [x] Geburtstage, geplante Ankündigungen, Statistik-Kanäle (je als Modul, pro Server).
* [x] **v2.9.0:**
  * [x] Level-Rollen-Belohnungen im Dashboard, Daily-Serie im Profil, tägliche Daten-Sicherung, Regel-Sperre nach Backup-Restore, `!ping` statt „ping“, Build-Check auf GitHub.
* [x] **v2.8.0:**
  * [x] Mehrere Server (max. 5) mit Freigabe-Liste, Server-Wechsel im Dashboard, Daten pro Server getrennt.
* [x] **v2.7.0:**
  * [x] Module an/aus (`/modules` + Dashboard-Seite), Streamer-Panel mit Kanal-Passwörtern, `/daily`, `/giveaway`, Level-Rollen-Belohnungen, Massen-Erwähnungs-Schutz.
  * [x] Free-Games & News ohne Login, „Gerade live“-Widget, neues Dashboard-Menü mit Bereichen.
* [x] **v2.6.0:**
  * [x] „Server einrichten“-Seite im Dashboard (`/setup`) und `/setup-all`: Bereiche ankreuzen, ein Klick legt alle fehlenden Rollen & Kanäle an.
* [x] **v2.5.0:**
  * [x] Open Source auf GitHub (MIT-Lizenz) mit Installationsanleitung.
  * [x] Branding über `.env` (`COMMUNITY_NAME`, `BOT_NAME`, `DASHBOARD_URL`), eigene Regeln/Banner in `config/`.
* [x] **v2.4.0:**
  * [x] Sicherheits-Update: Rangprüfung, keine öffentlichen Moderationsfälle, automatischer Logout bei Rechte-Entzug.
  * [x] `/knast` (Gefängnis sperrt alle Kanäle), `/level status`, getrennte Treiber-News (`bn.treiber`).
  * [x] Game-News mit Detailansicht & Verlauf, Free-Games mit App-Buttons, animierte Kanal-Banner.
  * [x] Regeln mit Regel-Sperre & Beitritts-Pop-up, temporäre Live-Rolle, nur ein Stream-Alert pro Stream.
* [x] **v2.3.0:**
  * [x] Konfigurierbare Live-Stream Benachrichtigungen (Rollen-Pings `@bn.live`, `@silent`-Modus, Custom Message im Web & Chat).
  * [x] Detaillierte Aktivitäts- & XP-Aufschlüsselung (Chat vs. Voice, Netto-Berechnung, Abzüge bei Strafen).
  * [x] Dynamisches 25-Stufen Levelsystem mit quadratischer XP-Kurve und flexiblen Vergabe-Raten.
  * [x] Audit-Logging, Anti-Nuke, Ticket-System, VoiceMaster-Lobbys, Free-Games Auto-Tracker.
  * [x] 24/7 Hosting auf Proxmox mit Caddy SSL & PM2.
