# 🤖 GermanyLanGame-Bot (GLGBot)

Ein modularer, hochperformanter Discord-Bot in **TypeScript (discord.js v14)** mit interaktivem **VoiceMaster-System**, **dynamischen Live-Streamer-Kanälen**, **24/7 Proxmox-Betrieb** und vollständigem **Web-Dashboard** unter [`https://glgbot.brogameryt.de`](https://glgbot.brogameryt.de).

---

## 🌐 Zentrales Web-Dashboard (`https://glgbot.brogameryt.de`)

Alle Server-Kanäle und Bot-Module können sowohl **im Discord-Chat** als auch **im Web-Dashboard** in Echtzeit konfiguriert werden:
* **Server-Statistiken:** Live-Zähler für Mitglieder, Text- & Sprachkanäle sowie Server-Rollen.
* **VoiceMaster-Verwaltung (`/voice`):** 
  * Wähle den Master-Kanal (Join-to-Create) und die Ziel-Kategorie bequem per Dropdown aus.
  * Sende das interaktive Discord-Steuerungs-Panel per 1-Klick-Button in jeden beliebigen Textkanal.
* **Live-Streamer Manager (`/live`):**
  * Weise die Streamer-Rolle zu, bestimme die Ziel-Kategorie und wähle zwischen Sprachkanal (mit Link-Status) und Textkanal.
  * Schalte die automatische Rollenerkennung bei Twitch-/YouTube-Streams ein oder aus.
* **Zwei-Wege-Echtzeit-Synchronisation:** Änderungen im Web werden sofort ohne Bot-Neustart aktiv.

---

## 🌟 Hauptfunktionen

### 1. 🔊 VoiceMaster Temporäre Sprachkanäle ("Join to Create")
* **Vollautomatisches Lobby-System:** Sobald ein Mitglied den Master-Kanal (z. B. `🔊 Join to Create`) betritt, erstellt der Bot in Millisekunden eine persönliche Lobby (`🔊・Lobby von [Name]`), verschiebt den Nutzer und löscht den Raum wieder, sobald er leer ist.
* **Interaktives Steuerungs-Panel (`/interface` oder `/voice-panel`):**
  * Dropdown für **Kanal-Einstellungen** (Name ändern per Modal-Popup, Nutzerlimit 0-99, aktuelles Game als Kanalname, temporärer Textchat, Besitz übernehmen).
  * Dropdown für **Berechtigungen** (Sperren, Entsperren, Verstecken/Unsichtbar, Sichtbar machen).
  * Buttons für Status-Info und direkten Link zum Web-Dashboard.
* **Vollständige Voice-Befehls-Suite:**
  * `/voice lock` & `/voice unlock`
  * `/voice hide` & `/voice unhide`
  * `/voice permit @Nutzer` (Erlaubt Freunden den Zutritt, selbst wenn gesperrt)
  * `/voice reject @Nutzer` (Kickt und bannt Nutzer aus der Lobby)
  * `/voice transfer @Nutzer` (Leitung an anderes Mitglied übertragen)
  * `/voice claim` (Leitung übernehmen, falls der Ersteller gegangen ist)
  * `/voice bitrate <kbps>` (Audioqualität bis 384 kbps anpassen)
  * `/voice name <titel>` & `/voice limit <anzahl>`

### 2. 🔴 Dynamische Live-Streamer-Kanäle & Alerts
* **Automatischer oder Manueller Go-Live:**
  * Sobald ein Mitglied die Live-Rolle erhält, streamt ODER den Befehl `/twitch-live start [link] [spiel] [titel]` nutzt, erstellt der Bot sofort einen Kanal: `🔴・[Name] ist live`.
  * **Automatischer Stream-Alert:** Postet ein stylisches Twitch-Violettes Ankündigungs-Embed direkt in den gewählten Benachrichtigungskanal.
  * **Automatische Kategorie:** Falls keine Kategorie angegeben ist, erstellt der Bot selbstständig die Kategorie `🔴 Live Streams`.
  * **Kein Automove:** Niemand wird ungefragt in den Sprachkanal verschoben.
* **Kanal-Status & Embed:** Setzt den offiziellen Discord-Kanalstatus auf den Stream-Link und postet ein violettes Twitch-Embed im Chat mit direktem Stream-Link und Spiel.
* **Auto-Cleanup & Stop:** Sobald der Streamer offline geht oder `/twitch-live stop` nutzt, wird die Live-Rolle entzogen und der Kanal automatisch wieder gelöscht.
* **Einrichtung:** Sowohl im Web unter [`/live`](https://glgbot.brogameryt.de/live) als auch im Chat via `/setup-live set rolle: @Live [ankuendigungskanal: #alerts] [kategorie: #Kategorie]`.

### 3. 🛡️ Berechtigungs- & Rollen-Zentrum (`/roles` & `/setup-roles`)
* **Regel-Verifikation (`@Gast`):**
  * Neues Mitglied tritt bei und sieht zunächst nur den Regelkanal.
  * Ein Klick auf den Button `✅ Regeln akzeptieren` im interaktiven Rollen-Panel vergibt sofort die konfigurierte Gast-Rolle und schaltet den Server frei.
* **Stream-Benachrichtigungen (`bn.live`):**
  * 1-Klick Toggle `🔴 Live-Stream Alerts (bn.live)` im Rollen-Panel.
  * Nutzer erhalten Ping-Benachrichtigungen bei neuen Streams und schalten den Live-Bereich frei.
* **Gratis-Spiele & Free-Games Kanal (`bn.free`):**
  * 1-Klick Toggle `🎮 Free-Games Alerts (bn.free)`.
  * Schaltet den exklusiven Kanal `#free-games` frei und aktiviert die wöchentlichen Gratis-Spiele-Benachrichtigungen.
* **Echtzeit-Statusprüfung:**
  * Button `👤 Meine Rollen` liefert eine ephemere Übersicht aller aktuell zugewiesenen Benachrichtigungs- und Verifikationsrollen.
* **Verwaltung:**
  * Im Web unter [`/roles`](https://glgbot.brogameryt.de/roles) oder im Chat via `/setup-roles set [gast_rolle] [stream_rolle] [free_games_rolle] [free_games_kanal]`.
  * Panel-Versand via 1-Klick-Button im Web oder per Befehl `/setup-roles panel`.

### 4. 🎮 Epic Games Store Free-Games Alerts
* **Wöchentliche Gratis-Spiele:** Erkennt automatisch 100% rabattierte Spiele aus dem Epic Games Store (Aktionen jeden Donnerstag).
* **Automatischer Background-Scheduler:** Prüft stündlich nach neuen Gratis-Titeln und postet stylische Embeds (inkl. Cover-Art, Store-Link und Ablaufdatum) direkt in den `#free-games` Kanal mit Rollen-Ping für `@bn.free`.
* **Duplikat-Schutz:** Bereits gepostete Spiele werden persistent gespeichert und niemals doppelt angekündigt.
* **Chat-Befehle:**
  * `/free-games list`: Zeigt alle aktuell kostenlosen Spiele sofort an.
  * `/free-games post`: Postet die aktuellen Gratis-Spiele direkt in den eingerichteten Benachrichtigungskanal.

### 5. 💬 Sichere Direktnachrichten & Silent-Support
* **`/dm`:** Sendet private Nachrichten im Namen des Servers und fängt Fehler (z. B. blockierte DMs) sauber ab.
* **`@silent` Unterstützung:** Erkennt `@silent` in Textnachrichten und antwortet bei Bedarf ebenfalls komplett lautlos ohne Push-Benachrichtigung für andere.
* **Text-Befehl Fallback:** Reagiert sowohl auf moderne Slash-Befehle als auch auf Textbefehle wie `!ping`, `ping` oder `/ping`.

---

## 💻 Befehlsübersicht

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/ping` / `!ping` | Zeigt aktuelle WebSocket- und Roundtrip-Latenz an. | Alle |
| `/dm <nachricht> [empfaenger]` | Sendet eine Direktnachricht mit Server-Embed. | Nachrichten verwalten |
| `/setup-voice set <kanal> [kategorie]` | Richtet den Join-to-Create Masterkanal ein. | Kanäle verwalten |
| `/setup-voice status` / `disable` | Zeigt Konfiguration an oder deaktiviert sie. | Kanäle verwalten |
| `/interface` *(oder `/voice-panel`)* | Sendet das interaktive VoiceMaster-Steuerungs-Panel. | Kanäle verwalten |
| `/voice <aktion>` | Steuert die eigene temporäre Sprach-Lobby (Lock, Hide, Permit, etc.). | Lobby-Besitzer |
| `/setup-live set <rolle> [alert-kanal] [kategorie]` | Konfiguriert das Live-Streamer-System & Benachrichtigungen. | Kanäle verwalten |
| `/setup-live status` / `disable` | Zeigt Status der Live-Streamer-Erkennung an. | Kanäle verwalten |
| `/twitch-live start [link] [spiel] [titel]` | Gehe sofort live: Vergibt Live-Rolle, sendet Alert & erstellt Kanal. | Alle Streamer |
| `/twitch-live stop` | Beendet deinen Live-Status, entfernt die Rolle und löscht den Kanal. | Alle Streamer |
| `/setup-roles set [gast] [live] [free] [kanal]` | Konfiguriert Gast- & Benachrichtigungsrollen sowie den Free-Games Kanal. | Rollen verwalten |
| `/setup-roles panel [kanal]` | Sendet das interaktive Berechtigungs- & Rollen-Panel. | Rollen verwalten |
| `/setup-roles status` | Zeigt die aktuelle Konfiguration des Rollen-Zentrums an. | Rollen verwalten |
| `/free-games list` | Zeigt die aktuell kostenlosen PC-Spiele im Epic Games Store an. | Alle |
| `/free-games post` | Sendet die aktuellen Gratis-Spiele sofort in den konfigurierten Kanal. | Nachrichten verwalten |
| `/streamer add <twitch> <kanal> [ping] [user]` | Fügt Twitch-Streamer zur Benachrichtigungsliste hinzu (Streamcord Alternative). | Kanäle verwalten |
| `/streamer remove <twitch>` | Entfernt einen Twitch-Streamer aus der Benachrichtigungsliste. | Kanäle verwalten |
| `/streamer list` | Listet alle überwachten Streamer mit Live-Status und Zielkanal auf. | Alle |
| `/streamer check` | Führt eine sofortige Überprüfung aller Streamer auf Twitch durch. | Kanäle verwalten |

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
│      - Node.js 22 LTS, discord.js v14                  │
│      - PM2 Process Manager (Autostart via systemd)     │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Desktop-Verwaltung (`start.bat`)

Auf dem Windows-PC befindet sich das **All-in-One Kontrollzentrum** [`start.bat`](file:///c:/Users/domin/Desktop/DiscordBot/start.bat):

1. **Lokale Steuerung:** Bot starten, stoppen oder neustarten im Entwicklungsmodus mit Hot-Reload (`tsx watch`).
2. **Proxmox Synchronisation:**
   * **Upload `[5]`:** Synchronisiert Code-Änderungen blitzschnell auf CT 109 (ohne `node_modules`), führt `npm run build` und `deploy-commands` aus und startet den Bot in PM2 neu.
   * **Download `[6]`:** Holt `.env` oder Dateien vom Server.
   * **SSH-Konsole `[7]`:** Verbindet sich direkt per SSH-Key mit dem Container (`ssh ct109`).
   * **Server-Neustart `[8]`:** Startet den 24/7-Dienst auf Proxmox neu.

---

## ⚙️ Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Slash-Befehle bei Discord registrieren
npm run deploy-commands

# 3. Bot im Entwicklungsmodus starten
npm run dev

# 4. TypeScript kompilieren & Produktions-Start
npm run build
npm start
```

## 🔐 Dashboard-Login (Discord OAuth2)

Das Web-Dashboard ist komplett geschützt (Seiten **und** API). Anmeldung erfolgt über Discord.

**Zugriff haben:** Server-Owner, Mitglieder mit *Administrator* oder *Server verwalten*, sowie optional
alle Rollen/Nutzer aus `DASHBOARD_ROLE_IDS` / `DASHBOARD_USER_IDS`.

**Einrichtung:**
1. Discord Developer Portal → deine App → **OAuth2**:
   - *Client Secret* kopieren → `DISCORD_CLIENT_SECRET` in der `.env`
   - Unter *Redirects* eintragen: `https://glgbot.brogameryt.de/api/auth/callback`
2. In der `.env` setzen: `SESSION_SECRET` (min. 32 Zeichen, zufällig) und `DASHBOARD_URL`.
3. Dashboard neu bauen & starten (`npm run build` im Ordner `web`, dann `pm2 restart discord-web`).

Sessions sind 24 Stunden gültig. Wird `SESSION_SECRET` geändert, werden alle Nutzer ausgeloggt.
