# Ultimativer Discord-Bot & Web-Dashboard – Master-Spezifikation

Dieses Dokument dient als zentrale Entwicklungsübersicht und To-Do-Liste für den Bau eines modularen, allumfassenden Discord-Bots mit integriertem Web-Dashboard, Creator-Features, Automatisierungen, Schutzsystemen und Multi-Bot-Management.

---

## 1. Systemarchitektur & Tech-Stack

```
┌────────────────────────────────────────────────────────┐
│                      Next.js Web-UI                    │
│   (Dashboard, Embed-Builder, Logs, Backup, Tickets)    │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSocket / OAuth2
┌───────────────────────────▼────────────────────────────┐
│                    Zentrales Backend                   │
│         (Node.js / Python API + Authentifizierung)     │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼───────────────┐ ┌──────────▼─────────────┐
│       PostgreSQL / Redis    │ │     Bot-Worker-Pool    │
│  (Logs, Cases, Configs, DB) │ │  - Haupt-Bot           │
│                             │ │  - Musik-Worker        │
└─────────────────────────────┘ └────────────────────────┘
```

* **Bot-Core:** TypeScript (`discord.js` v14)
* **Web-Frontend:** Next.js, React, Tailwind CSS, Shadcn UI (Dark Theme)
* **Web-Auth:** Discord OAuth2 (Session-Prüfung auf Server-Administratorrechte) + 30-Minuten Schnell-Login via Code
* **Hosting / 24/7 Server:** Proxmox VE LXC Container 109 (`discordbot`), Debian 12, Node.js 22 LTS, PM2 Service
* **Reverse Proxy:** Caddy für automatische SSL-Zertifikate & Routing
* **Datenspeicher & Persistenz:** Atomare JSON-Dateisystem-Speicher (`writeJsonAtomic` mit Process-Locking) + automatische 7-Tage Snapshots (optional SQLite/Prisma für spätere Skalierung)
* **Audio-Worker:** Embedded Web-Radio & Soundboard / optionale Lavalink Node

---

## 2. Vollständige Master-To-Do-Liste

### Phase 1: Vorbereitung & Infrastruktur
- [x] **Discord Developer Portal:**
  - [x] Neue Application & Bot anlegen.
  - [x] Gateway Intents aktivieren (`Server Members`, `Message Content`, `Presence`).
  - [x] OAuth2 Redirect URL für das Web-Dashboard eintragen.
  - [x] Bot-Token und Client Secret sicher als Umgebungsvariablen (`.env`) konfigurieren.
- [x] **Entwicklungsumgebung & Persistenz:**
  - [x] Git-Repository initialisieren und Branch-Strategie definieren.
  - [x] Modulare Ordnerstruktur für Commands, Events, Services und Web aufsetzen (TypeScript / discord.js).
  - [x] Datenspeicher eingerichtet: Ausfallsichere atomare JSON-Storage-Engine mit rollierenden 7-Tage Snapshots und IDOR-Schutz.

---

### Phase 2: Sicherheit & Moderations-Systeme
- [x] **Anti-Nuke-System:**
  - [x] Ratenbegrenzung für administrative Aktionen (max. 3 Kanal-/Rollenlöschungen oder Bans pro Minute).
  - [x] Automatische Notfallsperre: Rechteroboter/Admin-Account Administratorenrechte entziehen, 24h Quarantäne-Timeout & Alarmierung im Audit-Log.
- [x] **Anti-Raid & Phishing-Schutz:**
  - [x] Regex-Muster- & Domain-Scanner zur Erkennung gefälschter Steam-, Nitro-, Discord-Gift- oder Phishing-Links (Auto-Löschung + Timeout).
  - [x] Erkennung von Massen-Beitritten (>6 Joins in 10s) mit Alarmierung.
- [x] **Verifikations-Schleuse (Gatekeeping):**
  - [x] Button-basierte Regelbestätigung (`✅ Regeln akzeptieren`) vergibt Gast-Rolle (`@Gast`) vor Server-Freischaltung (`/setup-roles`, Web-Dashboard).
- [x] **Moderations- & Case-System:**
  - [x] Slash-Commands: `/warn`, `/timeout`, `/kick`, `/ban`, `/unban`, `/case view`, `/case user`, `/case delete`, `/clear`.
  - [x] Eindeutige Fall-Nummern (`Case #101`) im JSON-Speicher mit Moderator, Grund, Zeitstempel, DM-Benachrichtigung und Audit-Log Anbindung.

---

