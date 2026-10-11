# 📋 GLGBot & Web-Dashboard – To-Do & Roadmap

Zentrale Übersicht aller geplanten Features, Verbesserungen und Erweiterungen für den GLGBot und das Web-Dashboard.

**Aktueller Stand:** v2.12.0 (siehe History ganz unten)

> ✅ **Grundsatz-Entscheidung getroffen (11.10.2026):** Ein Bot bedient **mehrere Server, maximal 5**, und nur Server auf einer **Freigabe-Liste** (Details: Punkt 16). Das Open-Source-Modell bleibt parallel bestehen – jeder kann den Bot weiterhin selbst hosten.
> 👉 **Neue Features ab jetzt immer mit `guildId` bauen** (Einstellungen pro Server speichern, nie `GUILD_ID` fest verwenden), damit sie beim Umbau nicht nochmal angefasst werden müssen.

---

## 🚀 Priorität 1: Sofort anstehend

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

## 🎯 Priorität 2: Community- & Interaktions-Features

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
  * [ ] Community-Badges / Meilensteine auf der Karte.

---

### 8. 🌐 TeamSpeak- & Game-Server Status-Widget
* [ ] Live-Status-Abfrage für eigene Game-Server (TeamSpeak 3 / CS2 / Minecraft / etc.) – Server-Adressen im Dashboard einstellbar.
* [ ] Anzeige im Web-Dashboard (Online-Status, Spieleranzahl, IP zum Kopieren).
* [ ] Discord-Slash-Befehl `/serverstatus` mit Live-Embed.

---

### 9. 🛡️ Erweiterter Auto-Mod & Anti-Spam
* [x] Automatische Erkennung und Löschung von unerlaubten Discord-Einladungslinks fremder Server *(gibt es schon in `blacklistService.ts`)*.
* [x] Mass-Mention-Schutz (>5 Mentions = Auto-Löschung + 10 Min. Timeout) *(v2.7.0)*.
* [x] Verknüpfung mit dem Levelsystem: Automatische Strafpunkte (-XP) bei moderativen Vorfällen *(Warn, Timeout, Knast, Kick, Ban, Wortfilter - einstellbar unter Level-Einstellungen)*.

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

### 10. 👥 LFG-System (Looking for Group / Mitspieler-Suche) ✅ v2.11.0
* [x] Slash-Command `/lfg spiel:<name> mitspieler:<anzahl> [rang:<rang>] [beschreibung:<text>]`.
* [x] Interaktives Discord-Embed mit Echtzeit-Slot-Anzeige (`🎮 Beitreten` & `❌ Verlassen` Buttons).
* [x] **Automatischer Voice-Move:** Sobald die Gruppe voll ist, pingt der Bot alle Teilnehmer und verschiebt sie automatisch in eine neu generierte temporäre VoiceMaster-Lobby (`🎮・[Spiel] Gruppe von [Leiter]`).

---

### 11. 🎬 Community-Clip-Showcase (`#clips`)
* [ ] Automatischer Video- & Clip-Detektor (erkennt Twitch Clips, YouTube Shorts, Medal.tv und Discord-Videodateien).
* [ ] Bot hängt automatisch Reaktions-Buttons an (`🔥 Upvote`, `😂 Lustig`).
* [ ] Wöchentlicher automatischer Post jeden Sonntagabend: Der meiste Upvote-Clip wird als „🏆 Clip der Woche“ gekürt und gepinnt.

---

### 12. 🖼️ Grafische Willkommens-Karten (Canvas / Dynamic Image) ✅ v2.12.0
* [x] Willkommens-Banner für neue Mitglieder:
  * [x] Nutzer-Avatar & Server-Icon gerendert.
  * [x] Benutzername, Tag und Server-Mitgliederzähler (`Du bist Mitglied #1.248!`).
