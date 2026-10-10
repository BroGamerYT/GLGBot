# 📝 Changelog – GermanyLanGame-Bot

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und folgt [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-10-10

### Hinzugefügt
* **Next.js Web-Dashboard unter `https://glgbot.brogameryt.de`:**
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
    * **Stream-Benachrichtigungs-Tabelle (Streamcord-Ersatz):** Vollständige Verwaltung individueller Twitch-Streamer (wie `DerBroGamerYT`, `deven89030`, `MoPs43ver`, `smudi030`) mit Twitch-Avatar, Ziel-Discord-Kanal, Rollen-Ping und Verknüpfung zu Discord-Mitgliedern.
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
    * Dedizierter PM2-Prozess `discord-web` auf Port 3000 im Proxmox-Container CT 109.
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
  * Vollautomatisches Setup von LXC Container **CT 109 (`discordbot`)** auf Debian 12 (10.0.0.109).
  * Installation von Node.js 22 LTS und **PM2 Process Manager**.
  * Konfiguration von `systemd` Autostart bei Reboot von Server oder Container.
* **Caddy Reverse Proxy & Domain:**
  * Domain **`glgbot.brogameryt.de`** auf CT 102 (`synchro-proxy`) eingerichtet mit automatischen Let's Encrypt SSL-Zertifikaten.
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