### Phase 3: Creator- & Community-Module
- [x] **Live- & Content-Alerts:**
  - [x] Dynamische Streamer-Rolle beim Start zuweisen und bei Ende entfernen (`presenceUpdate`).
  - [x] Dynamische Live-Stream Kanäle (`🔴・[Name] ist live`) mit Link-Status und Embeds erstellen & bei Stream-Ende automatisch löschen (`/setup-live`).
  - [x] Konfigurierbarer Ankündigungskanal für Stream-Pings (`bn.live`).
  - [x] Auto-Kategorie `🔴 Live Streams` (kein ungefragter Automove).
  - [x] Chat-Befehle `/twitch-live start` und `/twitch-live stop`.
  - [x] **Twitch & YouTube:** Polling- & Benachrichtigungsservice (`streamNotificationService.ts`).
- [x] **Free-Games-Tracker:**
  - [x] Epic Games Store, Steam, GOG, Keys & mehr (100% Rabatt-Filter, Bilder, Countdown, Store-Links).
  - [x] Automatisierter Hintergrund-Scheduler (alle 30 Minuten) mit persistentem Duplikat-Schutz.
  - [x] Automatischer Post im `#free-games` Kanal mit `@bn.free`-Ping (konfigurierbar).
  - [x] Slash-Befehle `/free-games list` und `/free-games post`.
- [x] **Auto-Move & Temporäre Voice-Kanäle (VoiceMaster Parität):**
  - [x] "Join to Create"-Masterkanal konfigurieren (`/setup-voice`).
  - [x] Beim Betreten dynamisch neuen Kanal `🔊・Lobby von [Name]` anlegen (exakt unter Masterkanal) und Nutzer verschieben.
  - [x] Kanal automatisch löschen, sobald sich 0 Personen darin aufhalten.
  - [x] Interaktives VoiceMaster-Dashboard (`/interface` / `/voice-panel`) mit Dropdowns & Modals.
  - [x] Automatisches Steuerungs-Panel direkt im Textchat der neu erstellten Sprach-Lobby gepostet.
  - [x] Vollständige Voice-Befehle: `/voice lock`, `/voice unlock`, `/voice hide`, `/voice unhide`, `/voice permit`, `/voice reject`, `/voice transfer`, `/voice claim`, `/voice bitrate`.
  - [x] Temporärer Textkanal verknüpft mit Sprach-Lobby (automatisches Mitlöschen).
  - [x] Automatischer Kanalname basierend auf aktuellem Spiel (`/voice game`).
- [x] **Rollen-Management & Onboarding:**
  - [x] Berechtigungs- & Rollen-Zentrum (`/roles` im Web, `/setup-roles` im Chat).
  - [x] Interaktives Rollen-Panel mit 1-Klick Buttons (`Gast`, `bn.live`, `bn.free`, `Meine Rollen`).
  - [x] Ephemere Rollen-Statusprüfung und Toggles ohne Chat-Spam.
- [x] **Ticket- & Support-System:**
  - [x] Erstellung privater Ticket-Kanäle via Button (`📩 Support-Ticket erstellen`) mit Rollen-Berechtigungen (`/setup-tickets`).
  - [x] Ticket-Steuerung mit Buttons (`🔒 Ticket schließen`, `📄 Transkript erstellen`).
  - [x] Automatische `.txt`-Transkripterstellung per DM und Archivierung in Audit-Logs vor der Kanal-Löschung.
- [x] **Community-Tools:**
  - [x] Vorschlagssystem (`/suggest neu <idee>`, `/suggest status <id> <entscheidung>`) mit Upvote/Downvote-Buttons und Echtzeit-Zähler.
  - [x] Sticky Messages (`/sticky set <nachricht>`, `/sticky remove`) mit Schleifenschutz für automatisches Nachrücken.

---

### Phase 4: Logging & Server-Backups
- [x] **Lückenloses Audit-Logging:**
  - [x] **Nachrichten:** Gelöschte Nachrichten (mit Inhalt/Attachments), Bearbeitungen (Vorher/Nachher).
  - [x] **Server:** Rollenerstellung, Rollenänderungen, Rollenlöschungen, Kanalerstellungen/-änderungen/-löschungen, Emojis, Sticker, Servereinstellungen.
  - [x] **Mitglieder:** Joins, Leaves, Nickname-Änderungen, Rollenvergaben.
  - [x] **Voice:** Beitritt, Verlassen, Kanalwechsel, Mute/Deafen-Status.
  - [x] Strukturierte Speicherung aller Logs in der JSON-Datenbank für die Webansicht.
  - [x] Discord Slash-Commands (`/setup-logs`, `/logs`).
  - [x] Stumme Audit-Logs (`SuppressNotifications` Flag) gegen Notification-Spam.
