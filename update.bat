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

:: 3. TypeScript Build
echo [3/4] Kompiliere TypeScript Code (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Kompilierung fehlgeschlagen! Bitte Fehler pruefen.
    pause
    exit /b 1
)
echo.

:: 4. Slash-Befehle aktualisieren
echo [4/4] Aktualisiere Slash-Befehle bei Discord (deploy-commands)...
call npm run deploy-commands
echo.

echo =======================================================
echo ✅ Update erfolgreich abgeschlossen!
echo =======================================================
echo.
pause
