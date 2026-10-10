@echo off
chcp 65001 > nul
title Discord Bot - Proxmox Server Sync
cd /d "%~dp0"

:load_config
set "SERVER_IP="
set "SERVER_USER="
set "SERVER_PATH="

if exist server_config.ini (
    for /f "tokens=1,2 delims==" %%a in (server_config.ini) do (
        if "%%a"=="SERVER_IP" set "SERVER_IP=%%b"
        if "%%a"=="SERVER_USER" set "SERVER_USER=%%b"
        if "%%a"=="SERVER_PATH" set "SERVER_PATH=%%b"
    )
)

if "%SERVER_IP%"=="" set "SERVER_IP=192.168.178.50"
if "%SERVER_USER%"=="" set "SERVER_USER=root"
if "%SERVER_PATH%"=="" set "SERVER_PATH=/opt/discordbot"

:menu
cls
echo =======================================================
echo        PROXMOX SERVER - SYNC ^& DATENTRANSFER
echo =======================================================
echo  Aktuelle Server-Konfiguration:
echo  Ziel-Server: %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%
echo =======================================================
echo.
echo  [1] Code auf Proxmox-Server HOCHLADEN (Upload)
echo  [2] Code / .env von Proxmox-Server HERUNTERLADEN (Download)
echo  [3] SSH-Konsole zum Proxmox-Server oeffnen
echo  [4] Bot auf Proxmox-Server via PM2 neustarten
echo  [5] Server-IP und Einstellungen bearbeiten (server_config.ini)
echo  [0] Zurueck
echo.
echo =======================================================
set /p choice="Waehle eine Option [0-5]: "

if "%choice%"=="1" goto upload
if "%choice%"=="2" goto download
if "%choice%"=="3" goto ssh_connect
if "%choice%"=="4" goto pm2_restart
if "%choice%"=="5" goto edit_config
if "%choice%"=="0" exit /b
goto menu

:upload
cls
echo =======================================================
echo [UPLOAD] Lade Bot-Code auf Proxmox (%SERVER_IP%) hoch...
echo =======================================================
echo (node_modules und dist werden automatisch ausgelassen)
echo.

:: Erstelle Zielverzeichnis auf dem Server
ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %SERVER_PATH%"

:: Synchronisiere Dateien via SCP / Tar Pipe
echo Uebertrage Quelldateien...
powershell -NoProfile -Command "tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf - . | ssh %SERVER_USER%@%SERVER_IP% 'tar -xzf - -C %SERVER_PATH%'"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Dateien erfolgreich auf den Proxmox-Server hochgeladen!
    echo.
    echo Moechtest du 'npm install' und 'pm2 restart' auf dem Server ausfuehren?
    set /p remote_inst="Ausfuehren? [J/N]: "
    if /i "%remote_inst%"=="J" (
        ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && npm install && npm run build && npm run deploy-commands && pm2 restart discord-bot || pm2 start dist/index.js --name discord-bot"
    )
) else (
    echo.
    echo ❌ Fehler beim Hochladen! Bitte IP-Adresse und SSH-Verbindung pruefen.
)
pause
goto menu

:download
cls
echo =======================================================
echo [DOWNLOAD] Lade Dateien vom Server herunter...
echo =======================================================
echo.
scp %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/.env .env.from_server
if %errorlevel% equ 0 (
    echo ✅ .env Datei vom Server erfolgreich heruntergeladen (gespeichert als .env.from_server)!
) else (
    echo ❌ Fehler beim Herunterladen der .env Datei.
)
pause
goto menu

:ssh_connect
cls
echo =======================================================
echo Verbinde per SSH mit %SERVER_USER%@%SERVER_IP%...
echo =======================================================
echo (Tippe 'exit' ein, um die Sitzung zu beenden)
echo.
ssh %SERVER_USER%@%SERVER_IP%
goto menu

:pm2_restart
cls
echo [INFO] Sende Neustart-Befehl an PM2 auf dem Proxmox-Server...
ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && pm2 restart discord-bot || pm2 status"
pause
goto menu

:edit_config
notepad server_config.ini
goto load_config