- [x] **Backup- & Restore-Engine:**
  - [x] JSON-Snapshot aller Rollen (Farben, Rechte, Position).
  - [x] JSON-Snapshot aller Kategorien und Kanäle inklusive Berechtigungsüberschreibungen (*Permission Overwrites*).
  - [x] Geplanter automatischer Snapshot (täglich um Mitternacht mit 20-Snapshot-Retention).
  - [x] 1-Klick-Wiederherstellung bzw. Klon-Funktion für Rollen und Kanäle.
  - [x] Discord Slash-Commands (`/backup create`, `/backup list`, `/backup restore`, `/backup export`, `/backup delete`).

---

### Phase 5: Web-Dashboard (Admin-Interface)
- [x] **Basis & Live-Bereitstellung :**
  * [x] Next.js 14 Frontend im modernen Discord Dark Theme (Tailwind CSS, Lucide Icons).
  * [x] Direkte REST-API Anbindung an Discord Gateway (`/api/discord/guild`) für Live-Kanäle, Kategorien und Rollen.
  * [x] PM2 Deployment (`discord-web` auf Port 3000) mit Caddy Reverse Proxy & Let's Encrypt SSL.
  * [x] Discord OAuth2 Login mit Rollen-/Berechtigungsprüfung (`Administrator`).
- [x] **Zwei-Wege Kanal- & VoiceMaster-Manager (`/voice`):**
  * [x] Grafische Konfiguration von Master-Sprachkanal und Ziel-Kategorie.
  * [x] 1-Klick-Aktion: Sendet das interaktive VoiceMaster-Panel mit Dropdowns in beliebige Discord-Textkanäle.
  * [x] Sofortige Zwei-Wege-Synchronisation ohne Bot-Neustart (Web <-> `/setup-voice`).
- [x] **Live-Streamer Manager (`/live`):**
  * [x] Web-Konfiguration für Streamer-Rolle, Ziel-Kategorie und Kanal-Art (Voice mit Status oder Text).
  * [x] Auto-Rollen-Erkennung per Toggle aktivierbar.
  * [x] Zwei-Wege-Synchronisation mit `/setup-live` im Discord-Chat.
- [x] **Live-Audit-Log-Viewer (`/logs`):**
  * [x] Interaktive Datentabelle mit Filterung nach Event-Typ, Moderator, Nutzer und Suchbegriffen.
  * [x] Detail-Ansicht für Nachrichten-Diffs (Vorher/Nachher), Rollen-Updates und Voice-Aktivitäten.
  * [x] Schnell-Setup für den geschützten Audit-Log Kanal (`📁・audit-logs`).
- [x] **Visueller Embed-Builder (`/embeds`):**
  * [x] WYSIWYG-Editor mit Live-Discord-Vorschau (Farben, Titel, Beschreibungen, Felder, Bilder, Footer, Timestamp).
  * [x] Vorlagen (Ankündigung, Regeln, Events, Leeren).
  * [x] Direkter Versand-Button in einen gewählten Discord-Kanal via interner Bot-API.
- [x] **Backup-Center (`/backups`):**
  * [x] Übersicht aller vorhandenen JSON-Snapshots mit Rollen-/Kanal-Zählern und Dateigröße.
  * [x] Manueller 1-Klick Backup-Auslöser.
  * [x] Selektive Wiederherstellung (Alles, nur Rollen, nur Kanäle) direkt aus dem Web.

---

### Phase 6: Multi-Bot-Architektur & System-Monitoring
- [x] **24/7 Server-Hosting & Bereitstellung:**
  - [x] Proxmox VE LXC Container (Debian 12, Node 22).
  - [x] PM2 Daemon mit `systemd` Autostart bei Reboot.
  - [x] Caddy Reverse Proxy mit automatischem Let's Encrypt SSL.
  - [x] All-in-One Desktop Launcher & Synchronisations-Skript (`start.bat`).
- [ ] **Sub-Bot- & Musik-Architektur (Konfigurierbar für Public Release):**
  - [ ] **Modus A (Sub-Bot Worker):** Prozess-Trennung – Haupt-Bot läuft unabhängig vom rechenintensiven Musik-Worker (`discord-music` mit eigenem Token).
  - [ ] **Modus B (Embedded / All-in-One):** Musik-Engine läuft direkt im Haupt-Bot (für einfache Installationen).
  - [ ] **Quellen:** Lokale MP3-Dateien & Soundboard, Spotify (Meta-Auflösung), YouTube (`yt-dlp` / Lavalink), Web-Radio.
  - [ ] **Web-Player:** Live-Player mit Queue und MP3-Upload im Dashboard (`/music`).
