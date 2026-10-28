#!/bin/bash
# Aktualisiert Bot UND Dashboard auf dem Server in einem Rutsch.
#
# Warum dieses Skript existiert:
#   update.bat laeuft auf dem Windows-PC und baut mit "npm run build" nur den
#   Bot-TypeScript-Code (tsc). Der Next.js-Build im web/-Ordner bleibt dabei
#   aussen vor - Aenderungen am Dashboard wurden dadurch nie live, obwohl das
#   Update "erfolgreich" meldete.
#
# Aufruf: bash scripts/update_server.sh [Pfad]   (Standard: /opt/discordbot)
#
# Nur das Dashboard neu bauen? Dann direkt scripts/deploy_web.sh benutzen.

set -u

BASE="${1:-/opt/discordbot}"

cd "$BASE" || { echo "❌ Ordner $BASE nicht gefunden."; exit 1; }

echo "═══════════════════════════════════════════════"
echo "  GLGBot - Server-Update"
echo "  Verzeichnis: $BASE"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Code holen ───────────────────────────────────────────────────────────
echo "➜ [1/4] Code aktualisieren (git pull)..."
VORHER="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
if ! git pull --ff-only; then
  echo "❌ git pull fehlgeschlagen (lokale Aenderungen?). Update abgebrochen."
  exit 1
fi
NACHHER="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"

if [ "$VORHER" = "$NACHHER" ]; then
  echo "   Kein neuer Code ($NACHHER) - es wird trotzdem neu gebaut."
else
  echo "   $VORHER → $NACHHER"
fi
echo ""

# ── 2. Bot bauen ────────────────────────────────────────────────────────────
echo "➜ [2/4] Bot-Abhaengigkeiten und Build..."
npm install --no-audit --no-fund || { echo "❌ npm install (Bot) fehlgeschlagen."; exit 1; }
if ! npm run build; then
  echo "❌ Bot-Build fehlgeschlagen - der laufende Bot bleibt auf dem alten Stand."
  exit 1
fi
echo ""

# ── 3. Dashboard bauen ──────────────────────────────────────────────────────
# deploy_web.sh stoppt das Dashboard vorher (Speicher) und faellt bei einem
# Fehlschlag auf den vorherigen Build zurueck.
echo "➜ [3/4] Dashboard bauen..."
if ! bash scripts/deploy_web.sh "$BASE"; then
  echo "❌ Dashboard-Build fehlgeschlagen - siehe Ausgabe oben."
  echo "   Der Bot wird trotzdem neu gestartet, damit er auf dem neuen Stand laeuft."
  pm2 restart discord-bot >/dev/null 2>&1 || true
  exit 1
fi
echo ""

# ── 4. Bot neu starten ──────────────────────────────────────────────────────
echo "➜ [4/4] Bot neu starten..."
pm2 restart discord-bot >/dev/null 2>&1 || pm2 start dist/index.js --name discord-bot
pm2 save >/dev/null 2>&1
echo ""

echo "═══════════════════════════════════════════════"
echo "✅ Update abgeschlossen (Stand $NACHHER)"
echo "═══════════════════════════════════════════════"
echo ""
echo "Hinweis: Im Browser einmal hart neu laden (Strg+Shift+R)."
echo "Der Dateiname des Bundles aendert sich beim Build - bleibt er gleich,"
echo "wurde das Dashboard nicht neu gebaut."
pm2 list 2>/dev/null | head -12
