# 📋 GLGBot & Web-Dashboard – To-Do & Roadmap

Zentrale Übersicht aller geplanten Features, Verbesserungen und Erweiterungen für den GLGBot und das Web-Dashboard.

**Aktueller Stand:** v2.6.0 (siehe History ganz unten)

> ✅ **Grundsatz-Entscheidung getroffen (11.10.2026):** Ein Bot bedient **mehrere Server, maximal 5**, und nur Server auf einer **Freigabe-Liste** (Details: Punkt 16). Das Open-Source-Modell bleibt parallel bestehen – jeder kann den Bot weiterhin selbst hosten.
> 👉 **Neue Features ab jetzt immer mit `guildId` bauen** (Einstellungen pro Server speichern, nie `GUILD_ID` fest verwenden), damit sie beim Umbau nicht nochmal angefasst werden müssen.

---

## 🚀 Priorität 1: Sofort anstehend

### 1. 🎁 Free Games & Game News öffentlich (Read-Only ohne Login)
* [ ] **Middleware & Routen:**
  * [ ] `/free-games` und `/news` in `web/src/middleware.ts` zu den öffentlichen Seiten (`isPublicPage`) hinzufügen.
  * [ ] GET-Endpunkte `GET /api/bot/free-games` und `GET /api/bot/news` für Gäste freigeben (`isPublicApi`).
* [ ] **UI-Anpassungen:**
  * [ ] Login-Status im Client über `GET /api/auth/me` prüfen (es gibt kein `useSession` – das gehört zu NextAuth) in `web/src/app/free-games/page.tsx` und `web/src/app/news/page.tsx`.
  * [ ] **Gast-Modus:** Alle Spiele-Karten, Filter, Countdowns, Store-Links und Treiber-Updates anzeigen.
  * [ ] **Admin-Controls verbergen:** Buttons zum Manuellen Posten in Discord, Feed-Verwaltung und Webhook-Settings nur für eingeloggte Admins sichtbar machen.
  * [ ] Öffentliche Navigation in Kopfzeile (`Header`) für Gäste um Free Games & News ergänzen.

---

### 2. 📅 Game Release Kalender (`/releases` & `/kalender`)
> ⚠️ **Datenquelle vorher klären:** Es gibt keine gute kostenlose Release-API ohne Anmeldung. Optionen: **IGDB** (braucht Twitch-Developer Client-ID/Secret), **RAWG** (API-Key, Free-Tier), **Steam „Demnächst“** (nur PC) oder eine **kuratierte Liste** (muss jemand von Hand pflegen).

* [ ] **Backend & Datenservice:**
  * [ ] Neuer Service `src/services/releaseService.ts` mit kuratierter Release-Liste oder API-Anbindung.
  * [ ] Speicherung von Titel, Release-Datum, Plattformen (PC, PS5, Xbox Series X/S, Switch, Game Pass), Genre, Store- und Trailer-Links.
  * [ ] Interne Bot-API `GET /releases` und `POST /releases` (im Dashboard über `/api/bot/releases`, für manuelle Admin-Einträge).
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
  * [ ] Speichern über `/api/bot/stats/config` (wie die übrigen XP-Einstellungen).
* [ ] **Retroaktive Nachrüstung:**
  * [ ] Button oder Befehl `/rank sync-roles`, um bestehenden Mitgliedern nachträglich die ihren Leveln entsprechenden Rollen zuzuweisen.

---

## 🎯 Priorität 2: Community- & Interaktions-Features

### 4. 🔴 „Gerade Live“-Widget auf der Dashboard-Startseite
* [ ] Live-Banner auf der Dashboard-Startseite `web/src/app/page.tsx`.
* [ ] Zeigt aktuell aktive Streamer aus der Community in Echtzeit an (Twitch/YouTube/Voice).
* [ ] Anzeige mit Avatar, Stream-Titel, Spiel und 1-Klick-Direktlink zum Stream.

---

