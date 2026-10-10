# 📋 GLGBot & Web-Dashboard – To-Do & Roadmap

Zentrale Übersicht aller geplanten Features, Verbesserungen und Erweiterungen für den GLGBot und das Web-Dashboard.

---

## 🚀 Priorität 1: Sofort anstehend

### 1. 🎁 Free Games & Game News öffentlich (Read-Only ohne Login)
* [ ] **Middleware & Routen:**
  * [ ] `/free-games` und `/news` in `web/src/middleware.ts` zu den öffentlichen Seiten (`isPublicPage`) hinzufügen.
  * [ ] GET-Endpunkte `GET /api/bot/free-games` und `GET /api/bot/news` für Gäste freigeben (`isPublicApi`).
* [ ] **UI-Anpassungen:**
  * [ ] Client-seitige Session-Prüfung (`useSession`) in `web/src/app/free-games/page.tsx` und `web/src/app/news/page.tsx`.
  * [ ] **Gast-Modus:** Alle Spiele-Karten, Filter, Countdowns, Store-Links und Treiber-Updates anzeigen.
  * [ ] **Admin-Controls verbergen:** Buttons zum Manuellen Posten in Discord, Feed-Verwaltung und Webhook-Settings nur für eingeloggte Admins sichtbar machen.
  * [ ] Öffentliche Navigation in Kopfzeile (`Header`) für Gäste um Free Games & News ergänzen.

---

### 2. 📅 Game Release Kalender (`/releases` & `/kalender`)
* [ ] **Backend & Datenservice:**
  * [ ] Neuer Service `src/services/releaseService.ts` mit kuratierter Release-Liste oder API-Anbindung.
  * [ ] Speicherung von Titel, Release-Datum, Plattformen (PC, PS5, Xbox Series X/S, Switch, Game Pass), Genre, Store- und Trailer-Links.
  * [ ] Interne REST-API-Endpunkte `GET /api/releases` und `POST /api/releases` (für manuelle Admin-Einträge).
* [ ] **Web-Dashboard:**
  * [ ] Neue öffentliche Seite `web/src/app/releases/page.tsx`.
  * [ ] Timeline- und Monats-Ansicht (Kommende Wochen / Dieser Monat / Nächster Monat / Später).
  * [ ] Filter nach Plattform (PC, PlayStation, Xbox, Nintendo, Game Pass Day One).
  * [ ] Detail-Karten mit Cover, Release-Countdown und Vorbestell-/Store-Links.
* [ ] **Discord Slash-Command:**
  * [ ] Befehl `/releases` (Optionen: `zeitraum: diese_woche | dieser_monat | naechster_monat`, `plattform: alle | pc | console`).
  * [ ] Elegantes Discord-Embed mit Verlinkung zum Web-Kalender.
* [ ] **Automatischer Wochen-Scheduler:**
  * [ ] Montags-Post um 10:00 Uhr im Game-News-Kanal mit den wichtigsten Releases der laufenden Woche.

---

### 3. 🏆 Level-Rollen-Belohnungen (Automatische Meilensteine)
* [ ] **Bot-Levelsystem (`statsService.ts`):**
  * [ ] Konfigurationsfeld `roleRewards: Record<number, string>` (Level -> Discord-Rollen-ID) in der Guild-Config speichern.
  * [ ] Level-Up-Handler erweitern: Prüfen, ob für das erreichte Level eine Belohnungs-Rolle hinterlegt ist.
  * [ ] Automatische Zuweisung der Discord-Rolle an das Mitglied.
  * [ ] Glückwunsch-Nachricht im Chat oder konfigurierten Ankündigungskanal mit Erwähnung der neuen Rolle.
* [ ] **Web-Dashboard (`/stats`):**
  * [ ] Einstellungs-Reiter „Rollen-Belohnungen“ im Stats-Konfigurationsbereich.
  * [ ] Interaktive Zuweisungs-Tabelle: Level auswählen (z. B. 5, 10, 15, 20, 25) und Server-Rolle aus Dropdown zuordnen.
  * [ ] Speichern über `/api/config/stats`.
* [ ] **Retroaktive Nachrüstung:**
  * [ ] Button oder Befehl `/rank sync-roles`, um bestehenden Mitgliedern nachträglich die ihren Leveln entsprechenden Rollen zuzuweisen.

---

## 🎯 Priorität 2: Community- & Interaktions-Features

### 4. 🔴 „Gerade Live“-Widget auf der Dashboard-Startseite
* [ ] Live-Banner auf `web/src/app/page.tsx` (`glgbot.brogameryt.de`).
* [ ] Zeigt aktuell aktive Streamer aus der Community in Echtzeit an (Twitch/YouTube/Voice).
* [ ] Anzeige mit Avatar, Stream-Titel, Spiel und 1-Klick-Direktlink zum Stream.

---

### 5. 🎁 `/daily` Belohnungs- & Streak-System
* [ ] Täglicher Belohnungs-Befehl `/daily` für Mitglieder.
* [ ] Feste Basis-XP (z. B. +50 XP) plus ansteigender Streak-Bonus (z. B. Tag 2: +60 XP, Tag 7: +200 XP).
* [ ] 24h-Cooldown mit 36h-Kulanzfenster für Streaks.
* [ ] Streak-Anzeige im Rang-Befehl `/rank` und im Dashboard-Profil.

---

### 6. 🎉 Giveaway-System (`/giveaway`)
* [ ] Befehle:
  * [ ] `/giveaway start <dauer> <gewinner_anzahl> <preis> [rolle]`
  * [ ] `/giveaway end <message_id>`
  * [ ] `/giveaway reroll <message_id>`
