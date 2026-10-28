# Proxmox LXC Container (CT) – 24/7 Setup für Discord-Bot

Diese Anleitung führt dich durch die Einrichtung eines leichtgewichtigen Debian/Ubuntu LXC-Containers auf Proxmox VE, damit dein Discord-Bot rund um die Uhr (24/7) online ist.

---

## 1. Container (CT) in Proxmox erstellen

Klicke in deiner Proxmox VE Web-Oberfläche oben rechts auf **„Create CT“**:

1. **General:**
   * **Node:** Dein Proxmox Node
   * **CT ID:** z. B. `105`
   * **Hostname:** `discord-bot`
   * **Password:** Ein sicheres Root-Passwort vergeben
   * **Unprivileged container:** Angehakt lassen (Ja)
2. **Template:**
   * Wähle `debian-12-standard` oder `ubuntu-24.04-standard`
3. **Disks:**
   * **Storage:** local-lvm (oder dein Standard-Storage)
   * **Disk size:** `8 GB` (völlig ausreichend)
4. **CPU:**
   * **Cores:** `1` (oder `2`)
5. **Memory:**
   * **Memory:** `512 MB` oder `1024 MB`
   * **Swap:** `512 MB`
6. **Network:**
   * **IPv4:** Statische IP (z. B. `192.168.1.50/24`) mit Gateway deines Routers oder per `DHCP`
7. **Confirm:**
   * Haken bei *„Start after created“* setzen und auf **Finish** klicken.

---

## 2. Software im Container installieren

Öffne die **Console** (Konsole) deines neuen Containers in Proxmox und logge dich als `root` ein.

Führe diese Befehle nacheinander aus:

```bash
# 1. System aktualisieren & Basis-Tools installieren
apt update && apt upgrade -y
apt install -y curl git openssh-server

# 2. Node.js 22 LTS installieren
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 3. PM2 Process Manager installieren (hält den Bot 24/7 am Leben)
npm install -g pm2

# 4. Ordner für den Bot vorbereiten
mkdir -p /opt/discordbot
```

> [!TIP]
> Falls du dich direkt per SSH von deinem PC einloggen willst:
> Stelle sicher, dass in `/etc/ssh/sshd_config` die Zeile `PermitRootLogin yes` aktiv ist (`service ssh restart`).

---

## 3. Bot vom PC auf Proxmox übertragen & starten

Du musst auf dem Server nichts manuell hochladen. Nutze einfach die neuen Werkzeuge auf deinem Desktop:

1. Kopiere `server_config.example.ini` zu `server_config.ini` und trage die IP deines Containers ein:
   ```ini
   SERVER_IP=192.168.1.50
   SERVER_USER=root
   SERVER_PATH=/opt/discordbot
   ```
2. Lege deine fertige `.env` in den Projektordner (siehe `README.md`) und starte per Doppelklick `sync_server.bat`:
   * Wähle **`[1]`** (Upload).
   * Das Skript lädt deinen Code hoch, installiert alles und startet den Bot mit **PM2**!

---

## 4. Nützliche PM2-Befehle auf dem Proxmox-Server

In der Proxmox-Konsole kannst du den Bot jederzeit überwachen:

* **Status ansehen:** `pm2 status`
* **Live-Logs anzeigen:** `pm2 logs discord-bot`
* **Bot neustarten:** `pm2 restart discord-bot`
* **Bot stoppen:** `pm2 stop discord-bot`
* **Autostart bei Server-Reboot:** 
  ```bash
  pm2 startup
  pm2 save
  ```
