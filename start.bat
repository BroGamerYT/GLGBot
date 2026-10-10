@echo off
chcp 65001 > nul
title Discord Bot - Launcher
cd /d "%~dp0"

:menu
cls
echo =======================================================
echo          DISCORD BOT - MANAGEMENT ^& LAUNCHER
echo =======================================================
echo.
echo  [1] Bot im Entwicklungsmodus starten (Auto-Reload)
echo  [2] Slash-Befehle bei Discord registrieren
echo  [3] Bot kompilieren ^& starten (Produktionsmodus)
echo  [4] Pakete installieren / aktualisieren (npm install)
echo  [5] .env Konfigurationsdatei oeffnen
echo  [0] Beenden
echo.
echo =======================================================
set /p choice="Waehle eine Option [0-5]: "

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto deploy_cmd
if "%choice%"=="3" goto start_prod
if "%choice%"=="4" goto install_deps
if "%choice%"=="5" goto open_env
if "%choice%"=="0" exit /b
goto menu

:start_dev
cls
echo [INFO] Starte Discord-Bot im Entwicklungsmodus (tsx watch)...
echo (Druecke Strg+C zum Stoppen)
echo.
call npm run dev
echo.
echo [HINWEIS] Bot wurde beendet.
pause
goto menu

:deploy_cmd
cls
echo [INFO] Registriere Slash-Befehle bei Discord...
echo.
call npm run deploy-commands
echo.
pause
goto menu

:start_prod
cls
echo [INFO] Kompiliere TypeScript (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Build fehlgeschlagen! Bitte Fehler pruefen.
    pause
    goto menu
)
echo.
echo [INFO] Starte kompilierten Bot (npm start)...
call npm start
echo.
pause
goto menu

:install_deps
cls
echo [INFO] Installiere npm-Pakete...
call npm install
echo.
pause
goto menu

:open_env
if exist .env (
    notepad .env
) else (
    echo [INFO] Erstelle .env Datei aus Vorlage...
    copy .env.example .env > nul
    notepad .env
)
goto menu
