# 🤖 GermanyLanGame-Bot (GLGBot)

Ein modularer, hochperformanter Discord-Bot in **TypeScript (discord.js v14)** mit interaktivem **VoiceMaster-System**, **dynamischen Live-Streamer-Kanälen**, **24/7 Proxmox-Betrieb** und Vorbereitung für das **Web-Dashboard** unter [`https://glgbot.brogameryt.de`](https://glgbot.brogameryt.de).

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

### 2. 🔴 Dynamische Live-Streamer-Kanäle
* **Automatischer Live-Kanal:** Sobald ein Mitglied die Live-Rolle erhält (oder Discord einen Twitch-/YouTube-Stream erkennt), erstellt der Bot in der konfigurierten Kategorie sofort einen Kanal: `🔴・[Name] ist live`.
* **Kanal-Status & Embed:** Setzt den offiziellen Discord-Kanalstatus auf den Stream-Link und postet ein violettes Twitch-Embed im Chat mit direktem Stream-Link und Spiel.
* **Auto-Cleanup:** Sobald der Streamer offline geht, wird der Kanal automatisch wieder gelöscht.
* **Einrichtung:** `/setup-live set rolle: @Live [kategorie: #Kategorie] [kanal_art: voice/text]`.

### 3. 💬 Sichere Direktnachrichten & Silent-Support
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
| `/setup-live set <rolle> [kategorie]` | Konfiguriert das dynamische Live-Streamer-System. | Kanäle verwalten |
| `/setup-live status` / `disable` | Zeigt Status der Live-Streamer-Erkennung an. | Kanäle verwalten |

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