* [ ] Interaktives Embed mit „🎉 Teilnehmen“-Button, Teilnehmerzähler in Echtzeit und Live-Countdown.
* [ ] Automatische Zufallsziehung bei Ablauf mit Gewinner-Benachrichtigung und Audit-Log.
* [ ] Optional: Rollen-Voraussetzung (z. B. nur für Level 5+ oder bestimmte Community-Rollen).

---

### 7. 🖼️ Grafische Rangkarte (Canvas / SVG)
* [ ] Visuelle Rank-Card bei `/rank` statt reinem Text-Embed:
  * [ ] Nutzer-Avatar mit Discord-Status.
  * [ ] Aktuelles Level & Ranglistenplatz (#1, #2, ...).
  * [ ] Visueller Fortschrittsbalken mit XP bis zum nächsten Level.
  * [ ] Community-Badges / Meilensteine.

---

### 8. 🌐 TeamSpeak- & Game-Server Status-Widget
* [ ] Live-Status-Abfrage für GermanyLanGame Server (TeamSpeak 3 / CS2 / Minecraft / etc.).
* [ ] Anzeige im Web-Dashboard (Online-Status, Spieleranzahl, IP zum Kopieren).
* [ ] Discord-Slash-Befehl `/serverstatus` mit Live-Embed.

---

### 9. 🛡️ Erweiterter Auto-Mod & Anti-Spam
* [ ] Automatische Erkennung und Löschung von unerlaubten Discord-Einladungslinks fremder Server.
* [ ] Mass-Mention-Schutz (>5 Mentions = Auto-Löschung + Verwarnung).
* [ ] Verknüpfung mit dem Levelsystem: Automatische Strafpunkte (-XP) bei moderativen Vorfällen.

---

## 🎧 Großes Feature: Hybrides Musik- & Audio-System (Sub-Bot & All-in-One wählbar)

> **Architektur-Ziel:** Für eine spätere Veröffentlichung konfigurierbar machen:
> * **Modus A (Sub-Bot Worker):** Dedizierter Bot-Account („GLG Music“) mit eigenem Token – maximale Performance ohne Last für den Haupt-Bot.
> * **Modus B (Embedded / All-in-One):** Direkt im Haupt-Bot integriert – kein 2. Bot nötig, perfekt für einfache Server oder Ein-Klick-Setup.

* [ ] **Konfiguration & Modus-Auswahl (`config/music.json` / `.env`):**
  * [ ] Schalter `MUSIC_MODE: "subbot" | "embedded" | "disabled"`.
  * [ ] Im Sub-Bot-Modus: Eigener Token (`MUSIC_BOT_TOKEN`), eigener PM2-Prozess `discord-music`, Befehle werden durchgereicht oder direkt vom Sub-Bot registriert.
  * [ ] Im Embedded-Modus: Haupt-Bot verbindet sich selbst in den Voice-Kanal.
* [ ] **Audio-Engine & Quellen:**
  * [ ] **📁 Lokale Dateien & Soundboard:**
    * [ ] Musik-Verzeichnis auf dem Server (`data/music/`).
    * [ ] Wiedergabe lokaler MP3/WAV/FLAC-Dateien (`/play local:<dateiname>`).
    * [ ] Soundboard-Modus für kurze Sounds & Memes (`/soundboard <sound>`).
  * [ ] **🎵 Spotify-Unterstützung:**
    * [ ] Erkennung von Tracks, Alben und Playlists (`spotify.com/track/...`, `.../playlist/...`).
    * [ ] Metadaten-Auflösung via Spotify Web API (Titel + Artist).
    * [ ] Automatische Hintergrund-Suche des passenden Audio-Streams via YouTube / SoundCloud.
  * [ ] **🎥 YouTube & Web-Streams:**
    * [ ] Audio-Streaming via `yt-dlp` / Play-DL (mit Cookie/Proxy-Option gegen Bot-Sperren) oder Lavalink-Node.
  * [ ] **📻 24/7 Web-Radio:**
    * [ ] Direkte MP3/AAC-Livestreams (z. B. I Love Radio, BigFM, Lofi Girl 24/7) ohne Rate-Limits (`/radio <sender>`).
* [ ] **Discord Slash-Commands:**
  * [ ] `/play <query_oder_link>` (sucht Song oder spielt Link ab).
  * [ ] `/skip`, `/stop`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/volume <1-100>`, `/loop`.
  * [ ] Interaktives Embed mit Steuerungs-Buttons (`⏮️`, `⏯️`, `⏭️`, `⏹️`, `🔀`, `🔁`).
* [ ] **Web-Dashboard Musik-Zentrale (`/music`):**
  * [ ] Live-Anzeige des aktuellen Tracks mit Cover, Fortschrittsbalken und Queue-Liste.
  * [ ] Web-Controls (Play/Pause, Skip, Lautstärke per Slider).
  * [ ] Datei-Uploader: Eigene MP3s direkt im Browser hochladen und der Server-Bibliothek hinzufügen.

---

## 📊 Abgeschlossene Meilensteine (History)

* [x] **v2.3.0 (Aktuell live):**
  * [x] Konfigurierbare Live-Stream Benachrichtigungen (Rollen-Pings `@bn.live`, `@silent`-Modus, Custom Message im Web & Chat).
  * [x] Detaillierte Aktivitäts- & XP-Aufschlüsselung (Chat vs. Voice, Netto-Berechnung, Abzüge bei Strafen).
  * [x] Dynamisches 25-Stufen Levelsystem mit quadratischer XP-Kurve und flexiblen Vergabe-Raten.
  * [x] Audit-Logging, Anti-Nuke, Ticket-System, VoiceMaster-Lobbys, Free-Games Auto-Tracker.
  * [x] 24/7 Hosting auf Proxmox CT 109 mit Caddy SSL & PM2.