- [ ] **System- & Status-Monitoring:**
  - [ ] Live-Anzeige der Bot-Latenz (Gateway-Ping), RAM-Auslastung und Uptime im Dashboard.
  - [ ] Benachrichtigung des Admins, falls ein Worker offline geht.

---

## 3. Datenbank-Schema (Entwurf)

```sql
-- Server-Konfiguration
CREATE TABLE guilds (
    guild_id VARCHAR(20) PRIMARY KEY,
    prefix VARCHAR(5) DEFAULT '/',
    log_channel_id VARCHAR(20),
    join_voice_channel_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit-Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) REFERENCES guilds(guild_id),
    user_id VARCHAR(20) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(20),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderations-Fälle (Cases)
CREATE TABLE mod_cases (
    case_id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) REFERENCES guilds(guild_id),
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL, -- WARN, MUTE, KICK, BAN
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server-Backups
CREATE TABLE server_backups (
    backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(20) REFERENCES guilds(guild_id),
    name VARCHAR(100),
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4. Meilensteine & Roadmap-Status

* [x] **Sprint 1:** Bot-Basis aufsetzen + Auto-Move Voice + Free-Games Cronjob.
* [x] **Sprint 2:** Stream-Alerts (Twitch/YouTube) + Rollen-Vergabe bei Live-Start & Konfigurierbare Benachrichtigungen (`@silent`, Pings).
* [x] **Sprint 3:** Logging-Engine + Backup/Restore-Logik (JSON-Export).
* [x] **Sprint 4:** Next.js Dashboard mit Discord OAuth2 + Embed-Builder.
* [x] **Sprint 5:** Anti-Nuke-Schutz + Ticketsystem mit Web-Transkripten.
* [x] **Sprint 6:** XP- & Levelsystem v2.3.0 (25 Level, quadratische XP-Kurve, Aktivitätsaufschlüsselung Chat vs. Voice).
* [x] **Sprint 7 (Abgeschlossen v2.7.0 - v2.16.0):**
  * [x] Öffentliches Free Games & Game News Showcase ohne Login (Read-Only für Gäste, Admin-Controls geschützt).
  * [x] Game Release Kalender (`/releases` im Chat & Web mit Timeline, Countdowns und Plattform-Badges).
  * [x] Automatische Level-Rollen-Belohnungen (Zuweisung von Meilenstein-Rollen im Dashboard & Level-Up).
  * [x] Live-Streamer Widget auf der Dashboard-Startseite (`glgbot.brogameryt.de`).
  * [x] Tägliches Belohnungssystem (`/daily`), Giveaways (`/giveaway`) und TeamSpeak/Game-Server Status.
* [x] **Sprint 9 (Gaming, Community & Wirtschaft – v2.11.0 - v2.20.0):**
  * [x] LFG-System (`/lfg`) mit automatischem Move in neue temporäre VoiceMaster-Lobby.
  * [x] Clip-Showcase (`#clips` mit Upvotes & wöchentlicher Clip der Woche).
  * [x] Dynamische Willkommens-Karten (Canvas), Auto-Role und Live-Kanalzähler (Mitglieder/Voice).
  * [x] Geburtstagssystem (`/birthday`), Server-Währung mit Belohnungs-Shop (`/shop`, `/economy`) & XP-Börse.
  * [x] Discord-Namensfarben & Farbrollen-Shop mit automatischem Rollentausch.
* [x] **Sprint 10 (Multi-Guild, Deployment & Hardening – v2.8.0 - v2.23.0):**
  * [x] 1 zentraler Bot-Prozess auf Proxmox CT 109 bedient bis zu 5 Discord-Server auf Freigabeliste.
  * [x] Strikte Mandantentrennung mit `guildId`-Speichern, IDOR-Prävention und Cookie-Routing im Dashboard.
  * [x] Multi-Guild Server-Switcher im Web-Dashboard („Bot einladen“ + Guild-Wechsel per Dropdown).
  * [x] **1-Klick Server-Templates & Auto-Setup Wizard:** Vollständige Einrichtung (Gaming, Coding, Anime, Creator, Mega-Community) mit Unicode-Designer & Berechtigungs-Hardening.
  * [x] **1-Klick Installer-Pakete:** Docker & Docker-Compose, Windows 1-Klick Setup (`install_windows.bat`) und Linux (`install_linux.sh`).
  * [x] System-Manager & Live-Prozess-Logkonsole (`/system-logs`) mit 1-Klick Neustart und PM2-Überwachung.
  * [x] 30-Minuten Schnell-Login via Code (`/web-login`) und Shop-Freigabe für normale Mitglieder.
