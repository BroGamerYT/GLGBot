#!/bin/bash
# Baut das Web-Dashboard auf dem Server und startet es neu.
#
# Warum dieses Skript existiert:
#   Der Next.js-Build braucht rund 800 MB Arbeitsspeicher. Lief das Dashboard
#   währenddessen weiter, konnte der Kernel auf kleinen Containern einen
#   Build-Worker abschießen - der Build brach dann mit
#   "ENOENT ... .next/server/pages-manifest.json" ab.
#
# Was es anders macht als ein simples "npm run build":
#   1. Stoppt das laufende Dashboard, damit der Speicher für den Build frei ist.
#   2. Baut immer frisch (ein halb fertiger .next-Ordner von einem abgebrochenen
#      Build ist sonst die nächste Fehlerquelle).
#   3. Hebt den bisherigen Build auf: Schlägt der neue fehl, wird der alte
#      zurückgespielt - das Dashboard läuft danach weiter wie vorher.
#
# Aufruf: bash scripts/deploy_web.sh [Pfad]   (Standard: /opt/discordbot)

set -u

BASE="${1:-/opt/discordbot}"
WEB="$BASE/web"
HEAP_MB="${WEB_BUILD_HEAP_MB:-2048}"

cd "$WEB" || { echo "❌ Ordner $WEB nicht gefunden."; exit 1; }

echo "➜ Abhängigkeiten prüfen..."
npm install --no-audit --no-fund || { echo "❌ npm install fehlgeschlagen."; exit 1; }

# Freien Speicher melden - hilft bei der Fehlersuche
if command -v free >/dev/null 2>&1; then
  echo "➜ Freier Arbeitsspeicher vor dem Build: $(free -m | awk '/^Mem:/ {print $7" MB verfügbar von "$2" MB"}')"
fi

echo "➜ Dashboard anhalten (gibt Speicher für den Build frei)..."
pm2 stop discord-web >/dev/null 2>&1 || true

# Bisherigen Build beiseitelegen statt löschen - als Rückfalloption
rm -rf .next.vorher
[ -d .next ] && mv .next .next.vorher

echo "➜ Baue Dashboard (Heap-Grenze: ${HEAP_MB} MB)..."
NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" npm run build
RC=$?

if [ $RC -ne 0 ] || [ ! -f .next/server/pages-manifest.json ]; then
  echo ""
  echo "❌ Build fehlgeschlagen - der vorherige Stand wird zurückgespielt."
  if command -v dmesg >/dev/null 2>&1 && dmesg -T 2>/dev/null | grep -qi "killed process"; then
    echo "   ⚠️  Der Kernel hat einen Prozess wegen Speichermangel beendet:"
    dmesg -T 2>/dev/null | grep -i "killed process" | tail -2 | sed 's/^/   /'
    echo "   → Mehr RAM für den Container geben oder Swap einrichten."
  fi
  rm -rf .next
  [ -d .next.vorher ] && mv .next.vorher .next
  pm2 restart discord-web >/dev/null 2>&1 || pm2 start npm --name discord-web -- start >/dev/null 2>&1
  echo "   Das Dashboard läuft wieder mit dem vorherigen Stand."
  exit 1
fi

rm -rf .next.vorher
echo "➜ Dashboard starten..."
pm2 restart discord-web >/dev/null 2>&1 || pm2 start npm --name discord-web -- start
pm2 save >/dev/null 2>&1
echo "✅ Dashboard neu gebaut und gestartet."
