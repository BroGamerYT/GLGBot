# 📝 Changelog – GLGBot

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und folgt [Semantic Versioning](https://semver.org/).

---

## [2.10.0] - 2026-10-11

### Hinzugefügt
* **Geburtstage (`/birthday`, Dashboard „Geburtstage“):** Mitglieder tragen Tag & Monat ein (kein Jahr). Am Geburtstag gratuliert der Bot ab 00:01 Uhr (Zeitzone `BOT_TIMEZONE`, Standard Europe/Berlin) im eingestellten Kanal und vergibt optional für 24 Stunden die Rolle „🎉 Geburtstagskind“. 29. Februar wird in Nicht-Schaltjahren am 28. gefeiert.
* **Geplante Ankündigungen (Dashboard „Ankündigungen“):** Text und/oder Embed (Titel, Farbe, Bild) zu einem festen Zeitpunkt senden - einmalig, täglich oder wöchentlich. Mit Erwähnung (@everyone/@here nur mit Berechtigung, oder eine Rolle), lautlos-Option, „Jetzt senden“ und Fehleranzeige.
* **Statistik-Kanäle (`/server-stats`, Dashboard „Statistik-Kanäle“):** Gesperrte Kanäle ganz oben mit Live-Zählern - Mitglieder, Menschen (ohne Bots), Online, Im Voice, Gerade live, Boosts. Text frei wählbar mit `{count}`, Aktualisierung alle 10 Minuten und nur bei Änderung (Discord-Limit).
* Alle drei sind eigene **Module** (auf neuen Servern zunächst aus) und laufen pro Server getrennt.

## [2.9.0] - 2026-10-11

### Hinzugefügt
* **Level-Rollen-Belohnungen im Dashboard:** Neuer Reiter „Rollen-Belohnungen“ in den Level-Einstellungen (`/stats`). Level wählen, Rolle zuordnen, speichern. Geprüft wird: Rolle unter der Bot-Rolle, keine Admin-/Verwaltungsrechte (außer für Administratoren), nur Rollen unter der eigenen.
* **Daily-Serie im Profil:** Das Nutzerprofil auf `/stats` zeigt die aktuelle `/daily`-Serie.
* **Tägliche Daten-Sicherung:** Alle Bot-Daten (Level, Strafen, Einstellungen, Streamer, Regeln …) werden täglich nach `data/_snapshots/<Datum>/` kopiert, die letzten 7 Tage bleiben erhalten (`DATA_SNAPSHOT_DAYS`).
* **Build-Check auf GitHub:** Bei jedem Push prüft GitHub automatisch, ob Bot und Dashboard fehlerfrei bauen.

### Behoben
* Backup wiederherstellen hob die Regel-Sperre auf - sie wird danach jetzt automatisch neu angewendet.
* Die Ping-Antwort reagierte auf jedes „ping“ im Chat - jetzt nur noch auf `!ping` (oder `/ping`).
* Speichern der Level-Einstellungen zeigt bei Fehlern jetzt eine Meldung.

## [2.8.0] - 2026-10-11

### Hinzugefügt
* **Mehrere Server (max. 5) mit Freigabe-Liste:**
  * Der Bot bleibt nur auf freigegebenen Servern: Haupt-Server (`GUILD_ID`), `ALLOWED_GUILD_IDS` aus der `.env` oder im Dashboard freigegebene Server. Höchstens 5 (`MAX_GUILDS`).
  * Einladung auf einen nicht freigegebenen Server oder über dem Limit: Der Bot schreibt dem Owner eine kurze Nachricht und verlässt den Server sofort - beim Start auch für Einladungen, die kamen, während er offline war.
  * Slash-Befehle werden für jeden freigegebenen Server automatisch registriert (auch `deploy-commands`).
* **Dashboard-Seite „Server-Freigabe“** (`/servers`, nur Bot-Besitzer): Belegung „x / 5“, Server freigeben, Einladungs-Link, Freigabe entfernen (Bot verlässt den Server, Daten bleiben).
* **Server wechseln im Dashboard:** Auswahl oben links unter dem Bot-Namen. Jeder sieht nur Server, auf denen er Owner, Administrator oder „Server verwalten“ hat; die Rechte werden pro Server geprüft.

### Geändert
* Regeln, Admin-Notizen sowie Anti-Raid- und Anti-Nuke-Zähler sind jetzt pro Server getrennt (bisherige Daten des Haupt-Servers bleiben unverändert).
* Neue Server starten nur mit den Grundmodulen (Regeln, Rollen, Moderation, Voice); der Haupt-Server behält alle Module.
* Eigene Standard-Regeln aus `config/rules.json` gelten nur für den Haupt-Server, weitere Server starten mit den Beispiel-Regeln.

## [2.7.0] - 2026-10-11

### Hinzugefügt
* **Streamer-Suite mit vollen Kanalrechten & Streamer Control Panel:**
  * Streamer erhalten beim Start ihres Live-Streams volle Verwaltungsrechte über ihren temporären Kanal (Manage Channels, Move Members, Mute, Deafen, Stream, etc.).
  * Neues interaktives **Streamer Control Panel** direkt im Kanal-Chat (`/stream-panel`) mit Dropdown und Schnell-Buttons.
  * **Passwortschutz für Kanäle:** Streamer & Voice-Besitzer können ein Passwort festlegen. Gäste können das Passwort per Modal eingeben und werden bei korrekter Eingabe automatisch freigeschaltet und in den Sprachkanal verschoben.
  * **Benutzerlimit & Kanal-Umbenennung:** Benutzerlimit flexibel einstellbar; Umbenennung mit automatischem Schutz gegen das Discord 2×/10-Minuten Rate-Limit.
  * Schnell-Aktionen für Sperren/Entsperren, Verstecken/Sichtbar und Bitrate-Einstellung.
* **Modulares Feature-Toggle-System (`/modules`):**
  * Alle Bot-Funktionen sind jetzt in 15 eigenständige Module unterteilt (`voice`, `live`, `levels`, `tickets`, `moderation`, `prison`, `freeGames`, `gameNews`, `auditLogs`, `rules`, `roles`, `sticky`, `suggestions`, `giveaways`, `daily`).
  * Jederzeit per Discord-Befehl `/modules status`, `/modules enable`, `/modules disable` und `/modules toggle` oder per interner API umschaltbar.
  * Dynamische Event-Gates für Befehle, Nachrichten, Voice-Events und Streamer-Status.
  * Dashboard-Seite **„Module“** (`/modules`) mit Schaltern pro Modul, sortiert nach Kategorie.
  * Ausgeschaltete Module pausieren auch ihre Hintergrund-Aufgaben (Free-Games- & News-Check, Twitch-/YouTube-Abfrage, Voice-XP) und ihre Buttons/Panels (Ticket-Button, Rollen-Panel, Voice- & Streamer-Panel, Vorschläge, Giveaways). Offene Tickets lassen sich weiterhin schließen.
  * „Server einrichten“ bietet nur Bereiche eingeschalteter Module an.
  * Ausschalten löscht keine Daten - beim Wieder-Einschalten ist alles wie vorher.
* **Neues Dashboard-Menü:** Die Seitenleiste ist in Bereiche gegliedert (Start, Community, Server, Moderation, Hilfe), Einträge in Button-Optik mit Hervorhebung der aktuellen Seite. Bereiche lassen sich auf- und zuklappen, der Zustand wird im Browser gemerkt.
* **`/daily` – Tägliche Belohnung mit Streak:** Einmal pro Tag XP abholen (50 XP + 15 XP pro Streak-Tag, max. +150 XP Bonus). Die Serie bleibt bestehen, solange man spätestens nach 36 Stunden wieder abholt.
* **`/giveaway` – Verlosungen:** `start` (Dauer, Gewinner-Anzahl, Preis, optional Rollen-Voraussetzung und Kanal), `end` und `reroll`. Teilnahme per Button, Gewinner werden bei Ablauf automatisch gezogen.
* **Level-Rollen-Belohnungen:** Für bestimmte Level hinterlegte Rollen werden beim Level-Up automatisch vergeben; `/level sync-roles` vergibt verdiente Rollen nachträglich.
* **Schutz vor Massen-Erwähnungen:** Nachrichten mit mehr als 5 Erwähnungen werden gelöscht, der Absender bekommt 10 Minuten Timeout.
* **Öffentlicher Gast-Zugang für Free Games & Game News:**
  * Kostenlose Spiele (`/free-games`) und Game-News (`/news`) sind jetzt im Web-Dashboard für alle Gäste ohne Discord-Login lesbar.
  * Admin-Steuerelemente (Discord-Repost, Feed-Konfiguration, Hinzufügen-Formulare) bleiben geschützt und werden nur eingeloggten Administratoren angezeigt.

## [2.6.0] - 2026-10-11

### Hinzugefügt
* **Server einrichten (Dashboard `/setup`) & `/setup-all`:** Bereiche ankreuzen - ein Klick legt alle fehlenden Rollen & Kanäle an (Rollen & Benachrichtigungen, Regeln, Join-to-Create mit Steuerungs-Panel, Live-Kategorie mit `#stream-alerts`, Support-Tickets, Audit-Log, Gefängnis, optional Regel-Sperre). Vorhandenes wird erkannt und nur verknüpft, der Status jedes Bereichs ist sichtbar. Nur für Owner & Administratoren.

## [2.5.0] - 2026-10-11

### Hinzugefügt
* **Open Source (MIT-Lizenz):** Der Bot kann auf jedem Discord-Server installiert werden – mit Schritt-für-Schritt-Anleitung in der README.
* **Branding über die `.env`:** `COMMUNITY_NAME`, `BOT_NAME` und `DASHBOARD_URL` steuern Footer, Ticket-Transkripte, Hilfe-Links und das Dashboard.
* **Eigene Standard-Regeln** in `config/rules.json` (Vorrang vor den eingebauten Beispiel-Regeln; im Dashboard bearbeitete Regeln haben weiterhin Vorrang).
* **Eigene Banner** in `config/banners/` und Generator `scripts/make_banners.py` (Untertitel = Servername).
* Vorlage `server_config.example.ini` für die Windows-Upload-Skripte.

### Geändert
* Eingebaute Regeln und Banner sind jetzt neutral (ohne Servername).
* Dashboard-Buttons in Discord erscheinen nur, wenn `DASHBOARD_URL` gesetzt ist.
* Die empfohlene Ping-Rolle im Live-Manager wird automatisch gefunden (`bn.live`) statt fest eingetragen.
* Doppelte, veraltete Befehlstabelle aus der README entfernt.

## [2.4.0] - 2026-10-10

### Hinzugefügt
* **`/level status`:** Eigener Level-Status (nur für dich sichtbar) mit Fortschritt und wie viele Nachrichten bzw. Voice-Minuten bis zum nächsten Level fehlen. `/rank` nutzt jetzt dieselbe Karte mit den echten XP-Einstellungen.
* **`/knast`:** Das Gefängnis-System heißt in deutschem Discord jetzt `/knast einsperren | freilassen | liste` (englisch weiterhin `/prison`).
* **Treiber-News getrennt von Game-News:** Eigene Rolle `bn.treiber` und eigener Kanal `#🖥️・treiber-news`. Wer nur eine Rolle hat, sieht nur deren Kanal. Bestehende Treiber-Quellen werden automatisch umgezogen.
* **Game-News Detailansicht:** Klick auf eine Kachel zeigt „Was ist enthalten?“ und die letzten echten Beiträge. Dazu Verlauf (wer hat was wann hinzugefügt/entfernt) und eine angepinnte, automatisch aktualisierte Übersicht im Kanal.
* **Animierte Banner** (GIF) für `#regeln`, `#berechtigungen`, `#free-games`, `#game-news` und `#treiber-news`.
* **Automatischer Logout im Dashboard:** Rechte werden jede Minute bei Discord geprüft - wer seine Admin-Rechte verliert, ist sofort abgemeldet.

### Sicherheit
* Öffentliche Statistik gab Moderationsfälle (Warns, Kicks, Banns inkl. Grund) und Gesprächspartner jedes Mitglieds ohne Login heraus - jetzt nur noch für eingeloggte Admins.
* Rechteausweitung im Dashboard behoben: Mitglieder mit „Server verwalten“ konnten sich selbst Admin-Rollen geben. Gefährliche Rollen vergeben jetzt nur Administratoren, alle anderen nur Rollen unter der eigenen.
* Moderatoren konnten per `/ban`, `/kick`, `/timeout`, `/warn`, `/knast` auch Höhergestellte bestrafen - jetzt nur noch Mitglieder unter der eigenen Rolle (auch im Dashboard).
* Backup-IDs und Ticket-IDs werden geprüft (vorher konnten über `../` fremde Bot-Dateien gelesen bzw. gelöscht werden). Backups lassen sich nur auf ihrem eigenen Server wiederherstellen.
* Ticket-Transkript-Vorschau läuft in einer Sandbox.

### Behoben
* Phishing-Filter sperrte die echte `steamcommunity.com` (Nachricht gelöscht + 1 Std. Timeout).
* Daten (XP, Moderationsfälle, Tickets, Gefängnis) werden jetzt so gespeichert, dass ein Absturz beim Schreiben nichts mehr zerstört; beschädigte Dateien werden gesichert statt überschrieben.
* Unerwartete Fehler bringen den Bot nicht mehr zum Absturz.
* `/knast`: antwortet rechtzeitig (kein „Die Anwendung reagiert nicht“ mehr), sperrt alle Kanäle für Inhaftierte, wirft sie aus dem Voice und verhindert, dass sie sich per „Regeln akzeptieren“ oder Rollen-Buttons befreien.
* Voice-Lobbys: Besitzer sah die eigene versteckte Lobby nicht mehr; Lobby-Textkanal nur für den Besitzer sichtbar; „Interaktion fehlgeschlagen“ beim Umbenennen (Discord-Limit 2× pro 10 Min.); fehlende Besitzer-Prüfung im Umbenennen-Fenster.
* `/streamer list` stürzte ab 26 Streamern ab.
* `/help` und Hilfe-Seite enthalten jetzt alle Befehle.

---

## [2.3.0] - 2026-10

### Hinzugefügt
* **Benutzerverwaltung (`/users`):** Nickname-Änderung, Rollen-Zuweisung, XP-Korrektur, Admin-Notizen und Filter.
* **Gefängnis-System** mit eigener Rolle und Kanal sowie **Bad-Name-Filter** für unangemessene Nicknames.
* **Transparente XP-Aufschlüsselung** (Chat-, Voice-Ertrag und Straf-Abzüge) mit Vorfall-Historie.
* **Support-Kategorie** (`#ticket-support`, `#hilfe-faq`, `#support-voice`) und mitlaufende Sidebar im Dashboard.

## [2.2.0] - 2026-10

### Hinzugefügt
* **Echtzeit-Chat im Ticket-Dashboard** (Sync alle 2 Sekunden, Antworten und Schließen im Browser).
* **Neu ausbalanciertes Level-System** (steilere Kurve, 60 s Chat-Cooldown, 5 XP pro Voice-Minute).
* **Öffentliche Seiten ohne Login:** `/hilfe`, `/changelog`, `/stats`.
* Erweiterter `/help`-Befehl und Support-Setup im Dashboard.

## [2.1.0] - 2026-10

### Hinzugefügt
* **Talk-Partner-Tracking & Top-Duos** („Wer redet mit wem?“).
* **Support-Ticket-System** mit Panel, privaten Ticket-Kanälen und HTML-Transkripten.
* **`/rank` & `/leaderboard`** mit Fortschrittsbalken und Toplisten.

## [2.0.0] - 2026-10

### Hinzugefügt
* **Stille Audit-Logs** in `#🛡️・audit-logs` (ohne Benachrichtigungston).
* **Server-Backups** als JSON mit Download und Wiederherstellung.
* **Moderations-Suite** (`/warn`, `/timeout`, `/kick`, `/ban`, `/case`) mit DM an Betroffene und Audit-Log.

## [1.5.0] - 2026-10

### Hinzugefügt
* **Free-Games** von Epic, Steam und GOG (alle 30 Minuten) mit App-Buttons.
* **Game-News & Treiber-Feeds:** Steam-Patchnotes, Minecraft-Versionen, NVIDIA/AMD/Intel-Treiber.
* **Discord-Login fürs Dashboard**, Regel-System mit Regel-Sperre, Rollen `bn.gamenews`, getrennte Stream-Alerts (nur ein Alert pro Stream) und temporäre Live-Rolle.

---

## [1.3.0] - 2026-10-10

### Hinzugefügt
* **Next.js Web-Dashboard:**
  * **Übersicht (`/`):** Server-Statistiken in Echtzeit (Mitglieder, Sprachkanäle, Textkanäle, Rollen) mit Status-Badges.
  * **VoiceMaster In-Channel Steuerung & Positionierung:**
    * **Automatisches Steuerungs-Panel im Sprachkanal:** Jedes Mal, wenn ein Nutzer eine temporäre Lobby betritt, wird das interaktive Interface (mit Dropdowns für Kanal-Einstellungen & Berechtigungen) sofort automatisch in den Textchat des neu erstellten Sprachkanals gesendet.
    * **Standard-Platzierung:** Erstellte temporäre Sprachkanäle werden standardmäßig exakt unter dem "Join to Create" Master-Kanal positioniert.
    * **Interaktions-Support:** Dropdown-Menüs und Buttons erkennen jetzt auch den Voice-Kanal, wenn die Interaktion direkt aus dem Voice-Chat ausgelöst wird.
  * **Berechtigungs- & Rollen-Zentrum (`/roles` & `/setup-roles`):**
    * **Regel-Verifikation (Gast-Rolle):** 1-Klick Button `✅ Regeln akzeptieren` schaltet neue Mitglieder nach Regel-Bestätigung sofort als Gast frei.
    * **Live-Stream Benachrichtigungen (`bn.live`):** 1-Klick Toggle `🔴 Live-Stream Alerts (bn.live)` für Stream-Pings und Live-Kanal Sichtbarkeit.
    * **Free-Games Alerts (`bn.free`):** 1-Klick Toggle `🎮 Free-Games Alerts (bn.free)` für Benachrichtigungen bei wöchentlichen Gratis-Spielen und Freischaltung des `#free-games` Kanals.
    * **Button `👤 Meine Rollen`:** Übersicht aller aktiven Rollen des Nutzers mit Status-Check.
    * **Slash-Befehle `/setup-roles set` & `/setup-roles panel`:** Vollständige Chat-Konfiguration und 1-Klick Versand des Panels.
    * **Epic Games Free-Games Integration (`/free-games list` & `/free-games post`):** Automatische Abfrage von 100% kostenlosen PC-Spielen mit Bildern, Ablaufdatum und Store-Links sowie autonomer Hintergrund-Scheduler (stündliche Prüfung) mit persistentem Duplikat-Schutz, der neue Gratis-Spiele sofort automatisch in den konfigurierten Kanal postet und `@bn.free` pingt.
  * **Live-Streamer Manager & Streamcord-Alternative (`/live` & `/streamer`):**
    * **Stream-Benachrichtigungs-Tabelle (Streamcord-Ersatz):** Vollständige Verwaltung individueller Twitch-Streamer mit Twitch-Avatar, Ziel-Discord-Kanal, Rollen-Ping und Verknüpfung zu Discord-Mitgliedern.
    * **Autonomer 60-Sekunden Poller:** Fragt Live-Status, Spiel, Zuschauer und Vorschau-Bilder direkt über Twitch GQL ab. Postet Alerts automatisch, vergibt die `@Live` Rolle und erstellt den Live-Kanal ohne Automove.
    * **Neue Slash-Befehle `/streamer add`, `/streamer remove`, `/streamer list`, `/streamer check`:** Vollständige Chat-Verwaltung der Streamer.
    * Konfiguration der Streamer-Rolle, des **Benachrichtigungskanals für Stream-Alerts** und der Ziel-Kategorie.
    * **Automatische Kategorie-Erstellung:** Erstellt bei Bedarf selbstständig die Kategorie `🔴 Live Streams`.
    * **Kein Automove:** Live-Streamer und Zuschauer werden nicht ungefragt in Kanäle verschoben.
    * **Slash-Befehl `/twitch-live start [link] [spiel] [titel]` & `/twitch-live stop`:** Sofortiger manueller Go-Live-Trigger mit Rollenvergabe, Ankündigung und Kanalerstellung im Chat.
  * **Zwei-Wege-Synchronisation (Web & Discord Chat):**
    * Änderungen im Web-Dashboard werden in Echtzeit ohne Neustart vom Discord-Bot übernommen.
    * Alle Einstellungen können gleichwertig über Discord-Slash-Commands (`/setup-voice`, `/setup-live`) oder im Web vorgenommen werden.
  * **PM2 Web-Service & Caddy SSL:**
    * Dedizierter PM2-Prozess `discord-web` auf Port 3000 im Proxmox-Container.
    * Caddy Reverse Proxy mit automatischem Let's Encrypt SSL-Zertifikat und HTTP/2-Support.
    * Erweiterte `start.bat` und `sync_server.bat` zur simultanen Synchronisation und Verwaltung von Bot und Web Dashboard.

---

## [1.2.0] - 2026-10-10

### Hinzugefügt
* **Dynamisches Live-Streamer-System:**
  * Automatisches Erstellen von Kanälen `🔴・[Name] ist live`, wenn ein Mitglied die Live-Rolle erhält oder Discord einen Stream erkennt.
  * Kanalstatus-Unterstützung mit direktem Stream-Link (`🔴 Live auf https://...`).
  * Live-Embed im Sprachchat mit Twitch-Violett, Stream-Titel, Game und Profilbild.
  * Automatisches Löschen des Kanals bei Stream-Ende.
  * Konfigurations-Befehl `/setup-live` (set, status, disable).
* **Vollständige VoiceMaster Befehls-Parität:**
  * Slash-Befehl `/interface` als Alias für `/voice-panel`.
  * `/voice lock` & `/voice unlock` zum Sperren/Entsperren.
  * `/voice hide` & `/voice unhide` zum Unsichtbarmachen des Raums.
  * `/voice permit @Nutzer` (Ausnahmezugang für Freunde).
  * `/voice reject @Nutzer` (Kick & Aussperren aus der Lobby).
  * `/voice transfer @Nutzer` (Leitung der Lobby übertragen).
  * `/voice claim` (Leitung übernehmen bei Abwesenheit des Erstellers).
  * `/voice bitrate <kbps>` (Echtzeit-Anpassung der Audioqualität 8-384 kbps).
  * `/voice name` & `/voice limit` mit Discord-Modals.

---

## [1.1.0] - 2026-10-10

### Hinzugefügt
* **24/7 Proxmox Hosting:**
  * Vollautomatisches Setup eines LXC-Containers auf Debian 12.
  * Installation von Node.js 22 LTS und **PM2 Process Manager**.
  * Konfiguration von `systemd` Autostart bei Reboot von Server oder Container.
* **Caddy Reverse Proxy & Domain:**
  * Reverse Proxy (Caddy) mit automatischen Let's Encrypt SSL-Zertifikaten.
* **Desktop Kontrollzentrum (`start.bat`):**
  * All-in-One Management-Script mit Live-Statusanzeige (Online/Offline, PIDs).
  * 1-Klick Upload auf Proxmox CT (Sync via tar & ssh), Build, Deploy und PM2 Restart.
  * SSH-Terminal Direktverbindung (`ssh ct109`).
* **Temporäre Voice-Kanäle ("Join to Create"):**
  * Auto-Move und Auto-Cleanup leerer temporärer Lobbys.
  * Slash-Befehl `/setup-voice`.
  * Slash-Befehl `/voice-panel` mit interaktiven Dropdown-Menüs und Buttons.

---

## [1.0.0] - 2026-10-10

### Hinzugefügt
* **Initiales Bot-Fundament (TypeScript & discord.js v14):**
  * Modulare Architektur mit `ExtendedClient`, dynamischem Command- und Event-Loader.
  * Zod-Validierung für Umgebungsvariablen (`.env`).
  * Cross-Platform Modul-Lader für CJS und ESM (Windows & Linux).
* **Befehle & Events:**
  * Slash-Befehl `/ping` (WebSocket- und Roundtrip-Latenz).
  * Text-Befehl Fallback (`!ping`, `/ping`, `ping`).
  * Unterstützung für Discord `@silent` (lautlose Antworten).
  * Direktnachrichten-System (`/dm`) mit sicherem Error-Handling.
