#!/usr/bin/env bash
# GLGBot - Installation auf Debian/Ubuntu (auch Proxmox-LXC). Ausführen im Projektordner:
#   bash install_linux.sh
set -e
cd "$(dirname "$0")"

echo "== GLGBot Installation =="

# 1) Node.js 22
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "-> Installiere Node.js 22 ..."
  if [ "$(id -u)" -ne 0 ]; then SUDO=sudo; else SUDO=""; fi
  $SUDO apt-get update -y
  $SUDO apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi
echo "   Node $(node -v)"

# 2) PM2
if ! command -v pm2 >/dev/null 2>&1; then
  echo "-> Installiere PM2 ..."
  npm install -g pm2
fi

# 3) .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "!! Es wurde eine .env angelegt. Bitte jetzt ausfüllen (DISCORD_TOKEN, CLIENT_ID, GUILD_ID, ...)."
  echo "   z. B. mit:  nano .env"
  echo "   Danach dieses Skript erneut starten."
  exit 0
fi

# 4) Abhängigkeiten & Build
echo "-> Bot: Abhängigkeiten & Build ..."
npm ci
npm run build
echo "-> Dashboard: Abhängigkeiten & Build ..."
(cd web && npm ci && npm run build)

# 5) Slash-Befehle registrieren
npm run deploy-commands || echo "   (Befehle werden sonst beim Bot-Start registriert)"

# 6) Starten & Autostart
pm2 startOrReload ecosystem.config.js
pm2 save
echo ""
echo "-> Autostart nach Neustart einrichten (einmalig):"
pm2 startup | tail -1
echo ""
echo "✅ Fertig! Dashboard läuft auf Port 3000. Logs: pm2 logs"
