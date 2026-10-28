@echo off
chcp 65001 > nul
title Discord Bot - Updater
cd /d "%~dp0"

echo =======================================================
echo              DISCORD BOT - SYSTEM-UPDATE
echo =======================================================
echo.

:: 1. Git Pull (falls Remote Repository vorhanden)
git remote -v > nul 2>&1
if %errorlevel% equ 0 (
    echo [1/4] Lade neuesten Code von Git herunter (git pull)...
    git pull
    echo.
) else (
    echo [1/4] Kein externes Git-Remote eingerichtet (ueberspringe git pull).
    echo.
)

:: 2. Pakete aktualisieren
echo [2/4] Installiere / aktualisiere npm-Abhaengigkeiten...
call npm install
if %errorlevel% neq 0 (
    echo [WARNUNG] npm install hatte Warnungen/Fehler.
)
echo.

:: 3. TypeScript Build (Bot)
echo [3/5] Kompiliere Bot-Code (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Kompilierung fehlgeschlagen! Bitte Fehler pruefen.
    pause
    exit /b 1
)
echo.

:: 4. Dashboard bauen
:: "npm run build" oben ist nur tsc und fasst den web-Ordner nicht an.
:: Ohne diesen Schritt bleiben Aenderungen am Dashboard im alten Bundle.
echo [4/5] Baue Web-Dashboard (next build)...
pushd web
call npm install --no-audit --no-fund
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Dashboard-Build fehlgeschlagen! Bitte Fehler pruefen.
    popd
    pause
    exit /b 1
)
popd
echo.

:: 5. Slash-Befehle aktualisieren
echo [5/5] Aktualisiere Slash-Befehle bei Discord (deploy-commands)...
call npm run deploy-commands
echo.

echo =======================================================
echo ✅ Update erfolgreich abgeschlossen!
echo =======================================================
echo.
echo HINWEIS: Das war das Update auf DIESEM PC.
echo Die Instanz auf dem Server ist davon unberuehrt - dort:
echo     bash scripts/update_server.sh
echo.
pause
