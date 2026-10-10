# 🤖 GermanyLanGame-Bot (GLGBot)

Ein moderner, modularer und hochperformanter Discord-Bot in **TypeScript (discord.js v14)** mit interaktivem **VoiceMaster-System**, **dynamischen Live-Streamer-Kanälen**, **Level-System mit Talk-Partner-Tracking**, **Gefängnis- & Moderations-System**, **Echtzeit-Support-Tickets** und vollständigem **Web-Dashboard** unter [`https://glgbot.brogameryt.de`](https://glgbot.brogameryt.de).

---

## 🌐 Zentrales Web-Dashboard (`https://glgbot.brogameryt.de`)

Alle Server-Funktionen können sowohl **im Discord-Chat via Slash-Befehle** als auch **im Web-Dashboard** in Echtzeit konfiguriert und gesteuert werden:

| Dashboard-Bereich | Pfad | Zugriff | Beschreibung |
| :--- | :--- | :--- | :--- |
| **Server-Übersicht** | `/` | 🔒 Admin | Live-Zähler für Mitglieder, Kanäle, Rollen und Schnellaktionen. |
| **Benutzerverwaltung** | `/users` | 🔒 Admin | Mitgliederliste mit Nickname-Änderung, Rollen-Zuweisung, XP-Korrektur und Admin-Notizen. |
| **Moderation & Knast** | `/moderation` | 🔒 Admin | Warns, Timeouts, Kicks, Bans, Gefängnis-System (`/prison`), Bad-Name-Filter und Schimpfwort-Blacklist. |
| **Support-Tickets** | `/tickets` | 🔒 Admin | Live-Chat mit 2s Polling, Transkripte mit Embeds/Avataren und Support-Kategorie-Setup. |
| **Level & Talk-Rangliste** | `/stats` | 🌍 Öffentlich | Top Levels (bis Stufe 25), Voice-Zeiten, Talk-Duos, XP-Regelwerk und Nutzer-Aufschlüsselung. |
| **VoiceMaster Lobbies** | `/voice` | 🔒 Admin | Join-to-Create Konfiguration, Master-Kanal & interaktives Steuerungs-Panel. |
| **Live-Streamer Manager** | `/live` | 🔒 Admin | Automatische Twitch-/YouTube-Erkennung, Stream-Alerts und temporäre Kanäle. |
| **Rollen & Verifikation** | `/roles` | 🔒 Admin | Regel-Akzeptanz (`@Gast`), Stream-Pings (`bn.live`) und Free-Games Alerts (`bn.free`). |
| **Gratis-Spiele** | `/free-games` | 🔒 Admin | Scan nach 100% kostenlosen Vollversionen (Epic Games, Steam, GOG) mit Deep-Links. |
| **Game-News & Feeds** | `/news` | 🔒 Admin | Automatische Patchnotes für Games sowie NVIDIA/AMD Grafik- und Chipsatz-Treiber. |
| **Audit-Logs** | `/logs` | 🔒 Admin | Stille Protokollierung von Server-Aktionen (`SuppressNotifications`). |
| **Server-Backups** | `/backups` | 🔒 Admin | 1-Klick JSON-Snapshots aller Rollen, Kanäle und Einstellungen mit Wiederherstellung. |
| **Server-Regeln** | `/rules` | 🔒 Admin | Regel-Editor mit Vorschau und 1-Klick Discord-Veröffentlichung. |
| **Hilfe & Befehle** | `/hilfe` | 🌍 Öffentlich | Vollständige Dokumentation aller 31 Slash-Befehle mit Beschreibungen. |
| **Changelog & Updates** | `/changelog` | 🌍 Öffentlich | Detaillierte Versionshistorie von v1.0.0 bis v2.3.0. |

---

## 🌟 Hauptfunktionen im Detail

### 1. 🏆 Anspruchsvolles Level-System & Talk-Partner Tracking (bis Stufe 25)
* **Progressive Level-Kurve (bis Level 25):**
  $$\text{Benötigte XP pro Level} = \lfloor 350 \times \text{Level}^{1.65} \rfloor + 100$$
  Jede Stufe erfordert spürbar mehr Aktivität. Level 25 bildet die prestigeträchtige Maximalstufe mit `MAX LEVEL`-Auszeichnung.
* **Transparente Aktivitäts- & XP-Aufschlüsselung:**
  * Im Nutzerprofil auf `/stats` und im `/rank`-Embed wird exakt aufgeschlüsselt, woher die XP stammen:
    * **Chat-Ertrag:** Anzahl geschriebener Nachrichten $\times$ konfigurierte XP (z. B. `~20 XP / Msg`).
    * **Voice-Ertrag:** Sprachzeit im Talk $\times$ konfigurierte XP (z. B. `+5 XP / Min.` bzw. `300 XP / Std.`).
    * **Straf-Abzüge:** Summe aller Moderations-Abzüge inklusive Vorfall-Historie (Grund, Datum, `-XP`).
* **Talk-Partner Tracking & Top-Duos („Wer labert mit wem?“):**
  * Minütliche Auswertung aktiver Sprachkanäle (ab 2 Personen im Talk).
  * Zeigt die Top-Gesprächspaare auf dem Server und listet im Profil die engsten Gesprächspartner auf.
* **Dashboard-Konfiguration:**
  * Anpassung von Min/Max Chat-XP, Chat-Cooldown (Anti-Spam), Voice-XP/Minute, Kurven-Steigung und Level-Up Benachrichtigungskanal.

### 2. 🛡️ Benutzerverwaltung, Moderation & Gefängnis-System
* **Benutzerverwaltung (`/users`):**
  * Schnelle Suche nach Tag, ID oder Nickname. Filter nach Rollen, Bots, Gefangenen und gemuteten Nutzern.
  * Rollen direkt per Dropdown hinzufügen oder entfernen.
  * Nickname direkt im Web anpassen oder zurücksetzen.
  * XP-Punkte manuell korrigieren (Hinzufügen, Abziehen oder Festlegen).
  * Persistente Admin-Notizen zu jedem Nutzer hinterlegen.
* **Gefängnis-System (`/prison` & `/moderation`):**
  * Isoliert auffällige Nutzer mit einer speziellen Gefängnis-Rolle (`Imprisoned`).
  * Alle bisherigen Rollen werden sicher zwischengespeichert und entzogen.
  * Zugriff nur noch auf den privaten `#knast-zelle` Kanal.
  * Bei Freilassung (`unprison`) werden alle ursprünglichen Rollen wiederhergestellt.
* **Automatischer Minus-Level & XP-Abzug:**
  * Jeder Regelverstoß (Warnung, Timeout, Gefängnis, Kick, Ban) zieht dem Nutzer automatisch konfigurierte XP ab (`-250 XP`, `-500 XP`, `-1.000 XP`) und kann zu einem Stufenabstieg führen.
* **Bad-Name Filter & Schimpfwort-Blacklist:**
  * Erkennt anstößige Zeichen/Wörter in Discord-Nicknames und benennt Nutzer automatisch in `Moderated Nick #...` um.
  * Automatische Chat-Überwachung mit Wortfilter und konfigurierbarem XP-Abzug.

### 3. 🎫 Echtzeit-Support-Tickets & Support-Kategorie
* **Echtzeit-Synchronisation (2s Live-Sync):**
  * Admins sehen neue Chat-Nachrichten im Webinterface alle 2 Sekunden ohne Seiten-Reload.
  * Volle Unterstützung von Text, Discord-Embeds, Anhängen und Avataren.
  * Antworten und Schließen von Tickets direkt aus dem Browser.
* **Automatische Support-Kategorie:**
  * 1-Klick Setup im Dashboard erstellt die Kategorie `🎫 SUPPORT` mit `#ticket-support`, `#hilfe-faq` und `#support-voice`.
* **Interaktives Ticket-Panel:**
  * Dropdown- oder Button-Auswahl im Chat für Support-Themen (Allgemein, Technik, Feedback).
  * Erstellt private Kanäle und generiert beim Schließen vollständige HTML-Transkripte.

### 4. 🔊 VoiceMaster Temporäre Sprachkanäle ("Join to Create")
* **Vollautomatisches Lobby-System:** Sobald ein Mitglied den Master-Kanal betritt, erstellt der Bot in Millisekunden eine persönliche Lobby (`🔊・Lobby von [Name]`), verschiebt den Nutzer und löscht den Raum wieder, sobald er leer ist.
* **Interaktives Steuerungs-Panel (`/interface`):**
  * Dropdown für Kanal-Einstellungen (Name per Modal ändern, Nutzerlimit 0–99, aktuelles Game als Kanalname, temporärer Textchat, Besitz übernehmen).
  * Dropdown für Berechtigungen (Sperren, Entsperren, Verstecken/Unsichtbar, Sichtbar).
  * Steuerung per Slash-Befehle: `/voice lock`, `/voice hide`, `/voice permit`, `/voice reject`, `/voice transfer`, `/voice claim`, `/voice bitrate`.

### 5. 🔴 Dynamische Live-Streamer-Kanäle & Alerts
* **Twitch & YouTube Live-Erkennung:**
  * Erkennt Streaming-Aktivitäten automatisch über Rollen oder manuelle Befehle (`/twitch-live start [link] [spiel] [titel]`).
  * Erstellt einen temporären Sprachkanal `🔴・[Name] ist live` mit Stream-Link im Kanalstatus.
  * Postet ein violettes Twitch-Embed in den Ankündigungskanal.
  * Automatisches Cleanup beim Beenden des Streams.

### 6. 🎮 Gratis-Spiele (Epic Games, Steam & GOG)
* **Automatischer Background-Scheduler:** Prüft alle 30 Minuten nach neuen 100% kostenlosen Vollversionen.
* Postet stylische Embeds mit Cover-Art, Store-Link und Ablaufdatum in den `#free-games` Kanal mit Rollen-Ping für `@bn.free`.
* Deep-Links für direkte Installation über den jeweiligen Game-Launcher.

### 7. 🛡️ Silent Audit-Logs & Server-Backups
* **Stille Benachrichtigungen:** Protokolliert Rollen-, Berechtigungs- und Kanaländerungen im Log-Kanal mit `SuppressNotifications` (keine störenden Audio-Pings).
* **Server-Backups:** Sichert die gesamte Struktur (Kategorien, Kanäle, Rollen, Berechtigungen) als JSON-Snapshot mit 1-Klick-Wiederherstellung.

---

## 💻 Vollständige Befehlsübersicht (31 Slash-Befehle)

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/ping` | Zeigt aktuelle WebSocket- und Roundtrip-Latenz an. | Alle |
| `/help` | Öffnet das interaktive Hilfe-Embed mit Links zu Web-Dashboard & Support. | Alle |
| `/rank [user]` | Zeigt die persönliche Rangkarte mit XP, Level, Fortschritt und XP-Herkunft. | Alle |
| `/leaderboard` | Zeigt die serverweiten Top 10 Ranglisten für Level, Voice-Zeit und Duos. | Alle |
| `/suggest <idee>` | Reicht einen Verbesserungsvorschlag mit Abstimmungs-Buttons ein. | Alle |
| `/dm <text> [user]` | Sendet eine Direktnachricht im Namen des Servers. | Nachrichten verwalten |
| `/warn <user> <grund>` | Verwarnt ein Mitglied und zieht automatisch Level-XP ab. | Mitglieder moderieren |
| `/timeout <user> <dauer> <grund>` | Belegt ein Mitglied mit einem Timeout und zieht XP ab. | Mitglieder moderieren |
| `/prison <user> <grund>` | Steckt ein Mitglied in den Isolations-Knast (#knast-zelle) mit XP-Abzug. | Mitglieder moderieren |
| `/kick <user> [grund]` | Kickt ein Mitglied vom Server und zieht XP ab. | Mitglieder kicken |
| `/ban <user> [grund] [tage]` | Bannt einen Nutzer permanent vom Server mit XP-Abzug. | Mitglieder bannen |
| `/unban <user_id> [grund]` | Hebt den Bann eines Nutzers auf. | Mitglieder bannen |
| `/cases [user]` | Listet alle dokumentierten Moderations-Fälle eines Nutzers auf. | Mitglieder moderieren |
| `/clear <anzahl>` | Löscht eine bestimmte Anzahl an Nachrichten im aktuellen Kanal. | Nachrichten verwalten |
| `/setup-voice set <kanal> [kat]` | Richtet den Join-to-Create Masterkanal für temporäre Lobbies ein. | Kanäle verwalten |
| `/setup-voice status` / `disable` | Zeigt Konfiguration an oder deaktiviert das Voice-System. | Kanäle verwalten |
| `/interface` | Sendet das interaktive VoiceMaster-Steuerungs-Panel. | Kanäle verwalten |
| `/voice <aktion>` | Steuert die eigene temporäre Sprach-Lobby (Lock, Hide, Permit, etc.). | Lobby-Besitzer |
| `/setup-live set <rolle> [alert] [kat]` | Konfiguriert das Live-Streamer-System & Benachrichtigungen. | Kanäle verwalten |
| `/setup-live status` / `disable` | Zeigt Status der Live-Streamer-Erkennung an. | Kanäle verwalten |
| `/twitch-live start [link] [spiel]` | Gehe sofort live: Vergibt Live-Rolle, sendet Alert & erstellt Kanal. | Alle Streamer |
| `/twitch-live stop` | Beendet deinen Live-Status, entfernt die Rolle und löscht den Kanal. | Alle Streamer |
| `/streamer add <twitch> <kanal>` | Fügt Streamer zur automatischen Benachrichtigungsliste hinzu. | Kanäle verwalten |
| `/streamer remove <twitch>` | Entfernt einen Streamer aus der Überwachungsliste. | Kanäle verwalten |
| `/streamer list` | Listet alle überwachten Streamer mit aktuellem Status auf. | Alle |
| `/streamer check` | Führt eine sofortige Überprüfung aller Streamer auf Twitch durch. | Kanäle verwalten |
| `/setup-roles set [gast] [live] [free]` | Konfiguriert Gast-, Stream- und Free-Games Rollen. | Rollen verwalten |
| `/setup-roles panel [kanal]` | Sendet das interaktive Berechtigungs- & Rollen-Panel. | Rollen verwalten |
| `/setup-roles status` | Zeigt die aktuelle Konfiguration des Rollen-Zentrums an. | Rollen verwalten |
| `/free-games list` | Zeigt die aktuell kostenlosen PC-Spiele im Store an. | Alle |
| `/free-games post` | Sendet aktuelle Gratis-Spiele sofort in den Ankündigungskanal. | Nachrichten verwalten |

---

## 🏗️ Architektur & 24/7 Hosting

```
┌────────────────────────────────────────────────────────┐
│             https://glgbot.brogameryt.de               │
│        Next.js Dashboard & Discord OAuth2 Login        │
└───────────────────────────┬────────────────────────────┘
                            │ Reverse Proxy (Port 3000)
┌───────────────────────────▼────────────────────────────┐
│          Caddy Proxy (Proxmox CT 102 - synchro)        │
│          Automatische Let's Encrypt SSL-Zertifikate    │
└───────────────────────────┬────────────────────────────┘
                            │ Internes Netzwerk (10.0.0.x)
┌───────────────────────────▼────────────────────────────┐
│      Proxmox LXC Container (CT 109 - discordbot)       │
│      - Debian 12 (minimal), 1 vCPU, 1 GB RAM           │
│      - Node.js 22 LTS, discord.js v14, Next.js 14      │
│      - PM2 Process Manager:                            │
│          ID 0: discord-bot                             │
│          ID 1: discord-web                             │
│      - Interne Bot-API: 127.0.0.1:3101                 │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Desktop-Verwaltung (`start.bat`)

Auf dem Entwicklungs-PC befindet sich das All-in-One Kontrollzentrum [`start.bat`](start.bat):

1. **Lokale Steuerung:** Bot starten, stoppen oder im Dev-Modus mit Hot-Reload (`tsx watch`) ausführen.
2. **Proxmox Synchronisation:**
   * **Upload `[5]`:** Synchronisiert Code-Änderungen auf CT 109, kompiliert (`npm run build`) und startet PM2 neu.
   * **Download `[6]`:** Holt `.env` oder Dateien vom Server.
   * **SSH-Konsole `[7]`:** Verbindet sich direkt per SSH-Key mit dem Container (`ssh ct109`).
   * **Server-Neustart `[8]`:** Startet die Dienste auf Proxmox neu.

---

## ⚙️ Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
npm install
cd web && npm install && cd ..

# 2. Slash-Befehle bei Discord registrieren
npm run deploy-commands

# 3. Bot im Entwicklungsmodus starten
npm run dev

# 4. Webinterface im Entwicklungsmodus starten
cd web && npm run dev
```

---

## 🔐 Authentifizierung & Rechte

* **Öffentliche Seiten:** `/hilfe`, `/changelog` und `/stats` sind ohne Login für alle Server-Mitglieder direkt zugänglich.
* **Geschützte Admin-Bereiche:** Anmeldung erfolgt über Discord OAuth2. Zugriff haben Server-Owner, Mitglieder mit *Administrator* oder *Server verwalten*, sowie alle in `DASHBOARD_ROLE_IDS` bzw. `DASHBOARD_USER_IDS` hinterlegten Accounts.
