@echo off
chcp 65001 > nul
title Discord Bot - All-in-One Kontrollzentrum
cd /d "%~dp0"

:load_config
set "SERVER_IP=192.168.178.50"
set "SERVER_USER=root"
set "SERVER_PATH=/opt/discordbot"

if exist server_config.ini (
    for /f "tokens=1,2 delims==" %%a in (server_config.ini) do (
        if "%%a"=="SERVER_IP" set "SERVER_IP=%%b"
        if "%%a"=="SERVER_USER" set "SERVER_USER=%%b"
        if "%%a"=="SERVER_PATH" set "SERVER_PATH=%%b"
    )
)

:menu
cls
echo =======================================================================
echo               DISCORD BOT - ALL-IN-ONE KONTROLLZENTRUM
echo =======================================================================
echo.

:: 1. Live-Status des lokalen Bots ermitteln
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { Write-Host '  LOKALER BOT:   ' -NoNewline; Write-Host '● ONLINE (Laeuft)' -ForegroundColor Green; Write-Host ('  Prozess-IDs:   ' + (($procs | ForEach-Object { $_.ProcessId }) -join ', ')); } else { Write-Host '  LOKALER BOT:   ' -NoNewline; Write-Host '○ OFFLINE (Gestoppt)' -ForegroundColor Red; }"

echo   SERVER-ZIEL:   %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%
echo =======================================================================
echo.
echo  [ LOKALE STEUERUNG (PC) ]
echo   [1] Bot starten (in separatem Fenster mit Auto-Reload)
echo   [2] Bot stoppen (lokalen Prozess beenden)
echo   [3] Bot neustarten
echo   [4] Slash-Befehle bei Discord registrieren (deploy-commands)
echo.
echo  [ PROXMOX SERVER (24/7 BETRIEB) ]
echo   [5] Code auf Proxmox HOCHLADEN ^& mit PM2 starten (Upload)
echo   [6] Konfiguration / .env vom Server HERUNTERLADEN (Download)
echo   [7] SSH-Terminal zum Proxmox-Server oeffnen
echo   [8] Bot auf Proxmox-Server via PM2 neustarten
echo   [9] Server-IP und Zugangsdaten anpassen (server_config.ini)
echo.
echo  [ SYSTEM ^& WARTUNG ]
echo  [10] Komplettes Update ausfuehren (npm install + build + deploy)
echo  [11] .env Konfigurationsdatei oeffnen
echo  [12] Proxmox Setup-Anleitung anzeigen
echo   [0] Beenden
echo =======================================================================
set /p choice="Waehle eine Option [0-12]: "

if "%choice%"=="1" goto start_bot
if "%choice%"=="2" goto stop_bot
if "%choice%"=="3" goto restart_bot
if "%choice%"=="4" goto deploy_cmd
if "%choice%"=="5" goto upload_server
if "%choice%"=="6" goto download_server
if "%choice%"=="7" goto ssh_server
if "%choice%"=="8" goto restart_pm2
if "%choice%"=="9" goto edit_server_config
if "%choice%"=="10" goto update_system
if "%choice%"=="11" goto open_env
if "%choice%"=="12" goto open_proxmox_guide
if "%choice%"=="0" exit /b
goto menu

:: -------------------------------------------------------------
:: LOKALE BOT FUNKTIONEN
:: -------------------------------------------------------------
:start_bot
cls
echo [INFO] Starte Discord-Bot in einem eigenen Fenster (npm run dev)...
start "Discord Bot Runner" cmd /c "cd /d %~dp0 && npm run dev"
timeout /t 2 > nul
goto menu

:stop_bot
cls
echo [INFO] Beende alle lokalen Bot-Prozesse...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('Beendet: PID ' + $_.ProcessId) -ForegroundColor Yellow }; Write-Host 'Alle lokalen Bot-Prozesse erfolgreich beendet!' -ForegroundColor Green; } else { Write-Host 'Kein laufender Bot-Prozess gefunden.' -ForegroundColor Gray; }"
echo.
pause
goto menu

:restart_bot
cls
echo [INFO] Starte lokalen Bot neu...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"
timeout /t 1 > nul
start "Discord Bot Runner" cmd /c "cd /d %~dp0 && npm run dev"
echo [INFO] Bot wurde neu gestartet!
timeout /t 2 > nul
goto menu

:deploy_cmd
cls
echo [INFO] Registriere Slash-Befehle bei Discord...
call npm run deploy-commands
echo.
pause
goto menu

:: -------------------------------------------------------------
:: PROXMOX SERVER FUNKTIONEN
:: -------------------------------------------------------------
:upload_server
cls
echo =======================================================
echo [UPLOAD] Lade Bot auf Proxmox (%SERVER_IP%) hoch...
echo =======================================================
echo (node_modules, .git und dist werden ausgelassen)
echo.

ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %SERVER_PATH%"
if %errorlevel% neq 0 (
    echo [FEHLER] SSH-Verbindung fehlgeschlagen. Bitte IP in Option 9 pruefen!
    pause
    goto menu
)

powershell -NoProfile -Command "tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf - . | ssh %SERVER_USER%@%SERVER_IP% 'tar -xzf - -C %SERVER_PATH%'"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Dateien erfolgreich hochgeladen!
    echo.
    echo Moechtest du Pakete auf dem Server installieren ^& den Bot starten?
    set /p start_remote="Ausfuehren? [J/N]: "
    if /i "%start_remote%"=="J" (
        echo.
        echo [INFO] Führe Build ^& PM2-Start auf Server aus...
        ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && npm install && npm run build && npm run deploy-commands && pm2 restart discord-bot || pm2 start dist/index.js --name discord-bot"
    )
) else (
    echo ❌ Upload fehlgeschlagen.
)
pause
goto menu

:download_server
cls
echo [DOWNLOAD] Lade .env Datei vom Server herunter...
scp %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/.env .env.from_server
if %errorlevel% equ 0 (
    echo ✅ Datei erfolgreich als .env.from_server heruntergeladen!
) else (
    echo ❌ Download fehlgeschlagen.
)
pause
goto menu

:ssh_server
cls
echo =======================================================
echo Verbinde per SSH mit %SERVER_USER%@%SERVER_IP%...
echo (Tippe 'exit' ein, um zurueckzukehren)
echo =======================================================
echo.
ssh %SERVER_USER%@%SERVER_IP%
goto menu

:restart_pm2
cls
echo [INFO] Sende Neustart an PM2 auf Proxmox...
ssh %SERVER_USER%@%SERVER_IP% "pm2 restart discord-bot && pm2 status"
pause
goto menu

:edit_server_config
notepad server_config.ini
goto load_config

:: -------------------------------------------------------------
:: WARTUNG & SYSTEM
:: -------------------------------------------------------------
:update_system
cls
echo =======================================================
echo [UPDATE] Fuehre vollstaendiges System-Update aus...
echo =======================================================
echo.
git remote -v > nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Git Pull...
    git pull
)
echo [2/3] npm install...
call npm install
echo [3/3] npm run build...
call npm run build
echo Registriere Slash-Befehle...
call npm run deploy-commands
echo.
echo ✅ System erfolgreich aktualisiert!
pause
goto menu

:open_env
if exist .env (
    notepad .env
) else (
    copy .env.example .env > nul
    notepad .env
)
goto menu

:open_proxmox_guide
start notepad proxmox_anleitung.md
goto menu
