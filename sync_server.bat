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
set "REMOTE=%SERVER_USER%@%SERVER_IP%"
set "ARCHIVE=%TEMP%\discordbot_deploy.tar.gz"

:menu
cls
echo =======================================================
echo        PROXMOX SERVER - SYNC ^& DATENTRANSFER
echo =======================================================
echo  Aktuelle Server-Konfiguration:
echo  Ziel-Server: %REMOTE%:%SERVER_PATH%
echo =======================================================
echo.
echo  [1] Code auf Proxmox-Server HOCHLADEN (Upload + Build + Neustart)
echo  [2] .env und data-Ordner vom Server HERUNTERLADEN (Backup)
echo  [3] SSH-Konsole zum Proxmox-Server oeffnen
echo  [4] Bot ^& Dashboard auf dem Server via PM2 neustarten
echo  [5] Server-IP und Einstellungen bearbeiten (server_config.ini)
echo  [0] Zurueck
echo.
echo =======================================================
set "choice="
set /p choice="Waehle eine Option [0-5]: "

if "%choice%"=="1" goto upload
if "%choice%"=="2" goto download
if "%choice%"=="3" goto ssh_connect
if "%choice%"=="4" goto pm2_restart
if "%choice%"=="5" goto edit_config
if "%choice%"=="0" exit /b
goto menu

:: -----------------------------------------------------------------
:upload
cls
echo =======================================================
echo [UPLOAD] Lade Bot-Code auf Proxmox (%SERVER_IP%) hoch...
echo =======================================================
echo Ausgelassen werden: node_modules, dist, .next, .git und data
echo (der data-Ordner auf dem Server mit Live-Status ^& Einstellungen
echo  bleibt dadurch unangetastet).
echo.

:: Archiv im TEMP-Ordner erstellen (nicht im Projektordner, sonst packt tar sich selbst mit ein)
if exist "%ARCHIVE%" del "%ARCHIVE%" > nul 2>&1
tar --exclude="node_modules" --exclude=".git" --exclude=".next" --exclude="./dist" --exclude="./data" --exclude="./data_from_server" --exclude="./.env.from_server" --exclude="./deploy.tar.gz" -czf "%ARCHIVE%" .
if errorlevel 1 (
    echo.
    echo ❌ Fehler beim Erstellen des Archivs.
    goto upload_end
)

ssh %REMOTE% "mkdir -p %SERVER_PATH%"
if errorlevel 1 goto upload_fail

scp "%ARCHIVE%" %REMOTE%:/tmp/discordbot_deploy.tar.gz
if errorlevel 1 goto upload_fail

ssh %REMOTE% "tar -xzf /tmp/discordbot_deploy.tar.gz -C %SERVER_PATH% && rm -f /tmp/discordbot_deploy.tar.gz"
if errorlevel 1 goto upload_fail

del "%ARCHIVE%" > nul 2>&1
echo.
echo ✅ Dateien erfolgreich auf den Proxmox-Server hochgeladen!
echo.
echo Moechtest du jetzt 'npm install', Build ^& PM2-Neustart fuer Bot ^& Dashboard ausfuehren?
set "remote_inst="
set /p remote_inst="Ausfuehren? [J/N]: "
if /i not "%remote_inst%"=="J" goto upload_end

echo.
echo [1/2] Baue Discord-Bot...
ssh %REMOTE% "cd %SERVER_PATH% && npm install && npm run build && npm run deploy-commands && (pm2 restart discord-bot || pm2 start dist/index.js --name discord-bot)"
if errorlevel 1 (
    echo ❌ Fehler beim Bauen/Starten des Bots. Siehe Ausgabe oben.
    goto upload_end
)

echo.
echo [2/2] Baue Web-Dashboard...
ssh %REMOTE% "cd %SERVER_PATH%/web && npm install && npm run build && (pm2 restart discord-web || pm2 start npm --name discord-web -- start) && pm2 save"
if errorlevel 1 (
    echo ❌ Fehler beim Bauen/Starten des Dashboards. Siehe Ausgabe oben.
    goto upload_end
)

echo.
echo ✅ Bot und Dashboard wurden gebaut und neu gestartet!
goto upload_end

:upload_fail
del "%ARCHIVE%" > nul 2>&1
echo.
echo ❌ Fehler beim Hochladen! Bitte IP-Adresse und SSH-Verbindung pruefen.

:upload_end
pause
goto menu

:: -----------------------------------------------------------------
:download
cls
echo =======================================================
echo [DOWNLOAD] Lade .env und data-Ordner vom Server herunter...
echo =======================================================
echo.
scp %REMOTE%:%SERVER_PATH%/.env .env.from_server
if errorlevel 1 (
    echo ❌ Fehler beim Herunterladen der .env Datei.
) else (
    echo ✅ .env gespeichert als .env.from_server
)

if exist data_from_server rmdir /s /q data_from_server
scp -r %REMOTE%:%SERVER_PATH%/data data_from_server
if errorlevel 1 (
    echo ❌ Fehler beim Herunterladen des data-Ordners.
) else (
    echo ✅ data-Ordner gespeichert als data_from_server
)
pause
goto menu

:: -----------------------------------------------------------------
:ssh_connect
cls
echo =======================================================
echo Verbinde per SSH mit %REMOTE%...
echo =======================================================
echo (Tippe 'exit' ein, um die Sitzung zu beenden)
echo.
ssh %REMOTE%
goto menu

:: -----------------------------------------------------------------
:pm2_restart
cls
echo [INFO] Starte Bot ^& Dashboard auf dem Proxmox-Server neu...
ssh %REMOTE% "pm2 restart discord-bot discord-web; pm2 status"
pause
goto menu

:: -----------------------------------------------------------------
:edit_config
notepad server_config.ini
goto load_config