* [ ] **Sprint 8: Audio-System (Fokus auf Web-Radio & Soundboard):**
  * [ ] Konfigurierbarer Modus: Vorrangig Embedded im Haupt-Bot via `@discordjs/voice`.
  * [ ] 24/7 Web-Radio (Lofi, Gaming, TechnoBase etc. via stabile Shoutcast/Icecast Streams).
  * [ ] Lokales Soundboard & MP3-Upload im Dashboard (`data/music/`, `/soundboard <sound>`).
  * [ ] Optional: Lavalink-Verbindung mit Cookie-Support für externe YouTube-Streaming-Nodes.
* [ ] **Sprint 11: 📦 Ultra-Backup v3 (Chat-Inhalte, Voice-Logs & 1:1 Bot-Konfigurations-Spiegelung):**
  * [ ] **Chat-Inhalte & Nachrichtenverlauf:** Sicherung der letzten *N* Nachrichten pro Textkanal (inkl. Autoren, Zeitstempel, Embeds, Dateianhängen und Reaktionen). Export als interaktives HTML-Transkript und JSON.
  * [ ] **Voice-Channel Historie:** Sicherung von VoiceMaster-Lobbys, Kanal-Limits, Bitraten und Sprachaktivitäts-Logs.
  * [ ] **1:1 Server- & Bot-Einstellungen im Snapshot:** Vollständige Sicherung aller Bot-Dateien (Modul-Zustände, Rollen-IDs, XP-Multiplikatoren, Economy-Shop, Knast-Zeiten, Willkommens-Banner, Streamer-Alerts).
  * [ ] **Intelligenter Cross-Server ID-Remapper:** Automatische 1:1 Übersetzung alter Discord-IDs auf neu generierte IDs bei Wiederherstellung auf fremden Servern.
  * [ ] **Notfall-Tresor (Cloud/Discord-Export):** Regelmäßiger automatischer Export verschlüsselter Snapshots in den geschützten Admin-Kanal `#🔒・bot-backups` plus DM-Benachrichtigung.
* [ ] **Sprint 12: 🧩 Modularer 1-Klick Setup Wizard ("Alles einrichten nach Wunsch-Modulen"):**
  * [ ] **Modul-Matrix im Web (`/setup`, `/templates`) & Chat (`/setup-all`):** Checkboxen für alle gewünschten Module (VoiceMaster, Tickets, Streamer, Gefängnis, Level-Belohnungen, Economy-Shop, Farbrollen, Willkommen, LFG, Free Games, Regel-Sperre).
  * [ ] **Ein einziger Knopfdruck ("🚀 Gewählte Module & Kanäle einrichten"):**
    1. Legt alle erforderlichen Rollen mit optimaler Hierarchie und Berechtigungen an.
    2. Erstellt Kategorien und Kanäle im gewünschten Design-Stil (Modern, Clean, Aesthetic, Box, Cyber).
    3. Speichert die erzeugten IDs direkt in alle Bot-Konfigurationsdateien (kein manuelles Zuordnen mehr nötig!).
    4. Postet direkt die interaktiven Start-Panels (Regel-Button, Ticket-Button, VoiceMaster-Panel).
    5. Aktiviert automatisch die ausgewählten Module in `moduleService.ts`.
* [ ] **Sprint 13: 🛠️ Performance, Community-Tools & Wartung:**
  * [ ] **Dashboard Health & Server-Statistiken:** Live-Latenz (Gateway-Ping in ms), REST-Antwortzeiten und Interaktions-Historie.
  * [ ] **Mitglieder-Benachrichtigungs-Präferenzen:** Self-Service Profil im Webinterface zur Auswahl eigener Benachrichtigungen (Free Games, Game-News, individuelle Streamer-Pings).
  * [ ] **Chat-Hygiene Auto-Cleaner:** Automatisches Löschen von Bot-Befehlen und Antworten in Bot-Kanälen nach einstellbarem Timeout (z. B. 3 Minuten).
  * [ ] **Offizielle Twitch-API & Secret-Sanitizer:** Einbindung von `TWITCH_CLIENT_SECRET` für Token-Auto-Refresh und Pre-Push Scan vor Updates im öffentlichen GitHub-Repo.