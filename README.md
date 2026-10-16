# 🤖 GLGBot – Discord-Bot mit Web-Dashboard

Ein moderner, modularer Discord-Bot in **TypeScript (discord.js v14)** mit **Next.js-Web-Dashboard** und Discord-Login.
Ursprünglich für die Community *Germany LanGame* gebaut – jetzt für jeden Server nutzbar.

**Funktionen:** VoiceMaster (Join-to-Create), Live-Streamer-Rolle & Twitch-/YouTube-Alerts, Level-System mit Talk-Partner-Tracking,
Moderation mit Gefängnis-System (`/knast`), Support-Tickets mit Transkripten, Regeln mit Freischaltung, Rollen-Panel,
Gratis-Spiele (Epic, Steam, GOG als Einzelposts), Game-, Hardware- & Treiber-News mit Kachel-Magazin, Release-Kalender, Community-Wirtschaft & Belohnungs-Shop,
1-Klick Server-Templates mit Auto-Backup, Silent Audit-Logs sowie Server-Backups (Download, Upload & Cross-Server-Transfer).

> Sprache von Bot und Dashboard: **Deutsch**. Ein Bot kann bis zu **5 Discord-Server** gleichzeitig betreuen (Haupt-Server via `GUILD_ID`, weitere über das Dashboard oder `ALLOWED_GUILD_IDS` freigebbar).

---

## 📦 Installation

### Voraussetzungen
* **Node.js 20 oder neuer** (empfohlen: 22 LTS) und npm
* Ein Linux-Server, VPS, Raspberry Pi oder Windows-PC, der 24/7 läuft
* Für das Dashboard von außen: eine (Sub-)Domain und ein Reverse Proxy mit HTTPS (z. B. Caddy)

