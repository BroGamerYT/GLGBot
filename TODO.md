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

## 🎮 Priorität 3: Gaming-Extras & Community-Wachstum

### 10. 👥 LFG-System (Looking for Group / Mitspieler-Suche)
* [ ] Slash-Command `/lfg spiel:<name> mitspieler:<anzahl> [rang:<rang>] [beschreibung:<text>]`.
* [ ] Interaktives Discord-Embed mit Echtzeit-Slot-Anzeige (`🎮 Beitreten` & `❌ Verlassen` Buttons).
* [ ] **Automatischer Voice-Move:** Sobald die Gruppe voll ist, pingt der Bot alle Teilnehmer und verschiebt sie automatisch in eine neu generierte temporäre VoiceMaster-Lobby (`🎮・[Spiel] Gruppe von [Leiter]`).

---

### 11. 🎬 Community-Clip-Showcase (`#clips`)
* [ ] Automatischer Video- & Clip-Detektor (erkennt Twitch Clips, YouTube Shorts, Medal.tv und Discord-Videodateien).
* [ ] Bot hängt automatisch Reaktions-Buttons an (`🔥 Upvote`, `😂 Lustig`).
* [ ] Wöchentlicher automatischer Post jeden Sonntagabend: Der meiste Upvote-Clip wird als „🏆 Clip der Woche“ gekürt und gepinnt.

---

### 12. 🖼️ Grafische Willkommens-Karten (Canvas / Dynamic Image)
* [ ] Willkommens-Banner für neue Mitglieder:
  * [ ] Nutzer-Avatar & Server-Icon gerendert.
  * [ ] Benutzername, Tag und Server-Mitgliederzähler (`Du bist Mitglied #1.248!`).
* [ ] Automatische Rollenvergabe (Autorole) bei Beitritt (`@Gast` oder Standard-Rolle).
* [ ] Im Web-Dashboard konfigurierbar: Willkommenskanal, Hintergrundbild, Farbverlauf und Text.

---

### 13. 📊 Live Server-Statistik-Kanäle (Counter oben in der Serverliste)
* [ ] Gesperrte Voice-Kanäle ganz oben auf dem Discord-Server, die sich alle 10 Minuten aktualisieren:
  * [ ] `👥・Mitglieder: 1.250`
  * [ ] `🔊・Im Voice: 24`
  * [ ] `🔴・Gerade Live: 3`
  * [ ] `🎮・Game Server: Online`
* [ ] Vollständig konfigurierbar im Web-Dashboard (welche Counter aktiv sind, Emojis und Beschriftungen).

---

### 14. 🎂 Geburtstags-System (`/birthday`)
* [ ] Befehl `/birthday set <tag>.<monat>`.
* [ ] Automatische Überprüfung um 00:01 Uhr jeden Tag.
* [ ] Feierliches Glückwunsch-Embed im Ankündigungskanal und automatische Zuweisung einer temporären Rolle (`🎉 Geburtstagskind`) für 24 Stunden.

---

### 15. 🪙 Community-Wirtschaft & Belohnungs-Shop (Economy)
* [ ] Server-Währung („GLG-Coins“) gesammelt durch Chat-Aktivität, Voice-Zeit, Streaks und Events.
* [ ] Chat-Befehle `/balance`, `/daily`, `/pay <user> <amount>`, `/leaderboard coins`.
* [ ] **Belohnungs-Shop (`/shop` & im Web-Dashboard):**
  * [ ] Kaufen von exklusiven Rollenfarben (z. B. Neon-Gelb, Cyber-Blau).
  * [ ] Eigene permanente Voice-Channel-Namen oder individuelle Profil-Badges.

---

## 🌐 Priorität 4: Public Release & 1-Bot-in-1-CT Multi-Guild Architektur

> **Architektur-Konzept:** **Ein einziger Bot-Prozess im Proxmox-Container (CT 109)** bedient unbegrenzt viele Discord-Server gleichzeitig.
> * **Ressourcen:** Minimaler RAM-Verbrauch (~200 MB) für beliebig viele Server.
> * **Zentrale Wartung:** 1x `git pull` & `pm2 restart` aktualisiert alle Server simultan.
> * **1-Klick-Onboarding:** Jeder Server-Besitzer kann den Bot per Invite-Link einladen, ohne eigene Server/Tokens zu benötigen.