### 5. 🎁 `/daily` Belohnungs- & Streak-System
* [ ] Täglicher Belohnungs-Befehl `/daily` für Mitglieder.
* [ ] Feste Basis-XP (z. B. +50 XP) plus ansteigender Streak-Bonus (z. B. Tag 2: +60 XP, Tag 7: +200 XP).
* [ ] 24h-Cooldown mit 36h-Kulanzfenster für Streaks.
* [ ] Hinweis: `/daily` steht auch in Punkt 15 (Economy) – **ein** gemeinsamer Befehl: erst XP, später zusätzlich Coins.
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
> Zusammen mit Punkt 12 (Willkommens-Karten) bauen – beide brauchen dieselbe Bild-Bibliothek (z. B. `@napi-rs/canvas`).

* [ ] Visuelle Rank-Card bei `/rank` statt reinem Text-Embed:
  * [ ] Nutzer-Avatar mit Discord-Status.
  * [ ] Aktuelles Level & Ranglistenplatz (#1, #2, ...).
  * [ ] Visueller Fortschrittsbalken mit XP bis zum nächsten Level.
  * [ ] Community-Badges / Meilensteine.

---

### 8. 🌐 TeamSpeak- & Game-Server Status-Widget
* [ ] Live-Status-Abfrage für eigene Game-Server (TeamSpeak 3 / CS2 / Minecraft / etc.) – Server-Adressen im Dashboard einstellbar.
* [ ] Anzeige im Web-Dashboard (Online-Status, Spieleranzahl, IP zum Kopieren).
* [ ] Discord-Slash-Befehl `/serverstatus` mit Live-Embed.

---

### 9. 🛡️ Erweiterter Auto-Mod & Anti-Spam
* [x] Automatische Erkennung und Löschung von unerlaubten Discord-Einladungslinks fremder Server *(gibt es schon in `blacklistService.ts`)*.
* [ ] Mass-Mention-Schutz (>5 Mentions = Auto-Löschung + Verwarnung).
* [ ] Verknüpfung mit dem Levelsystem: Automatische Strafpunkte (-XP) bei moderativen Vorfällen.

---

## 🎧 Großes Feature: Hybrides Musik- & Audio-System (Sub-Bot & All-in-One wählbar)

> **Architektur-Ziel:** Für eine spätere Veröffentlichung konfigurierbar machen:
> * **Modus A (Sub-Bot Worker):** Dedizierter Bot-Account („GLG Music“) mit eigenem Token – maximale Performance ohne Last für den Haupt-Bot.
> * **Modus B (Embedded / All-in-One):** Direkt im Haupt-Bot integriert – kein 2. Bot nötig, perfekt für einfache Server oder Ein-Klick-Setup.
>
> **Empfohlene Reihenfolge:** Zuerst nur **Modus B** und nur stabile Quellen (**Web-Radio** und **eigene MP3s**). Zwei Modi von Anfang an verdoppeln den Aufwand.
> **YouTube** zuletzt und als „kann ausfallen“ kennzeichnen: YouTube sperrt Bots regelmäßig, und das Abspielen über `yt-dlp` verstößt gegen die YouTube-Nutzungsbedingungen.
> **Spotify** lässt sich nicht direkt abspielen – es wird nur der Titel ausgelesen und der Song anderswo (YouTube/SoundCloud) gesucht.
> Technisch nötig: `@discordjs/voice`, `ffmpeg` und eine Opus-Bibliothek auf dem Server.

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
* [ ] Automatische Rollenvergabe (Autorole) bei Beitritt – **nur wenn die Regel-Sperre aus ist**. `@Gast` bekommt man bei uns erst mit „Regeln akzeptieren“; wer sie sofort bekommt, sieht den ganzen Server, ohne die Regeln zu lesen.
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
* [ ] Chat-Befehle `/balance`, `/pay <user> <amount>`, `/leaderboard coins` (`/daily` aus Punkt 5 wird um Coins erweitert).
* [ ] **Belohnungs-Shop (`/shop` & im Web-Dashboard):**
  * [ ] Kaufen von exklusiven Rollenfarben (z. B. Neon-Gelb, Cyber-Blau).
  * [ ] Eigene permanente Voice-Channel-Namen oder individuelle Profil-Badges.

---

## 🌐 Priorität 4: Public Release & Multi-Guild (max. 5 Server)

> **Architektur-Konzept:** **Ein einziger Bot-Prozess** (z. B. in einem Proxmox-Container) bedient **bis zu 5 freigegebene** Discord-Server gleichzeitig.
> * **Ressourcen:** Minimaler RAM-Verbrauch (~200 MB) für alle Server zusammen.
> * **Zentrale Wartung:** 1x `git pull` & `pm2 restart` aktualisiert alle Server simultan.
> * **Onboarding nur mit Freigabe:** Server-Besitzer können den Bot einladen, er bleibt aber nur auf Servern, die auf der Freigabe-Liste stehen.

### 16. 🏛️ Multi-Guild (max. 5 Server, nur Freigabe-Liste)
> ✅ **Entschieden:** maximal **5 Server**, nur Server auf der **Freigabe-Liste**.
> ⚠️ **Größter Umbau im ganzen Plan.** Bot & Dashboard sind fest auf einen Server ausgelegt: `GUILD_ID` steckt in 17 Stellen in Bot und Dashboard, die interne Bot-API (`src/api/internalApi.ts`) kennt nur einen Server.
> * Durch die Grenze von 5 Servern ist **keine Discord-Bot-Verifizierung** nötig (erst ab 100 Servern), die Privileged Intents bleiben ohne Antrag nutzbar.
> * Wer den Bot für fremde Server hostet, ist für deren Daten verantwortlich (**Datenschutz / DSGVO**, Datenschutzerklärung, Löschung auf Anfrage) – bei max. 5 bekannten Servern überschaubar, sollte aber trotzdem kurz geregelt werden.

* [ ] **🔒 Server-Freigabe & Begrenzung:**
  * [ ] Neue `.env`-Werte: `ALLOWED_GUILD_IDS` (kommagetrennte Server-IDs) und `MAX_GUILDS=5`. `GUILD_ID` bleibt als **Haupt-Server** (dein eigener Server, immer erlaubt).
  * [ ] Event `guildCreate`: Wird der Bot auf einen Server eingeladen, der **nicht auf der Freigabe-Liste** steht **oder** schon 5 Server belegt sind → **DM an den Server-Owner** mit kurzer Erklärung (z. B. „Dieser Bot ist privat und nur für freigegebene Server.“) und danach **Server sofort verlassen**.
  * [ ] Beim Bot-Start alle Server prüfen: nicht freigegebene Server werden ebenfalls verlassen (falls der Bot eingeladen wurde, während er offline war).
  * [ ] Server-Verwaltung im Dashboard (nur für dich als Bot-Besitzer, `BOT_OWNER_ID` in der `.env`): Freigabe-Liste ansehen, Server hinzufügen/entfernen, Belegung „3 / 5 Server“ anzeigen, Einladungs-Link für freigegebene Server erzeugen.
  * [ ] Wird ein Server von der Liste entfernt: Bot verlässt ihn, Daten in `data/guilds/<guildId>/` werden nach 30 Tagen gelöscht (oder sofort auf Wunsch).

* [ ] **Globale Discord Slash-Commands:**
  * [ ] Globale Registrierung `applicationCommands(clientId)` – `deploy-commands` kann das schon, wenn `GUILD_ID` leer ist.
  * [ ] Befehle sind nach Einladung des Bots automatisch auf jedem Discord-Server verfügbar.
* [ ] **Strikte Daten- & Konfigurations-Trennung pro Server (`guildId` Partitionierung):**
  * [ ] Speicherstruktur pro Guild: `data/guilds/<guildId>/config.json`.
  * [ ] Jeder Server hat seine eigenen Kanäle (`#free-games`, `#logs`, `#voice-master`, etc.) und Rollen.
  * [ ] Vollständig getrennte Moderations-Cases, Level-Rankings und Audit-Logs (keine Datenvermischung).
* [ ] **Multi-Guild Server-Switcher im Web-Dashboard:**
  * [ ] Dropdown-Menü in der oberen Dashboard-Navigationsleiste mit allen Servern des eingeloggten Discord-Admins (gefiltert nach `Administrator` / `Manage_Guild`).
  * [ ] Server-Kacheln auf einer Übersicht-Seite (`/dashboard/servers`):
    * [ ] Bereits aktivierte Server verwalten (Klick schaltet aktiven Kontext um).
    * [ ] **„➕ Bot einladen“** nur für Server, die auf der Freigabe-Liste stehen (mit vorkonfigurierten OAuth2-Berechtigungen). Nicht freigegebene Server werden ausgegraut mit Hinweis „Nicht freigegeben“.
* [ ] **API-Mandantenfähigkeit:**
  * [ ] Alle Web-API-Routen (`/api/discord/*`, `/api/config/*`, `/api/bot/*` inkl. der internen Bot-API) akzeptieren den Header bzw. Query-Parameter `?guildId=<id>`.
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

### 20. 🏗️ 1-Klick Server-Templates & Auto-Setup Wizard

> **Ziel:** Richtet auf neuen oder bestehenden Discord-Servern in 15 Sekunden eine komplette, professionelle und sichere Server-Struktur ein.
>
> **Baut auf v2.6.0 auf:** Die Seite „Server einrichten“ (`/setup`) und `/setup-all` mit `src/services/setupService.ts` legen die Bot-Bereiche schon an – Templates ergänzen das nur um die allgemeine Server-Struktur (Kategorien, Chats, Team-Rollen) und sollten denselben Service nutzen statt eines zweiten Systems.

* [ ] **Vordefinierte Server-Typen (JSON-Templates in `src/templates/`):**
  * [ ] 🎮 **Gaming Clan / E-Sport:** Infos (Regeln, News), Community (Chat, Clips, Memes), Talk (VoiceMaster, AFK), Spiele-Lobbys.
  * [ ] 🌐 **Multi-Gaming Community:** Spiele-Kategorien getrennt nach Games (CS2, Valorant, LoL, GTA) mit Auto-Rollen / Reaction Roles.
  * [ ] 💻 **Coding / Dev / Tech:** Projekte, Dev-Talk nach Sprachen (JS/TS, Python, C++, Rust), Bug-Reports, Helpdesk.
  * [ ] 🌸 **Anime / Manga / Hangout:** Lobby, Anime-Talk, Fan-Art, Musik, Mini-Games.
  * [ ] 🔴 **Content Creator / Streamer:** Live-Alerts, Sub-Lounge, Giveaways, Fan-Chat, Kooperationen.
* [ ] **Wählbare Emoji- & Design-Stile:**
  * [ ] **Modern mit Emojis:** `💬・hauptchat`, `📢・news`, `🔊・talk-1`
  * [ ] **Clean / Minimalistisch:** `hauptchat`, `news`, `talk-1` (kleingeschrieben, ohne Emojis)
  * [ ] **Aesthetic / Symbole:** `〢・chat`, `〢・news`, `〢・voice`
  * [ ] **Box / Bold:** `「💬」chat`, `「📢」news`, `「🔊」voice`
* [ ] **Automatisches Berechtigungs-Hardening (Wasserdichte Sicherheit):**
  * [ ] Sichere Rollen-Hierarchie (`@Inhaber`, `@Admin`, `@Mod`, `@VIP`, `@Member`, `@Gast`).
  * [ ] Vollständige Permission Overwrites (Ankündigungen nur lesbar für `@everyone`, geschützte Mod-Logs, sichere VoiceMaster-Berechtigungen).
  * [ ] Nutzung der bestehenden Backup-Engine (`backupService.ts`) zum schnellen, fehlerfreien Ausrollen.
* [ ] **Bedienung via Web & Discord:**
  * [ ] **Web-Dashboard (`/templates`):** Interaktiver 3-Schritte-Assistent (Typ wählen -> Stil wählen -> Vorschau prüfen -> „Server einrichten“).
  * [ ] **Discord Slash-Command:** `/server-setup template:<typ> style:<stil> [wipe:true|false]` mit Sicherheits-Bestätigungs-Button.
  * [ ] ⚠️ `wipe` (Server vorher leeren) **nur mit automatischem Backup davor** – sonst löscht ein Fehlklick den kompletten Server. Am besten zusätzlich: nur der Server-Owner darf `wipe` nutzen.

---

### 21. 📦 1-Klick Installer & Deployment-Pakete (Docker, Windows .bat & Linux)

> **Ziel:** Jeder Nutzer kann den Bot & das Web-Dashboard in unter 3 Minuten auf seinem System installieren – ohne technische Vorkenntnisse.

> **Empfehlung:** Mit **Docker** anfangen – ein Befehl startet Bot + Dashboard auf Linux, NAS und Windows. Wichtig: Bot und Dashboard sprechen über `127.0.0.1:3101` miteinander → im Compose-Setup entweder ein gemeinsamer Container oder `BOT_API_HOST` konfigurierbar machen.

* [ ] **🐳 Docker & Docker-Compose (`docker-compose.yml` & `Dockerfile`):**
  * [ ] Sauberes Multi-Container-Setup für Bot und Next.js Web-Dashboard.
  * [ ] Unterstützt Linux, Proxmox, Unraid, Synology/QNAP NAS, TrueNAS und Windows Docker Desktop.
  * [ ] 1-Befehl-Start: `docker compose up -d`.
  * [ ] Persistente Volumes für `data/`, `config/` und `.env`.
  * [ ] Schnelle Updates mit `docker compose pull && docker compose up -d`.
* [ ] **🪟 Windows 1-Klick Installer (`install_windows.bat` & Setup-Assistent):**
  * [ ] System-Prüfung: Prüft, ob Node.js & Git vorhanden sind (mit automatischem Download-Hinweis).
  * [ ] Interaktiver Setup-Dialog im Terminal: Fragt Bot-Token, Client-ID etc. ab und erstellt automatisch die `.env`.
  * [ ] Automatischer Build (`npm install` und `npm run build` für Bot & Web).
  * [ ] Optionale Autostart-Einrichtung (Start beim Windows-Boot).
  * [ ] Erstellt eine bequeme Desktop-Verknüpfung `GLGBot_Starten.bat`.
* [ ] **🐧 Linux 1-Klick Setup-Skript (`install_linux.sh`):**
  * [ ] Automatisches Setup-Skript für Debian/Ubuntu/Proxmox-Container.
  * [ ] Richtet Node.js 22 LTS, PM2 Prozess-Manager und Caddy Reverse Proxy vollautomatisch mit `systemd` ein.

---

## 🧰 Bekannte Probleme & Technik-Schulden

* [ ] **Automatische Sicherung des `data/`-Ordners** (Level, Strafen, Einstellungen, Streamer): täglicher Export auf dem Server, z. B. 7 Tage aufbewahren. Wichtiger als die meisten neuen Features.
* [ ] **Backup wiederherstellen setzt die @everyone-Rechte zurück** – dadurch kann die Regel-Sperre aufgehoben werden. Nach dem Restore Sperre automatisch neu anwenden.
* [ ] **Twitch- & YouTube-Erkennung** läuft über inoffizielle Wege (Twitch-GQL, YouTube-Seite) und kann bei Änderungen kaputtgehen → langfristig offizielle Twitch-API (Client-ID/Secret) als Option.
* [ ] **„ping“-Auto-Antwort** reagiert in jedem Kanal → auf bestimmte Kanäle beschränken oder abschaltbar machen.
* [ ] **AMD- & Intel-Treiber-News** sind Beta (Seiten-Auslesen) und können ausfallen.
* [ ] **Öffentliches GitHub-Repo** (`BroGamerYT/GLGBot`) wird nicht automatisch aktualisiert: neue Versionen vor dem Hochladen auf private Daten prüfen (Domain, IPs, IDs, Namen).
* [ ] **Automatische Tests / Build-Check** (z. B. GitHub Actions: `tsc` + `next build` bei jedem Push), damit Fehler vor dem Hochladen auffallen.

---

## 📊 Abgeschlossene Meilensteine (History)

* [x] **v2.6.0 (Aktuell):**
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