### 1. Discord-App anlegen
1. Im [Discord Developer Portal](https://discord.com/developers/applications) auf **New Application** klicken.
2. **Bot** → *Reset Token* → Token kopieren (`DISCORD_TOKEN`).
3. **Bot** → unter *Privileged Gateway Intents* alle drei einschalten: **Presence**, **Server Members**, **Message Content**.
4. **General Information** → *Application ID* kopieren (`CLIENT_ID`).
5. **OAuth2** → *Client Secret* kopieren (`DISCORD_CLIENT_SECRET`) und unter *Redirects* eintragen:
   `https://deine-domain.de/api/auth/callback` (lokal: `http://localhost:3000/api/auth/callback`).
6. Bot einladen – diesen Link öffnen (`DEINE_CLIENT_ID` ersetzen):
   `https://discord.com/oauth2/authorize?client_id=DEINE_CLIENT_ID&scope=bot%20applications.commands&permissions=8`
   Die Rolle des Bots in den Server-Einstellungen möglichst **weit oben** einsortieren, damit er Rollen vergeben kann.

### 2. Projekt herunterladen & einrichten
```bash
git clone https://github.com/BroGamerYT/GLGBot.git
cd GLGBot
cp .env.example .env        # Windows: copy .env.example .env
```
`.env` öffnen und ausfüllen – alle Felder sind dort erklärt. Wichtig: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`,
`DISCORD_CLIENT_SECRET`, `DASHBOARD_URL`, `SESSION_SECRET` und `COMMUNITY_NAME`.

### 3. Bauen & starten

**Am schnellsten – eine der drei Varianten:**

| Variante | Befehl | Für |
| :--- | :--- | :--- |
| 🐳 **Docker** | `docker compose up -d --build` | Linux, NAS (Synology, Unraid …), Windows mit Docker Desktop |
| 🐧 **Linux-Skript** | `bash install_linux.sh` | Debian/Ubuntu/Proxmox-LXC – installiert Node.js 22 & PM2, baut alles, startet mit Autostart |
| 🪟 **Windows-Skript** | `install_windows.bat` (Doppelklick) | Windows – prüft Node.js, öffnet die `.env`, baut Bot & Dashboard |

Bei Docker laufen Bot und Dashboard zusammen in einem Container; `data/` und `config/` liegen als Ordner neben der
`docker-compose.yml` und bleiben bei Updates erhalten (`git pull && docker compose up -d --build`).

**Oder von Hand:**
```bash
# Bot
npm install
npm run build
npm run deploy-commands     # Slash-Befehle bei Discord registrieren
npm start

# Dashboard (zweites Terminal)
cd web
npm install
npm run build
npm start                   # läuft auf Port 3000
```
Das Dashboard liest die `.env` aus dem Hauptordner mit. Bot und Dashboard müssen auf **demselben Rechner** laufen
(sie sprechen über `127.0.0.1:3101` miteinander).

### 4. Dauerhaft betreiben (Linux, PM2)
```bash
npm install -g pm2
pm2 start ecosystem.config.js   # startet discord-bot und discord-web
pm2 save && pm2 startup
```

### 5. Dashboard per HTTPS erreichbar machen (Caddy)
```
bot.example.com {
    reverse_proxy 127.0.0.1:3000
}
```
Caddy holt das SSL-Zertifikat automatisch. `DASHBOARD_URL` muss genau dieser Adresse entsprechen.

### 6. Im Discord einrichten
Am einfachsten: im Dashboard auf **„Server einrichten“** gehen, Bereiche ankreuzen und auf *Einrichten* klicken –
oder im Discord `/setup-all` eingeben. Der Bot legt dann alles Fehlende an:

* Rollen `Gast`, `bn.live`, `bn.free`, `bn.gamenews`, `bn.treiber`, `Live` + Kanäle `#free-games`, `#game-news`, `#treiber-news`
* `#regeln` mit Bestätigungs-Button und `#berechtigungen` mit Rollen-Panel
* Join-to-Create-Sprachkanal mit Steuerungs-Panel, Live-Kategorie mit `#stream-alerts`
* `#support` mit Ticket-Button, geschützter Audit-Log-Kanal, Gefängnis-Rolle & -Kanal
* optional die Regel-Sperre (neue Mitglieder sehen nur `#regeln`, bis sie akzeptieren)

Einzelne Bereiche lassen sich weiterhin auch mit `/setup-roles`, `/setup-rules`, `/setup-voice`, `/setup-live`, `/setup-tickets` und `/setup-logs` einrichten.

### Updates
```bash
git pull
npm install && npm run build && npm run deploy-commands
cd web && npm install && npm run build
pm2 restart discord-bot discord-web
```

---

## 🎨 An deinen Server anpassen

| Was | Wo |
| :--- | :--- |
| Name der Community, Bot-Name, Dashboard-Adresse | `.env` (`COMMUNITY_NAME`, `BOT_NAME`, `DASHBOARD_URL`) |
| Serverregeln | Im Dashboard unter **Regeln** – oder als eigene Vorlage in `config/rules.json` (gleicher Aufbau wie `src/config/rules.ts`) |
| Animierte Kanal-Banner mit deinem Servernamen | `python scripts/make_banners.py --subtitle "MEIN SERVER"` → landet in `config/banners/` |
| Alle übrigen Einstellungen (XP, Streamer, Free-Games, News …) | Web-Dashboard bzw. Slash-Befehle, gespeichert in `data/` |
| Weitere Server (max. 5) | `.env` (`ALLOWED_GUILD_IDS`) oder Dashboard → **Server-Freigabe** |
| Tägliche Daten-Sicherung | automatisch nach `data/_snapshots/<Datum>/` (7 Tage, `DATA_SNAPSHOT_DAYS`) |

Die Ordner `config/` und `data/` sowie die `.env` sind **nicht** im Git-Repo – deine Einstellungen bleiben bei `git pull` erhalten.

---

## 🌐 Web-Dashboard

| Dashboard-Bereich | Pfad | Zugriff | Beschreibung |
| :--- | :--- | :--- | :--- |
| **Server-Übersicht** | `/` | 🔒 Admin | Live-Zähler für Mitglieder, Kanäle, Rollen und Schnellaktionen. |
| **Server einrichten** | `/setup` | 🔒 Admin | Bereiche ankreuzen, ein Klick legt alle fehlenden Rollen & Kanäle an (Vorhandenes wird nur verknüpft). |
| **1-Klick Templates** | `/templates` | 🔒 Admin | Vorkonfigurierte Community-Vorlagen (Gaming, Streamer, Dev, Anime) mit Stilen und Auto-Backup. |
| **Server-Freigabe** | `/servers` | 👑 Bot-Besitzer | Bis zu 5 Server freigeben, Einladungs-Links, Belegung „x / 5“, Freigabe entfernen. |
| **Community-Wirtschaft & Shop** | `/economy` | 🌍 Öffentlich | Shop für exklusive Rollen & Badges, Guthaben-Übersicht und Transaktionen; Admins können Kontostände verwalten. |
| **Release-Kalender** | `/releases` | 🌍 Öffentlich | Interaktiver Kalender für kommende Gaming-Blockbuster mit Plattform- (PC, PS5, Xbox, Switch) und Zeitfiltern. |
| **Gratis-Spiele** | `/free-games` | 🌍 Öffentlich | Magazin für 100% kostenlose Vollversionen (Epic Games, Steam, GOG) mit Deep-Links; Admins verwalten Scan-Stores. |
| **Game-News & Treiber** | `/news` | 🌍 Öffentlich | Modernes Kachel-Magazin mit Volltext-Modal, Live-Suche, Hardware-, NAS- (UGREEN, Synology …) & Treiber-Updates. |
| **Level & Talk-Rangliste** | `/stats` | 🌍 Öffentlich | Top Levels (bis Stufe 25), Voice-Zeiten, Talk-Duos, XP-Regelwerk und Nutzer-Aufschlüsselung. |
| **Geburtstage** | `/birthdays` | 🔒 Admin | Kanal, Geburtstags-Rolle und Glückwunsch-Text einstellen, nächste Geburtstage sehen. |
| **Geplante Ankündigungen** | `/announcements` | 🔒 Admin | Nachrichten/Embeds zu einem Zeitpunkt senden - einmalig, täglich oder wöchentlich. |
| **Statistik-Kanäle** | `/server-stats` | 🔒 Admin | Live-Zähler ganz oben (Mitglieder, Online, Voice, Live, Boosts) mit eigenem Text. |
| **Game-Server** | `/game-servers` | 🔒 Admin | Minecraft-, Source-(CS2, Rust, ARK …) und Port-Abfrage (z. B. TeamSpeak), Prüfung alle 2 Minuten. |
| **Willkommens-Karte** | `/welcome` | 🔒 Admin | Grafische Canvas-Karte mit Vorschau, Test, individuellem Hintergrundbild und Willkommens-Rolle. |
| **Clip der Woche** | `/clips` | 🔒 Admin | Clip-Kanal, Wochentag und Uhrzeit der Kür, Live-Ranking der letzten 7 Tage, Gewinner-Historie, „Jetzt küren“. |
| **Web-Konsole** | `/console` | 🛡️ Nachrichten verwalten | Kanäle live mitlesen, als Bot schreiben, antworten oder löschen - alles im Audit-Log. |
| **Eigene Befehle** | `/custom-commands` | 🔒 Admin | Eigene `/befehle` (z. B. `/ts`) mit Text- oder Embed-Antwort, optional auch als `!befehl`. |
| **Module** | `/modules` | 🔒 Admin | Funktionen einzeln an- oder ausschalten – ausgeschaltete Module pausieren komplett, Daten bleiben erhalten. |
| **Benutzerverwaltung** | `/users` | 🔒 Admin | Mitgliederliste mit Nickname-Änderung, Rollen-Zuweisung, XP-Korrektur und Admin-Notizen. |
| **Moderation & Knast** | `/moderation` | 🔒 Admin | Warns, Timeouts, Kicks, Bans, Gefängnis-System (`/knast`), Bad-Name-Filter und Schimpfwort-Blacklist. |
| **Support-Tickets** | `/tickets` | 🔒 Admin | Live-Chat mit 2s Polling, Transkripte mit Embeds/Avataren und Support-Kategorie-Setup. |
| **VoiceMaster Lobbies** | `/voice` | 🔒 Admin | Join-to-Create Konfiguration, Master-Kanal & interaktives Steuerungs-Panel. |
| **Live-Streamer Manager** | `/live` | 🔒 Admin | Automatische Twitch-/YouTube-Erkennung, Stream-Alerts und temporäre Kanäle. |
| **Rollen & Verifikation** | `/roles` | 🔒 Admin | Regel-Akzeptanz (`@Gast`) und Benachrichtigungs-Rollen `bn.live`, `bn.free`, `bn.gamenews`, `bn.treiber`. |
| **Audit-Logs** | `/logs` | 🔒 Admin | Stille Protokollierung von Server-Aktionen (`SuppressNotifications`). |
| **Server-Backups** | `/backups` | 🔒 Admin | 1-Klick Snapshots aller Rollen & Kanäle, JSON Download & Upload, Cross-Server Transfer & Owner-Schutz. |
| **Server-Regeln** | `/rules` | 🔒 Admin | Regel-Editor mit Vorschau, 1-Klick-Veröffentlichung und Regel-Sperre (Server erst nach Bestätigung sichtbar). |
| **Radio- & Musik-Zentrale** | `/radio` | 🌍 Öffentlich | 4 übersichtliche Tabs: Radio-Sender, Soundboard & Uploads, Playlisten & Warteschlange, Bot-Einstellungen samt persistentem Top-Player. |
| **Hilfe & Befehle** | `/hilfe` | 🌍 Öffentlich | Vollständige Dokumentation aller 53 Slash-Befehle mit Beschreibungen. |
| **Changelog & Updates** | `/changelog` | 🌍 Öffentlich | Detaillierte Versionshistorie von v1.0.0 bis v2.26.0. |

---

## 🌟 Funktionen im Detail

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
* **Gefängnis- & Voice-Knast System (`/knast` & `/moderation`):**
  * `/knast einsperren <mitglied> <grund> [dauer]` isoliert ein Mitglied mit der Rolle `🔒・Gefängnis` (englisches Discord: `/prison lock`).
  * Alle bisherigen Rollen werden gesichert und entzogen.
  * **Voice-Knast:** Befindet sich das Mitglied in einem Sprachkanal, wird es automatisch in `#🔒・gefängnis-voice` verschoben. Andere Sprachkanäle sind gesperrt.
  * **Automatischer Timer:** Wählbare Haftdauer (z. B. 15m, 30m, 60m, 2h, 24h oder dauerhaft). Nach Ablauf der Zeit erfolgt eine automatische Entlassung mit Wiederherstellung aller Rollen.
  * Alle regulären Kanäle werden für die Gefängnis-Rolle gesperrt – sichtbar bleiben nur `#🔒・gefängnis` und `#🔒・gefängnis-voice`.
  * Inhaftierte können sich weder über „Regeln akzeptieren“ noch über Rollen-Buttons Rollen zurückholen.
  * `/knast freilassen` hebt die Haft manuell auf, `/knast liste` zeigt alle Inhaftierten inklusive Restzeit-Countdown.
* **Rangprüfung:** Moderatoren können nur Mitglieder bestrafen, die **unter** ihrer höchsten Rolle stehen - weder sich selbst noch den Owner. Das gilt für Slash-Befehle und das Dashboard.
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
* **Temporäre Live-Rolle:** Die Live-Rolle und der Kanal bleiben, solange **eine** Quelle „live“ meldet (Discord-Status, Twitch/YouTube-Poller, `/twitch-live` oder manuell vergebene Rolle) - und verschwinden, wenn keine mehr live ist.
* **Nur ein Alert pro Stream:** Kurze Abbrüche oder Neustarts lösen keinen zweiten Alert aus (offline erst nach 5 Min., höchstens ein Alert pro 30 Min.).

### 6. 🎮 Gratis-Spiele (Epic Games, Steam & GOG)
* **Automatischer Background-Scheduler:** Prüft alle 30 Minuten nach neuen 100% kostenlosen Vollversionen.
* **Stylische Einzel-Posts pro Spiel:** Jedes Spiel wird als eigene, detaillierte Nachricht mit Cover-Art, Preisersparnis, Store-Link und Ablaufdatum in `#free-games` gepostet.
* **Direkt-Aktionen & Launcher:** Jeder Post enthält Buttons für **„Im Browser öffnen“**, **„Im Launcher öffnen“** (`steam://` bzw. Epic-DeepLink) sowie Link zur Server-Webseite.
* **Spam-Schutz & Rollen-Ping:** Beim ersten Spiel einer Runde wird `@bn.free` gepingt, alle weiteren Spiele der gleichen Runde folgen lautlos ohne störende Mehrfach-Pings.
* Key-Verlosungen auf Drittseiten (Alienware Arena, IndieGala …) sind standardmäßig ausgeblendet.

### 7. 🛡️ Silent Audit-Logs & Server-Backups
* **Stille Benachrichtigungen:** Protokolliert Rollen-, Berechtigungs- und Kanaländerungen im Log-Kanal mit `SuppressNotifications` (keine störenden Audio-Pings).
* **Server-Backups & Cross-Server Migration:**
  * **1-Klick JSON-Snapshots:** Sichert die gesamte Struktur (Kategorien, Kanäle, Rollen, Berechtigungen) als JSON-Datei.
  * **Download & Upload:** Backups können als `.json`-Datei direkt auf den Rechner heruntergeladen oder per Klick importiert werden.
  * **Sichere Wiederherstellung:**
    * **👑 Inhaber-Schutz (`preserveOwnerRank`):** Weist dem Server-Owner (`guild.ownerId`) garantiert die oberste Admin-Rolle zu, damit der Inhaber niemals Rechte verliert.
    * **🧹 Mitglieder-Berechtigungen bereinigen (`stripMemberOverwrites`):** Spezifische User-Berechtigungen des Quellservers werden bei Kanal-Overwrites entfernt, sodass nur saubere Rollen übernommen werden.
    * **🌍 Cross-Server Transfer (`allowCrossServer`):** Erlaubt das Einspielen eines Backups auf einem komplett anderen Discord-Server.
    * **⚡ Optionaler Wipe:** Löscht auf Wunsch vor der Wiederherstellung alle alten Kanäle.

### 8. 📜 Regeln & Freischaltung
* `/setup-rules post` (oder Dashboard „Regeln“) legt `#📜・regeln` und `#🔔・berechtigungen` an und postet die Regeln mit animiertem Banner und Button **„Regeln akzeptieren“**.
* **Regel-Sperre** (`/setup-rules lock`): Neue Mitglieder sehen nur `#regeln`, bis sie akzeptieren. Bestehende Mitglieder bekommen beim Einschalten automatisch die Gast-Rolle.
* Unterstützt das Discord-Regel-Screening: Wer das Regel-Pop-up beim Beitreten bestätigt, bekommt die Gast-Rolle automatisch.
* Regeltexte im Dashboard bearbeitbar, Platzhalter `{server}`, `{@Name}`, `{permissions}`.

### 9. 📰 Game-News, 🖥️ Treiber- & Software-News & 🔧 Hardware-Feeds
* **Getrennte Kanäle & Rollen:** `#📰・game-news` (Rolle `bn.gamenews`) für Spiel-Updates und `#🖥️・treiber-software` (Rolle `bn.treiber`) für Treiber & Software - jeder sieht nur, was er abonniert hat.
* **Quellen:**
  * **Spiele:** Steam-Ankündigungen & Patchnotes jedes Steam-Spiels, Minecraft-Versionen & Snapshots.
  * **Treiber & Hardware:** NVIDIA GeForce (WHQL), AMD Radeon Adrenalin, AMD Ryzen Chipsatz (AM4/AM5), Intel Arc.
  * **NAS-Systeme:** Synology DSM, TrueNAS SCALE/CORE, Unraid OS, QNAP QTS, UGREEN NAS OS (UGOS Pro).
  * **Software & Codecs:** CubeCoders AMP (Game Server Management), K-Lite Codec Pack / LAV Filters, OBS Studio, HandBrake.
  * **Hardware- & Tech-News:** PC Games Hardware (PCGH), ComputerBase, Heise / c't Hardware (standardmäßig auf Web-Magazin beschränkt, modular aktivierbar).
* **Interaktives Kachel-Magazin (`/news`):** Modernes visuelles Kachel-Magazin mit Titelbildern, Teaser-Texten, relativer Zeitanzeige, Live-Suche und Schnellfiltern (*Alle*, *Spiele*, *Patchnotes*, *Treiber & Software*, *NAS-Systeme*, *Hardware & Tech*).
* **Volltext-Modal:** Klick auf eine Kachel öffnet formatierte Patchnotes mit Bildern, Listen und Direkt-Aktionen (*Im Web öffnen*, *In Steam öffnen*, *Direkt-Download*).
* Detailansicht im Dashboard mit „Was ist enthalten?“ und den letzten Beiträgen; Verlauf aller Änderungen; angepinnte Übersicht im Kanal.
* Prüfung alle 15 Minuten, beim Hinzufügen wird nichts Altes gepostet.

### 10. 📅 Game-Release-Kalender
* **Kommende Spiele & Große Updates:** Titel, Release-Datum, Plattformen (PC, PS5, Xbox Series, Switch, Game Pass), Genre, Cover sowie Store- und Trailer-Links.
* **Aktive Server-Spiele & Major Updates:** Berücksichtigt aktive Community-Spiele (Euro Truck Simulator 2, Call of Duty, GTA Online, Gray Zone Warfare, Minecraft) mit großen Updates und DLCs.
* **Filter & Badges:** Filter-Pills im Dashboard für *Alle*, *⚡ Große Updates & DLCs*, *🌟 Triple-A Blockbuster*, *🎮 Aktive Server-Spiele* und *🕹️ Neue Vollversionen*.
* **Slash-Befehl `/releases`:**
  * `/releases uebersicht [zeitraum] [plattform]`: Zeitraum *Diese Woche*, *Dieser Monat*, *Nächster Monat* oder *Alle kommenden*; Plattform *Alle*, *PC*, *PS5*, *Xbox Series*, *Switch* oder *Game Pass*.
  * `/releases post-woche`: Postet die Releases der laufenden Woche in den Ankündigungskanal.
* **Wochen-Post:** Montags um 10:00 Uhr automatisch im Game-News-Kanal.
* **Öffentliche Dashboard-Seite (`/releases`):** Ohne Login erreichbar, mit Zeitraum-Ansicht, Plattform-Filter und Release-Countdown.

### 11. 💰 Community-Wirtschaft, XP-Börse & Belohnungs-Shop
* **30-Minuten Schnell-Login per Code (`/web-login` & `/shop code`):**
  * Schneller Login ohne Discord-OAuth: `/web-login` in Discord ausführen und den Code auf der Webseite eingeben oder direkt auf den Link klicken.
  * Auch reguläre Server-Mitglieder können sich anmelden und im Shop einkaufen.
  * **Sicherheit:** Der Code besteht aus 6 zufälligen Zeichen (`GLG-K7P2WD`, erzeugt mit `crypto.randomBytes`), gilt 30 Minuten und nur einmal. Nach 10 Fehlversuchen wird die Eingabe pro IP 15 Minuten gesperrt; auffälliges Raten landet im System-Log.
* **Server-Währung (Coins):**
  * Konfigurierbarer Währungsname (z. B. *Coins*, *Credits*) und Symbol (`🪙`).
  * Einnahmequellen: Chat-Nachrichten, Voice-Aktivität und täglicher Bonus via `/daily` mit Streak-Bonus.
  * Interaktiver Guide im Dashboard („💡 So funktioniert das Coins- & Wirtschaftssystem“) zur transparenten Übersicht für alle Mitglieder.
* **📈 Level-Punkte Börse & Marktwirtschaft (`/shop tauschen`):**
  * Mitglieder können ihre hart erarbeiteten Level-XP direkt in Server-Coins umtauschen.
  * Flexibler Wechselkurs (`xpPerCoin`, z. B. 10 XP = 1 Coin) und Ein-/Ausschalten der Börse im Dashboard live konfigurierbar.
* **🎨 Namensfarben-System (Discord Farbrollen):**
  * Eigene Namensfarben im Shop kaufen, die die Farbe des Discord-Namens in der Mitgliederliste ändern.
  * **1-Klick Farbrollen-Generator:** Erstellt im Dashboard automatisch 6 leuchtende Farbrollen (`🎨 Neonrot`, `🎨 Cyber-Cyan`, `🎨 Goldgelb`, `🎨 Smaragdgrün`, `🎨 Amethystviolett`, `🎨 Flammenorange`) und trägt sie als Shop-Items ein.
  * **Automatischer Rollen-Tausch:** Beim Kauf einer neuen Namensfarbe wird die alte Farbrolle automatisch entfernt, um Konflikte in der Rollen-Hierarchie zu verhindern.
* **Belohnungs-Shop (`/shop`):**
  * Rollen, Namensfarben, Profil-Badges und Voice-Features im Web oder per Slash-Befehl kaufen – Discord-Rollen vergibt der Bot automatisch.
* **Transaktionen & Guthaben:**
  * `/balance`: Zeigt das persönliche Guthaben, den Vermögens-Rang und die letzten Transaktionen an.
  * `/pay <mitglied> <betrag>`: Sichere Überweisung zwischen Mitgliedern (mit Saldenprüfung).
* **Admin-Finanzverwaltung:**
  * `/economy geben | abziehen | setzen | reset`: Konten manuell anpassen, mit Grund im Log.
  * Volle Verwaltung im Dashboard unter `/economy` (nur für eingeloggte Admins sichtbar).

### 12. ⚡ 1-Klick Server-Templates & Live Kanal-Designer
* **8 Vorlagen von Klein bis Groß:**
  * 🌱 **Minimal Starter (Kompakt):** Schlank & übersichtlich für Freunde oder Kleingruppen (3 Kategorien, 7 Kanäle).
  * 🎮 **Gaming Clan & E-Sport (Standard):** Strukturierte Lobbys, Info-Hub & geschützter Teambereich.
  * 🌐 **Multi-Gaming Community (Groß):** Getrennte Spielbereiche (CS2, Valorant, Minecraft) und Gaming-Lounge.
  * 🏰 **Mega-Community & Netzwerk (Mega):** Das 8-Kategorien-Flaggschiff (32 Kanäle, VIP-Lounge, Stage, Gaming-Hub, Support & Leitung).
  * 🏆 **E-Sport & Turniere (Pro):** Für Scrims, Matches, Taktikboards, Coaches, Caster und Zuschauer.
  * 💻 **Coding / Dev / Tech (Standard):** Entwickler-Foren, Code-Review & Pair-Programming.
  * 🌸 **Anime, Manga & Hangout (Standard):** Fan-Art Showcase, Manga-Ecke & Watch-Party Kino.
  * 🔴 **Content Creator & Streamer (Standard):** Stream-Alerts, VIP-Bereich & Fan-Talk.
* **10 Design- & Schriftstile:**
  * *Small Caps* (`💬・ʜᴀᴜᴘᴛᴄʜᴀᴛ`), *Bold Sans* (`💬・𝗵𝗮𝘂𝗽𝘁𝗰𝗵𝗮𝘁`), *Aesthetic Small Caps* (`〢・ʜᴀᴜᴘᴛᴄʜᴀᴛ`), *Aesthetic Pipe* (`〢・hauptchat`), *Boxed Small Caps* (`「💬」ʜᴀᴜᴘᴛᴄʜᴀᴛ`), *Box & Bold* (`「💬」hauptchat`), *Cyber & Neon* (`◈・ʜᴀᴜᴘᴛᴄʜᴀᴛ`), *Gothic / Fraktur* (`⚔・𝖍𝖆𝖚𝖕𝖙𝖈𝖍𝖆𝖙`), *Modern mit Emojis* (`💬・hauptchat`), *Clean & Minimalistisch* (`hauptchat`).
* **✨ Live Kanal-Designer Tool (`/templates`):** Textfeld für Kanalnamen, Live-Vorschau aller 10 Schriftarten, 1-Klick-Kopieren sowie Live-Umbenennen bestehender Discord-Kanäle direkt aus dem Web.
* **Befehle:** `/server-setup` (Vorlagen ausrollen), `/channel-style` (Kanäle stylisch umbenennen) und `/font` (Text in Unicode-Fonts umwandeln).
* **Automatisches Sicherheits-Backup:** Vor jedem Ausrollen wird ein Snapshot-Backup erstellt – jederzeit per `/backup restore` wiederherstellbar. Optionaler Wipe-Modus für sauberen Neuanfang.

### 13. 🖼️ Rangkarte mit Badges & Willkommens-Hintergrund
* **Grafische Rangkarte (`/rank`):**
  * Bild mit Avatar, Level, XP-Fortschrittsbalken, Chat-/Voice-Statistik und Daily-Serie.
  * **Automatische Badges:** `👑 Inhaber`, `🛡️ Admin`, `⚔️ Mod`, Level-Meilensteine (`⭐ Level 5+/10+`, `💎 Level 20+`, `👑 Max-Level`), Daily-Serien (`🔥 7d`/`30d`), Chat (`💬 250+`/`1k+ Club`), Voice (`🎙️ 10h`/`50h`) und – wenn das Wirtschafts-Modul an ist – Coins (`🪙 1k Coins`/`Tycoon`).
* **Willkommens-Karte (`/welcome`):**
  * Grafische Begrüßung neuer Mitglieder mit Avatar, Name und Mitgliederzahl.
  * Eigenes Hintergrundbild per Bild-URL; ein dunkler Filter hält Text und Avatar lesbar. Live-Vorschau und Test-Button im Dashboard.

### 14. 📻 Radio- & Musik-Zentrale, Soundboard, Audio-Ducking & Auto-Cleanup
* **Intelligentes Audio-Ducking (`voiceDuckingService`):**
  * Sobald Personen im Sprachkanal sprechen, wird die Lautstärke des Radios oder der Musik automatisch auf 35 % abgesenkt (-65 %), damit Stimmen klar verständlich bleiben.
  * Sobald alle aufhören zu sprechen, wird die Lautstärke nach 800 ms sanft wieder auf den regulären Wert angehoben.
* **Dedizierte Steuerpanel-Textkanäle (`#📻・radio-steuerung` & `#🎵・musik-steuerung`):**
  * Interaktive Steuerpanels mit Sender-Auswahl (Standard- & eigene Web-Streams), Soundboard-Dropdown, Play/Pause/Stop, Status und Lautstärkereglern (`🔉 -10%`, `🔊 +10%`).
  * Kann per `/radio panel` bzw. `/music panel` eingerichtet oder automatisch via `/setup music` erstellt werden.
* **Auto-Cleanup & In-Place Updates:**
  * Klicks auf Panel-Buttons aktualisieren das Embed direkt *in-place*, ohne temporäre Pop-up-Nachrichten („Es läuft gerade keine Musik“) zu erzeugen.
  * Alle regulären Chatnachrichten in Panel-Kanälen werden nach 2,5 Sekunden automatisch gelöscht, sodass der Kanal dauerhaft aufgeräumt bleibt.
* **Persistenter Web-Player (`/radio`):**
  * Live-Status des aktuellen Streams (Titel, ICY-Metadaten, Sender-URL, aktiver Kanal).
  * Ziel-Sprachkanal-Wahl, Play/Pause, Stop und interaktive Lautstärkeregelung (`−`, `+` in 10%-Schritten).
* **4 übersichtliche Tabs im Webinterface:**
  * **📻 Radio-Sender:** Sofortsuche, Kategorie-Filter (*SUNSHINE LIVE*, *SomaFM*, *laut.fm*, *Eigene*), URL-Probe-Test, Sofort-Abspielen und `+ Temp-Kanal`.
  * **🎵 Soundboard & Musik:** Suchleiste für alle lokalen Audio-Dateien, Ordner-Pills, Direkt-Wiedergabe, Download-Button (`⬇`) und Drag & Drop in Playlisten.
  * **📤 Uploads:** Integrierter Drag & Drop Uploader (ganze Ordner werden automatisch als Playlist angelegt!) und Discord DM-Upload-Code Generator.
  * **📜 Playlisten & Queue:** Eigene Playlisten per Drag & Drop sortieren und abspielen; parallele Anzeige der Live-YouTube-Warteschlange.
  * **⚙️ Bot-Einstellungen:** Radio Bot-Name, Worker-Status (PID, Uptime, Restarts, Start/Stop/Restart) und Token-/Invite-Konfiguration für simultane Bots.
* **Auto-Cleanup für temporäre Musikkanäle:**
  * Sender-Kanäle (`📻・<Sender>`) erhalten beim Erstellen eine 2-minütige Beitrittsfrist (`120s Grace`).
  * Wenn der letzte Mensch den Kanal verlässt, läuft ein 60s Countdown ab; danach trennt der Bot die Verbindung und löscht den temporären Kanal automatisch.
  * Bestehende Standard-Talk-Kanäle werden bei Inaktivität verlassen, aber nicht gelöscht.

---

## 💻 Befehlsübersicht (53 Slash-Befehle)

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/help` | Übersicht aller Befehle mit Link zum Dashboard. | Alle |
| `/radio start <url> \| stop \| pause \| resume \| volume [prozent] \| status \| ton` | Web-Radio-Stream im Voice-Kanal abspielen, Lautstärke anpassen (auch `/radio volumen`); `ton` spielt 5s Test-Audio. | Alle |
| `/radio panel [kanal]` | Richtet `#📻・radio-steuerung` ein oder postet das Radio-Panel. | Kanäle verwalten |
| `/radio add <name> <url> \| remove \| list` | Eigene Radio-Streams speichern, löschen und verwalten. | Kanäle verwalten |
| `/music play <titel\|url\|local:name> \| skip \| queue \| pause \| resume \| stop \| loop \| volume \| shuffle \| history` | YouTube- & lokale Musik mit Warteschlange, Lautstärke und Loop-Modus. | Alle |
| `/music spotify <link>` | Importiert Spotify-Playlisten (bis 30 Tracks) als YouTube-Suche. | Alle |
| `/music upload <datei> [code]` | Eigene Audio-Dateien (MP3/WAV/OGG/M4A) per Chat hochladen (DJ-Rolle, Recht oder Code). | Alle |
| `/music panel [kanal]` | Richtet `#🎵・musik-steuerung` ein oder postet das Musik-Panel. | Kanäle verwalten |
| `/soundboard list \| play <sound>` | Soundboard-Audio aus `data/music/` direkt im Voice abspielen. | Alle |
| `/ping` | Zeigt die Latenz des Bots (im Chat auch `!ping`). | Alle |
| `/rank [mitglied]` | Grafische Canvas-Rangkarte mit Level, Badges, Rang, Fortschritt, XP-Herkunft und Daily-Serie. | Alle |
| `/level status \| sync-roles` | Eigener Level-Fortschritt bzw. verdiente Belohnungsrollen nachträglich vergeben. | Alle |
| `/daily` | Tägliche Belohnung: Coins und XP mit Streak-Bonus. | Alle |
| `/balance [mitglied]` | Zeigt das aktuelle Coin-Guthaben, Vermögens-Rang und die letzten Transaktionen an. | Alle |
| `/pay <mitglied> <betrag>` | Überweist Coins sicher an ein anderes Mitglied. | Alle |
| `/shop uebersicht \| kaufen [artikel]` | Belohnungs-Shop: Exklusive Rollen und Badges mit Coins durchstöbern oder kaufen. | Alle |
| `/releases uebersicht \| post-woche` | Game-Release-Kalender: Kommende Blockbuster nach Zeitraum & Plattform filtern oder im Kanal posten. | Alle |
| `/serverstatus` | Live-Status der eingetragenen Game-Server. | Alle |
| `/lfg <spiel> <spieler> [rang] [beschreibung]` | Mitspieler suchen - volle Gruppe bekommt eine eigene Lobby. | Alle |
| `/birthday set \| remove \| list \| setup` | Geburtstag eintragen (nur Tag & Monat), nächste Geburtstage, Kanal & Rolle einrichten. | Alle / Server verwalten |
| `/leaderboard [kategorie]` | Top-Ranglisten für Gesamt-XP, Voice-Zeit, Chat-Aktivität und Reichtum. | Alle |
| `/voice-stats [mitglied]` | Eigene Voice-Zeit und Top-Gesprächspartner. | Alle |
| `/top-voice` | Rangliste der aktivsten Sprach-Duos und Voice-Nutzer. | Alle |
| `/suggest neu \| status` | Vorschlag mit Abstimmungs-Buttons einreichen bzw. Status setzen. | Alle / Server verwalten |
| `/giveaway start \| end \| reroll` | Verlosungen mit Teilnahme-Button und automatischer Ziehung. | Server verwalten |
| `/free-games list \| post \| einstellungen` | Aktuell kostenlose Spiele anzeigen (nur für dich), sofort posten oder Stores an/aus. | Alle / Server verwalten |
| `/twitch-live start \| stop` | Sich selbst als live melden bzw. beenden. | Alle |
| `/voice lock \| unlock \| hide \| unhide \| name \| limit \| bitrate \| permit \| reject \| transfer \| claim \| password` | Eigene Lobby steuern (inkl. Passwort). | Lobby-Besitzer |
| `/warn <mitglied> <grund>` | Verwarnung mit XP-Abzug. | Mitglieder moderieren |
| `/timeout <mitglied> <dauer> <grund>` | Timeout mit XP-Abzug. | Mitglieder moderieren |
| `/knast einsperren \| freilassen \| liste` | Gefängnis-System mit Voice-Knast & Timer (englisches Discord: `/prison lock \| release \| list`). | Mitglieder moderieren |
| `/kick <mitglied> [grund]` | Kick mit XP-Abzug. | Mitglieder kicken |
| `/ban <mitglied> [grund] [tage]` | Bann mit Nachrichten-Bereinigung. | Mitglieder bannen |
| `/unban <user_id>` | Bann aufheben. | Mitglieder bannen |
| `/case view \| user \| delete` | Moderationsfälle ansehen oder löschen. | Mitglieder moderieren |
| `/clear <anzahl> [mitglied]` | Bis zu 100 Nachrichten löschen. | Nachrichten verwalten |
| `/sticky set \| remove` | Hinweis als letzte Nachricht im Kanal fixieren. | Nachrichten verwalten |
| `/dm <nachricht> [empfaenger]` | Private Nachricht im Namen des Servers. | Nachrichten verwalten |
| `/setup-voice set \| status \| disable` | Join-to-Create einrichten. | Kanäle verwalten |
| `/voice-panel` | Voice-Steuerungs-Panel posten. | Kanäle verwalten |
| `/interface` | Alternatives Steuerungs-Panel für Voice-Lobbys posten. | Kanäle verwalten |
| `/setup-live set \| status \| disable` | Live-Rolle, Kategorie und Kanal-Art einrichten. | Kanäle verwalten |
| `/streamer add \| edit \| remove \| list \| check` | Twitch-/YouTube-Alerts verwalten. | Kanäle verwalten |
| `/stream-panel` | Steuer-Panel für den Live-Kanal (Passwort, Limit, Name, Sperren, Bitrate). | Kanäle verwalten |
| `/setup-roles set \| panel \| auto \| status` | Rollen & Rollen-Panel einrichten (`auto` legt alle Rollen und Kanäle an). | Rollen verwalten |
| `/setup-all [bereich] [regel_sperre]` | Alle fehlenden Rollen & Kanäle auf einmal einrichten. | Administrator |
| `/server-setup [template] [style] [wipe]` | 1-Klick Server-Templates: Richtet komplette Server-Strukturen von klein bis groß mit wählbarem Stil ein. | Administrator |
| `/channel-style [stil] [name] [kanal]` | Discord-Kanal in stylische Schriftarten & Symbole (Small Caps, Bold, Gothic etc.) umbenennen. | Kanäle verwalten |
| `/font <text> [stil]` | Text in stylische Unicode-Schriften (Small Caps, Bold Sans, Gothic, Monospace etc.) umwandeln. | Alle |
| `/economy geben \| abziehen \| setzen \| reset` | Wirtschaftssystem verwalten und Nutzer-Guthaben anpassen. | Administrator |
| `/modules status \| enable \| disable \| toggle` | Funktionen (Module) an- oder ausschalten. | Administrator |
| `/server-stats einrichten \| entfernen \| status` | Statistik-Kanäle mit Live-Zählern ganz oben. | Kanäle verwalten |
| `/setup-rules post \| lock \| unlock` | Regeln posten, Regel-Sperre an/aus. | Administrator |
| `/setup-tickets` | Ticket-Panel posten. | Administrator |
| `/setup-logs auto \| set \| status \| toggle` | Audit-Log-Kanal einrichten, Status anzeigen und Kategorien an/aus. | Administrator |
| `/logs list \| search` | Audit-Log durchsuchen. | Audit-Log anzeigen |
| `/backup create \| list \| restore \| export \| delete` | Server-Backups erstellen, als JSON exportieren/downloaden und wiederherstellen (inkl. Cross-Server & Owner-Schutz). | Administrator |

---

## 🏗️ Aufbau

```
Internet ──HTTPS──▶ Reverse Proxy (z. B. Caddy) ──▶ Next.js-Dashboard :3000
                                                         │  interne API (127.0.0.1:3101, Token-geschützt)
                                                         ▼
                                                   Discord-Bot (discord.js) ──▶ Discord
Daten: JSON-Dateien in data/   ·   Prozesse: PM2 (discord-bot, discord-web)
```

### Windows-Helfer (optional)
Für Entwicklung auf Windows mit Server-Upload per SSH: `start.bat` (Kontrollzentrum) und `sync_server.bat`
(Upload, Build & PM2-Neustart). Zugangsdaten dafür in `server_config.ini` – Vorlage: `server_config.example.ini`.
Eine Beispiel-Anleitung für Proxmox findest du in [`proxmox_anleitung.md`](proxmox_anleitung.md).

### Lokale Entwicklung
```bash
npm install && (cd web && npm install)
npm run deploy-commands
npm run dev                 # Bot mit Auto-Reload
cd web && npm run dev       # Dashboard auf http://localhost:3000
```

---

## 🌍 Mehrere Server (max. 5)

Ein Bot kann bis zu **5 Discord-Server** gleichzeitig betreuen - aber nur Server, die freigegeben sind:

* **Haupt-Server** ist `GUILD_ID` aus der `.env` (immer erlaubt). Weitere Server über `ALLOWED_GUILD_IDS` oder im Dashboard unter **Server-Freigabe** (nur für den Bot-Besitzer, `BOT_OWNER_ID` bzw. Owner des Haupt-Servers).
* Wird der Bot auf einen **nicht freigegebenen** Server eingeladen oder sind die 5 voll, schreibt er dem Owner eine kurze Nachricht und **verlässt den Server sofort** - auch wenn die Einladung passiert ist, während der Bot offline war.
* Slash-Befehle werden für jeden freigegebenen Server automatisch registriert.
* Alle Einstellungen, Level, Fälle und Logs sind **pro Server getrennt**. Auf neuen Servern sind zuerst nur die Grundmodule an (Regeln, Rollen, Moderation, Voice) - der Rest wird unter **Module** eingeschaltet.
* Im Dashboard wechselt man oben links unter dem Bot-Namen zwischen den Servern. Man sieht nur Server, auf denen man Owner, Administrator oder „Server verwalten“ hat.
* Wird eine Freigabe entfernt, verlässt der Bot den Server; die Daten bleiben 30 Tage gespeichert (`PURGE_REMOVED_GUILDS_DAYS`) und werden danach beim nächsten Neustart gelöscht – oder sofort per Knopf in der Server-Freigabe.

---

## 🔐 Authentifizierung & Rechte

* **Öffentliche Seiten:** `/hilfe`, `/changelog`, `/stats`, `/free-games`, `/news`, `/releases` und `/economy` sind ohne Login direkt für Gäste und Besucher zugänglich.
* **Geschützte Admin-Bereiche:** Anmeldung erfolgt über Discord OAuth2. Zugriff haben Server-Owner, Mitglieder mit *Administrator* oder *Server verwalten*, sowie alle in `DASHBOARD_ROLE_IDS` bzw. `DASHBOARD_USER_IDS` hinterlegten Accounts.
* **Automatischer Logout:** Die Rechte werden jede Minute bei Discord neu geprüft. Wird der Admin-Zugang entzogen oder der Server verlassen, ist man beim nächsten Klick abgemeldet.
* **Öffentliche Statistik:** Ohne Login sind nur Level und XP sichtbar - Moderationsfälle und Gesprächspartner nur für eingeloggte Admins.
* **Rechte im Dashboard:** Rollen mit Admin- oder Verwaltungsrechten dürfen nur Administratoren vergeben; Rollen, Spitznamen und Strafen nur für Mitglieder unterhalb der eigenen Rolle.
* **Bot-Schnittstelle:** Das Dashboard spricht mit dem Bot über `127.0.0.1:3101`, geschützt mit `SESSION_SECRET` (bzw. `INTERNAL_API_TOKEN`).

---

## 📄 Lizenz

[MIT](LICENSE) – frei nutzbar, veränderbar und weitergebbar. Die Schriften in `assets/fonts` (Inter, Orbitron) stehen unter der SIL Open Font License (siehe `assets/fonts/OFL-*.txt`). Über einen Stern ⭐ auf GitHub freue ich mich.