* [x] Automatische Rollenvergabe (Autorole) bei Beitritt – **nur wenn die Regel-Sperre aus ist**. `@Gast` bekommt man bei uns erst mit „Regeln akzeptieren“; wer sie sofort bekommt, sieht den ganzen Server, ohne die Regeln zu lesen.
* [x] Im Web-Dashboard konfigurierbar: Willkommenskanal, Farbe, Überschrift, Untertitel und Text (mit Vorschau).
* [ ] Eigenes Hintergrundbild für die Willkommens-Karte.

---

### 13. 📊 Live Server-Statistik-Kanäle (Counter oben in der Serverliste) ✅ v2.10.0
* [x] Gesperrte Voice-Kanäle ganz oben auf dem Discord-Server, die sich alle 10 Minuten aktualisieren:
  * [x] `👥・Mitglieder: 1.250`
  * [x] `🔊・Im Voice: 24`
  * [x] `🔴・Gerade Live: 3`
  * [ ] `🎮・Game Server: Online` *(kommt mit Punkt 8)*
* [x] Vollständig konfigurierbar im Web-Dashboard (welche Counter aktiv sind, Emojis und Beschriftungen).

---

### 14. 🎂 Geburtstags-System (`/birthday`) ✅ v2.10.0
* [x] Befehl `/birthday set <tag>.<monat>`.
* [x] Automatische Überprüfung um 00:01 Uhr jeden Tag.
* [x] Feierliches Glückwunsch-Embed im Ankündigungskanal und automatische Zuweisung einer temporären Rolle (`🎉 Geburtstagskind`) für 24 Stunden.

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
  * [ ] Daten entfernter Server nach 30 Tagen automatisch löschen (bzw. sofort auf Knopfdruck).
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

### 18. 💬 Live Web-Konsole & Chat im Dashboard
* [ ] Textkanal im Dashboard auswählen und Live-Nachrichten in Echtzeit mitlesen.
* [ ] Nachrichten direkt als Bot in den Kanal senden oder auf Nachrichten antworten.

---

### 19. ⏰ Geplante Ankündigungen (Scheduled Messages) ✅ v2.10.0
* [x] Im Web-Dashboard unter `/announcements`:
  * [x] Nachricht oder Embed vorschreiben.
  * [x] Datum und Uhrzeit für die geplante Veröffentlichung wählen (z. B. LAN-Party Start, Event-Erinnerung).
  * [x] Automatische pünktliche Ausführung durch den Bot-Scheduler.

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

* [x] **Automatische Sicherung des `data/`-Ordners** *(v2.9.0: täglich nach `data/_snapshots/<Datum>/`, 7 Tage)* (Level, Strafen, Einstellungen, Streamer): täglicher Export auf dem Server, z. B. 7 Tage aufbewahren. Wichtiger als die meisten neuen Features.
* [x] **Backup wiederherstellen setzt die @everyone-Rechte zurück** *(v2.9.0: Sperre wird danach automatisch neu angewendet)* – dadurch kann die Regel-Sperre aufgehoben werden. Nach dem Restore Sperre automatisch neu anwenden.
* [ ] **Twitch- & YouTube-Erkennung** läuft über inoffizielle Wege (Twitch-GQL, YouTube-Seite) und kann bei Änderungen kaputtgehen → langfristig offizielle Twitch-API (Client-ID/Secret) als Option.
* [x] **„ping“-Auto-Antwort** *(v2.9.0: nur noch `!ping`)* reagierte in jedem Kanal → auf bestimmte Kanäle beschränken oder abschaltbar machen.
* [ ] **AMD- & Intel-Treiber-News** sind Beta (Seiten-Auslesen) und können ausfallen.
* [ ] **Öffentliches GitHub-Repo** (`BroGamerYT/GLGBot`) wird nicht automatisch aktualisiert: neue Versionen vor dem Hochladen auf private Daten prüfen (Domain, IPs, IDs, Namen).
* [x] **Automatische Tests / Build-Check** *(v2.9.0: GitHub Actions `.github/workflows/build.yml`)* (z. B. GitHub Actions: `tsc` + `next build` bei jedem Push), damit Fehler vor dem Hochladen auffallen.

---

## 📊 Abgeschlossene Meilensteine (History)

* [x] **v2.12.0 (Aktuell):**
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