### 16. 🏛️ Multi-Guild Datenisolation & Globale Commands (1 Bot -> N Server)
* [ ] **Globale Discord Slash-Commands:**
  * [ ] Umstellung von `applicationGuildCommands(clientId, guildId)` auf globale Registrierung `applicationCommands(clientId)`.
  * [ ] Befehle sind nach Einladung des Bots automatisch auf jedem Discord-Server verfügbar.
* [ ] **Strikte Daten- & Konfigurations-Trennung pro Server (`guildId` Partitionierung):**
  * [ ] Speicherstruktur pro Guild: `data/guilds/<guildId>/config.json`.
  * [ ] Jeder Server hat seine eigenen Kanäle (`#free-games`, `#logs`, `#voice-master`, etc.) und Rollen.
  * [ ] Vollständig getrennte Moderations-Cases, Level-Rankings und Audit-Logs (keine Datenvermischung).
* [ ] **Multi-Guild Server-Switcher im Web-Dashboard:**
  * [ ] Dropdown-Menü in der oberen Dashboard-Navigationsleiste mit allen Servern des eingeloggten Discord-Admins (gefiltert nach `Administrator` / `Manage_Guild`).
  * [ ] Server-Kacheln auf einer Übersicht-Seite (`/dashboard/servers`):
    * [ ] Bereits aktivierte Server verwalten (Klick schaltet aktiven Kontext um).
    * [ ] Nicht aktivierte Server mit einem 1-Klick-Link **„➕ Bot einladen“** (mit vorkonfigurierten OAuth2-Berechtigungen) hinzufügen.
* [ ] **API-Mandantenfähigkeit:**
  * [ ] Alle Web-API-Routen (`/api/discord/*`, `/api/config/*`, `/api/stats/*`) akzeptieren den Header bzw. Query-Parameter `?guildId=<id>`.
  * [ ] Serverseitige Autorisierungsprüfung: Darf der eingeloggte Discord-User diese spezifische `guildId` konfigurieren?

---

### 17. ⚡ Eigene Custom Commands & Text-Reaktionen
* [ ] Im Web-Dashboard unter `/custom-commands`:
  * [ ] Eigene Slash- oder Prefix-Befehle erstellen (z. B. `/ts`, `/lan`, `/regeln`, `/partner`).
  * [ ] Auswahl zwischen einfacher Textantwort oder formatiertem Discord-Embed mit Bildern.

---

### 18. 💬 Live Web-Konsole & Chat im Dashboard
* [ ] Textkanal im Dashboard auswählen und Live-Nachrichten in Echtzeit mitlesen.
* [ ] Nachrichten direkt als Bot in den Kanal senden oder auf Nachrichten antworten.

---

### 19. ⏰ Geplante Ankündigungen (Scheduled Messages)
* [ ] Im Web-Dashboard unter `/announcements`:
  * [ ] Nachricht oder Embed vorschreiben.
  * [ ] Datum und Uhrzeit für die geplante Veröffentlichung wählen (z. B. LAN-Party Start, Event-Erinnerung).
  * [ ] Automatische pünktliche Ausführung durch den Bot-Scheduler.

---

## 📊 Abgeschlossene Meilensteine (History)

* [x] **v2.3.0 (Aktuell live):**
  * [x] Konfigurierbare Live-Stream Benachrichtigungen (Rollen-Pings `@bn.live`, `@silent`-Modus, Custom Message im Web & Chat).
  * [x] Detaillierte Aktivitäts- & XP-Aufschlüsselung (Chat vs. Voice, Netto-Berechnung, Abzüge bei Strafen).
  * [x] Dynamisches 25-Stufen Levelsystem mit quadratischer XP-Kurve und flexiblen Vergabe-Raten.
  * [x] Audit-Logging, Anti-Nuke, Ticket-System, VoiceMaster-Lobbys, Free-Games Auto-Tracker.
  * [x] 24/7 Hosting auf Proxmox CT 109 mit Caddy SSL & PM2.
