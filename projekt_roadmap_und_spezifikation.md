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
* **Web-Frontend:** Next.js, React, Tailwind CSS, Shadcn UI (Dark Theme) – Domain: `https://glgbot.brogameryt.de`
* **Web-Auth:** Discord OAuth2 (Session-Prüfung auf Server-Administratorrechte)
* **Hosting / 24/7 Server:** Proxmox VE LXC Container 109 (`discordbot`), Debian 12, Node.js 22 LTS, PM2 Service
* **Reverse Proxy:** Caddy auf CT 102 (`synchro-proxy`) für automatische SSL-Zertifikate & Routing
* **Datenbank:** PostgreSQL (via Prisma ORM) + Redis (Cache / Live-Events)
* **Audio-Worker:** Lavalink Node (entkoppelte Musik-Wiedergabe)

---

## 2. Vollständige Master-To-Do-Liste

### Phase 1: Vorbereitung & Infrastruktur
- [x] **Discord Developer Portal:**
  - [x] Neue Application & Bot anlegen.
  - [x] Gateway Intents aktivieren (`Server Members`, `Message Content`, `Presence`).
  - [x] OAuth2 Redirect URL für das Web-Dashboard eintragen.
  - [x] Bot-Token und Client Secret sicher als Umgebungsvariablen (`.env`) konfigurieren.
- [ ] **Entwicklungsumgebung:**
  - [x] Git-Repository initialisieren und Branch-Strategie definieren.
  - [x] Modulare Ordnerstruktur für Commands, Events, Services und Web aufsetzen (TypeScript / discord.js).
  - [ ] Datenbank anbinden (PostgreSQL Schema & ORM wie Prisma).

---

### Phase 2: Sicherheit & Moderations-Systeme
- [ ] **Anti-Nuke-System:**
  - [ ] Ratenbegrenzung für administrative Aktionen (z. B. max. 3 Kanal-/Rollenlöschungen pro Minute).
  - [ ] Automatische Notfallsperre: Rechteroboter/Admin-Account sofort bannen und Server sperren.
- [ ] **Anti-Raid & Phishing-Schutz:**
  - [ ] Domain-Blacklist zur Erkennung gefälschter Steam-, Nitro- oder Login-Links.
  - [ ] Erkennung von Massen-Beitritten (Mass-Joins) mit temporärem Auto-Lockdown.
- [ ] **Verifikations-Schleuse (Gatekeeping):**
  - [ ] Button-basierte Regelbestätigung oder Captcha für neue Accounts vor Kanal-Freischaltung.
- [ ] **Moderations- & Case-System:**
  - [ ] Slash-Commands: `/warn`, `/timeout`, `/kick`, `/ban`, `/unban`.
  - [ ] Eindeutige Fall-Nummern (`Case #101`) in der Datenbank mit Moderator, Grund und Beweislinks.

---

### Phase 3: Creator- & Community-Module
- [ ] **Live- & Content-Alerts:**
  - [ ] **Twitch:** EventSub Webhook für `stream.online` und `stream.offline`.
  - [ ] **YouTube:** Upload- und Stream-Erkennung über WebSub / RSS.
  - [ ] **TikTok:** Polling-/Webhook-Anbindung für TikTok-Live-Sessions.
  - [ ] Dynamische Streamer-Rolle (z. B. `🔴 Live Jetzt`) beim Start zuweisen und bei Ende entfernen.
- [ ] **Free-Games-Tracker:**
  - [ ] Automatisierter Cronjob (jeden Donnerstag 17:00 Uhr für Epic Games Store).
  - [ ] Steam 100%-Discounts API-Polling.
  - [ ] Automatischer Post im Ankündigungskanal mit Bild, Link und `@FreeGames`-Ping.
- [x] **Auto-Move & Temporäre Voice-Kanäle:**
  - [x] "Join to Create"-Masterkanal konfigurieren (`/setup-voice`).
  - [x] Beim Betreten dynamisch neuen Kanal `🔊・Lobby von [Name]` anlegen und Nutzer verschieben.
  - [x] Kanal automatisch löschen, sobald sich 0 Personen darin aufhalten.
- [ ] **Rollen-Management & Onboarding:**
  - [ ] Auto-Rolle bei Serverbeitritt (`on_member_join`).
  - [ ] Interaktives Rollen-Panel mit Buttons (Gaming-Rollen, Stream-Pings, Notification-Filter).
