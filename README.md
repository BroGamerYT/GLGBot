# 🤖 GermanyLanGame-Bot (GLGBot)

Ein moderner, modularer und hochperformanter Discord-Bot in **TypeScript (discord.js v14)** mit interaktivem **VoiceMaster-System**, **dynamischen Live-Streamer-Kanälen**, **Level-System mit Talk-Partner-Tracking**, **Gefängnis- & Moderations-System**, **Echtzeit-Support-Tickets** und vollständigem **Web-Dashboard** unter [`https://glgbot.brogameryt.de`](https://glgbot.brogameryt.de).

---

## 🌐 Zentrales Web-Dashboard (`https://glgbot.brogameryt.de`)

Alle Server-Funktionen können sowohl **im Discord-Chat via Slash-Befehle** als auch **im Web-Dashboard** in Echtzeit konfiguriert und gesteuert werden:

| Dashboard-Bereich | Pfad | Zugriff | Beschreibung |
| :--- | :--- | :--- | :--- |
| **Server-Übersicht** | `/` | 🔒 Admin | Live-Zähler für Mitglieder, Kanäle, Rollen und Schnellaktionen. |
| **Benutzerverwaltung** | `/users` | 🔒 Admin | Mitgliederliste mit Nickname-Änderung, Rollen-Zuweisung, XP-Korrektur und Admin-Notizen. |
| **Moderation & Knast** | `/moderation` | 🔒 Admin | Warns, Timeouts, Kicks, Bans, Gefängnis-System (`/knast`), Bad-Name-Filter und Schimpfwort-Blacklist. |
| **Support-Tickets** | `/tickets` | 🔒 Admin | Live-Chat mit 2s Polling, Transkripte mit Embeds/Avataren und Support-Kategorie-Setup. |
| **Level & Talk-Rangliste** | `/stats` | 🌍 Öffentlich | Top Levels (bis Stufe 25), Voice-Zeiten, Talk-Duos, XP-Regelwerk und Nutzer-Aufschlüsselung. |
| **VoiceMaster Lobbies** | `/voice` | 🔒 Admin | Join-to-Create Konfiguration, Master-Kanal & interaktives Steuerungs-Panel. |
| **Live-Streamer Manager** | `/live` | 🔒 Admin | Automatische Twitch-/YouTube-Erkennung, Stream-Alerts und temporäre Kanäle. |
| **Rollen & Verifikation** | `/roles` | 🔒 Admin | Regel-Akzeptanz (`@Gast`) und Benachrichtigungs-Rollen `bn.live`, `bn.free`, `bn.gamenews`, `bn.treiber`. |
| **Gratis-Spiele** | `/free-games` | 🔒 Admin | Scan nach 100% kostenlosen Vollversionen (Epic Games, Steam, GOG) mit Deep-Links. |
| **Game-News & Treiber** | `/news` | 🔒 Admin | Patchnotes & Updates für Spiele (`#game-news`) und getrennt davon neue NVIDIA-/AMD-/Intel-Treiber (`#treiber-news`), eigene Steam-Spiele per Link. |
| **Audit-Logs** | `/logs` | 🔒 Admin | Stille Protokollierung von Server-Aktionen (`SuppressNotifications`). |
| **Server-Backups** | `/backups` | 🔒 Admin | 1-Klick JSON-Snapshots aller Rollen, Kanäle und Einstellungen mit Wiederherstellung. |
| **Server-Regeln** | `/rules` | 🔒 Admin | Regel-Editor mit Vorschau, 1-Klick-Veröffentlichung und Regel-Sperre (Server erst nach Bestätigung sichtbar). |
| **Hilfe & Befehle** | `/hilfe` | 🌍 Öffentlich | Vollständige Dokumentation aller 32 Slash-Befehle mit Beschreibungen. |
| **Changelog & Updates** | `/changelog` | 🌍 Öffentlich | Detaillierte Versionshistorie von v1.0.0 bis v2.4.0. |

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
* **Gefängnis-System (`/knast` & `/moderation`):**
  * `/knast einsperren` isoliert ein Mitglied mit der Rolle `🔒・Gefängnis` (englisches Discord: `/prison lock`).
  * Alle bisherigen Rollen werden gespeichert und entzogen, das Mitglied fliegt aus dem Voice.
  * Alle Kategorien und Kanäle werden für die Gefängnis-Rolle gesperrt - sichtbar bleibt nur `#🔒・gefängnis`.
  * Inhaftierte können sich weder über „Regeln akzeptieren“ noch über die Rollen-Buttons Rollen zurückholen.
  * `/knast freilassen` stellt alle ursprünglichen Rollen wieder her, `/knast liste` zeigt alle Inhaftierten.
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
* Postet stylische Embeds mit Cover-Art, Store-Link und Ablaufdatum in den `#free-games` Kanal mit Rollen-Ping für `@bn.free`.
* Buttons **„In Steam öffnen“ / „Im Epic Launcher öffnen“** starten direkt die App (über die Weiterleitung `/go/…` im Dashboard).
* Mehrere Spiele kommen gesammelt in einer Nachricht - nur ein Ping, weitere Nachrichten lautlos.
* Key-Verlosungen auf Drittseiten (Alienware Arena, IndieGala …) sind standardmäßig ausgeblendet.

### 7. 🛡️ Silent Audit-Logs & Server-Backups
* **Stille Benachrichtigungen:** Protokolliert Rollen-, Berechtigungs- und Kanaländerungen im Log-Kanal mit `SuppressNotifications` (keine störenden Audio-Pings).
* **Server-Backups:** Sichert die gesamte Struktur (Kategorien, Kanäle, Rollen, Berechtigungen) als JSON-Snapshot mit 1-Klick-Wiederherstellung.

---

## 💻 Vollständige Befehlsübersicht (32 Slash-Befehle)

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/help` | Übersicht aller Befehle mit Link zum Dashboard. | Alle |
| `/ping` | Zeigt die Latenz des Bots. | Alle |
| `/rank [mitglied]` | Rangkarte mit Level, XP, Fortschritt und XP-Herkunft. | Alle |
| `/level status [oeffentlich]` | Eigener Level-Status: wie viele XP / Nachrichten / Voice-Minuten bis zum nächsten Level fehlen (nur für dich sichtbar). | Alle |
| `/leaderboard` | Top-Ranglisten für Level, Voice-Zeit und Talk-Duos. | Alle |
| `/voice-stats` | Eigene Voice-Zeit und Top-Gesprächspartner. | Alle |
| `/top-voice` | Rangliste der meisten Sprachzeit. | Alle |
| `/suggest neu \| status` | Vorschlag mit Abstimmungs-Buttons einreichen bzw. Status setzen. | Alle / Server verwalten |
| `/free-games list` | Aktuell kostenlose Spiele (nur für dich sichtbar). | Alle |
| `/free-games post \| einstellungen` | Sofort posten bzw. Stores an/aus. | Server verwalten |
| `/twitch-live start \| stop` | Sich selbst als live melden bzw. beenden. | Alle |
| `/voice lock \| unlock \| hide \| unhide \| name \| limit \| bitrate \| permit \| reject \| transfer \| claim` | Eigene Lobby steuern. | Lobby-Besitzer |
| `/warn <mitglied> <grund>` | Verwarnung mit XP-Abzug. | Mitglieder moderieren |
| `/timeout <mitglied> <dauer> <grund>` | Timeout mit XP-Abzug. | Mitglieder moderieren |
| `/knast einsperren \| freilassen \| liste` | Gefängnis-System (englisches Discord: `/prison lock \| release \| list`). | Mitglieder moderieren |
| `/kick <mitglied> [grund]` | Kick mit XP-Abzug. | Mitglieder kicken |
| `/ban <mitglied> [grund] [tage]` | Bann mit Nachrichten-Bereinigung. | Mitglieder bannen |
| `/unban <user_id>` | Bann aufheben. | Mitglieder bannen |
| `/case view \| user \| delete` | Moderationsfälle ansehen oder löschen. | Mitglieder moderieren |
| `/clear <anzahl> [mitglied]` | Bis zu 100 Nachrichten löschen. | Nachrichten verwalten |
| `/sticky set \| remove` | Hinweis als letzte Nachricht im Kanal fixieren. | Nachrichten verwalten |
| `/dm <nachricht> [empfaenger]` | Private Nachricht im Namen des Servers. | Nachrichten verwalten |
| `/setup-voice set \| status \| disable` | Join-to-Create einrichten. | Kanäle verwalten |
| `/voice-panel` / `/interface` | Voice-Steuerungs-Panel posten. | Kanäle verwalten |
| `/setup-live set \| status \| disable` | Live-Rolle, Kategorie und Kanal-Art einrichten. | Kanäle verwalten |
| `/streamer add \| edit \| remove \| list \| check` | Twitch-/YouTube-Alerts verwalten. | Kanäle verwalten |
| `/setup-roles set \| panel \| auto \| status` | Rollen & Rollen-Panel einrichten (`auto` legt alle Rollen und Kanäle an). | Rollen verwalten |
| `/setup-rules post \| lock \| unlock` | Regeln posten, Regel-Sperre an/aus. | Administrator |
| `/setup-tickets` | Ticket-Panel posten. | Administrator |
| `/setup-logs` | Audit-Log-Kanal einrichten. | Administrator |
| `/logs list \| search` | Audit-Log durchsuchen. | Audit-Log anzeigen |
| `/backup create \| list \| restore \| export \| delete` | Server-Backups verwalten. | Administrator |

---|---|---|
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

### 8. 📜 Regeln & Freischaltung
* `/setup-rules post` (oder Dashboard „Regeln“) legt `#📜・regeln` und `#🔔・berechtigungen` an und postet die Regeln mit animiertem Banner und Button **„Regeln akzeptieren“**.
* **Regel-Sperre** (`/setup-rules lock`): Neue Mitglieder sehen nur `#regeln`, bis sie akzeptieren. Bestehende Mitglieder bekommen beim Einschalten automatisch die Gast-Rolle.
* Unterstützt das Discord-Regel-Screening: Wer das Regel-Pop-up beim Beitreten bestätigt, bekommt die Gast-Rolle automatisch.
* Regeltexte im Dashboard bearbeitbar, Platzhalter `{server}`, `{@Name}`, `{permissions}`.

### 9. 📰 Game-News & 🖥️ Treiber-News
* **Getrennte Kanäle & Rollen:** `#📰・game-news` (Rolle `bn.gamenews`) für Spiel-Updates und `#🖥️・treiber-news` (Rolle `bn.treiber`) für Treiber - jeder sieht nur, was er abonniert hat.
* **Quellen:** Steam-Ankündigungen & Patchnotes jedes Steam-Spiels (Vorschläge wie GTA V, CS2, Rust … oder eigenes Spiel per Link/App-ID), Minecraft-Versionen, NVIDIA GeForce, AMD Radeon, AMD Ryzen Chipsatz, Intel Arc (AMD/Intel als Beta).
* Detailansicht im Dashboard mit „Was ist enthalten?“ und den letzten Beiträgen; Verlauf aller Änderungen; angepinnte Übersicht im Kanal.
* Prüfung alle 15 Minuten, beim Hinzufügen wird nichts Altes gepostet.

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
* **Automatischer Logout:** Die Rechte werden jede Minute bei Discord neu geprüft. Wird der Admin-Zugang entzogen oder der Server verlassen, ist man beim nächsten Klick abgemeldet.
* **Öffentliche Statistik:** Ohne Login sind nur Level und XP sichtbar - Moderationsfälle und Gesprächspartner nur für eingeloggte Admins.
* **Rechte im Dashboard:** Rollen mit Admin- oder Verwaltungsrechten dürfen nur Administratoren vergeben; Rollen, Spitznamen und Strafen nur für Mitglieder unterhalb der eigenen Rolle.
* **Bot-Schnittstelle:** Das Dashboard spricht mit dem Bot über `127.0.0.1:3101`, geschützt mit `SESSION_SECRET` (bzw. `INTERNAL_API_TOKEN`).