- [ ] **Ticket- & Support-System:**
  - [ ] Erstellung privater Ticket-Threads/Kanäle via Dropdown/Button.
  - [ ] Befehl `/close` mit automatischer Transkript-Erstellung (HTML-Archiv).
- [ ] **Community-Tools:**
  - [ ] Vorschlagssystem (`/suggest`) mit Upvote-/Downvote-Buttons.
  - [ ] Sticky Messages (wichtige Info bleibt immer als letzte Nachricht fixiert).
  - [ ] Auto-Purge für temporäre Bot- oder Medien-Kanäle.

---

### Phase 4: Logging & Server-Backups
- [ ] **Lückenloses Audit-Logging:**
  - [ ] **Nachrichten:** Gelöschte Nachrichten (mit Inhalt/Attachments), Bearbeitungen (Vorher/Nachher).
  - [ ] **Server:** Rollenerstellung, Berechtigungsänderungen, Kanalerstellungen/-löschungen.
  - [ ] **Mitglieder:** Joins, Leaves, Nickname-Änderungen, Rollenvergaben.
  - [ ] **Voice:** Beitritt, Verlassen, Kanalwechsel, Mute/Deafen-Status.
  - [ ] Strukturierte Speicherung aller Logs in der Datenbank für die Webansicht.
- [ ] **Backup- & Restore-Engine:**
  - [ ] JSON-Snapshot aller Rollen (Farben, Rechte, Position).
  - [ ] JSON-Snapshot aller Kategorien und Kanäle inklusive Berechtigungsüberschreibungen (*Permission Overwrites*).
  - [ ] Geplanter automatischer Snapshot (täglich um Mitternacht).
  - [ ] 1-Klick-Wiederherstellung bzw. Klon-Funktion für neue Zielserver.

---

### Phase 5: Web-Dashboard (Admin-Interface)
- [ ] **Basis & Authentifizierung:**
  - [ ] Next.js Frontend im modernen Dark Theme (Tailwind CSS).
  - [ ] Discord OAuth2 Login mit Rollen-/Berechtigungsprüfung (`Administrator`).
- [ ] **Kanal- & Berechtigungs-Manager:**
  - [ ] Grafische Übersicht aller Serverkanäle und Kategorien.
  - [ ] Kanäle per Web erstellen, umbenennen, sortieren und löschen.
  - [ ] Berechtigungsmatrix (Toggle-Schalter für Lese-, Schreib- und Voice-Rechte).
- [ ] **Live-Audit-Log-Viewer:**
  - [ ] Interaktive Datentabelle mit Filterung nach Event-Typ, Moderator, Nutzer und Datumsbereich.
  - [ ] Detail-Modal für Nachrichten-Verläufe und Änderungen.
- [ ] **Visueller Embed-Builder:**
  - [ ] WYSIWYG-Editor mit Live-Discord-Vorschau.
  - [ ] Unterstützung für Farben, Autoren, Footer, Felder, Bilder und Buttons.
  - [ ] Direkter Versand-Button in einen gewählten Discord-Kanal.
- [ ] **Ticket- & Fallakten-Verwaltung:**
  - [ ] Web-Viewer für gespeicherte HTML-Transkripte geschlossener Tickets.
  - [ ] Einsicht in die Moderations-Akten einzelner Nutzer (Warn-Historie, Notizen).
- [ ] **Backup-Center:**
  - [ ] Übersicht aller vorhandenen JSON-Snapshots.
  - [ ] Manueller Backup-Auslöser und Einspielen auf verbundene Server.

---

### Phase 6: Multi-Bot-Architektur & System-Monitoring
- [ ] **Sub-Bot-Verwaltung:**
  - [ ] Prozess-Trennung: Haupt-Bot läuft unabhängig von rechenintensiven Sub-Bots.
  - [ ] Musik-Bot Worker angebunden an Lavalink für latenzfreies Streaming.
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

## 4. Nächste Meilensteine zur Umsetzung

1. **Sprint 1:** Bot-Basis aufsetzen + Auto-Move Voice + Free-Games Cronjob.
2. **Sprint 2:** Stream-Alerts (Twitch/YouTube) + Rollen-Vergabe bei Live-Start.
3. **Sprint 3:** Logging-Engine + Backup/Restore-Logik (JSON-Export).
4. **Sprint 4:** Next.js Dashboard mit Discord OAuth2 + Embed-Builder.
5. **Sprint 5:** Anti-Nuke-Schutz + Ticketsystem mit Web-Transkripten.