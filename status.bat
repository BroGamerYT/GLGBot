@echo off
chcp 65001 > nul
title Discord Bot - Status & Management
cd /d "%~dp0"

:menu
cls
echo =======================================================
echo          DISCORD BOT - STATUS & KONTROLLZENTRUM
echo =======================================================
echo.

:: Prüfe ob der Bot-Prozess läuft
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { Write-Host '  STATUS: ' -NoNewline; Write-Host '● ONLINE (Läuft)' -ForegroundColor Green; Write-Host ('  Prozess-IDs (PIDs): ' + (($procs | ForEach-Object { $_.ProcessId }) -join ', ')); } else { Write-Host '  STATUS: ' -NoNewline; Write-Host '○ OFFLINE (Gestoppt)' -ForegroundColor Red; }"

echo.
echo =======================================================
echo  AKTIONEN:
echo  [1] Bot starten (in eigenem Konsolenfenster)
echo  [2] Bot stoppen (alle laufenden Bot-Instanzen beenden)
echo  [3] Bot neustarten (Stoppen ^& Neu starten)
echo  [4] Slash-Befehle registrieren (deploy-commands)
echo  [5] Status jetzt aktualisieren
echo.
echo  WEITERE WERKZEUGE:
echo  [6] Update durchführen (update.bat)
echo  [7] Mit Proxmox-Server synchronisieren (sync_server.bat)
echo  [0] Beenden
echo =======================================================
set /p choice="Wähle eine Option [0-7]: "

if "%choice%"=="1" goto start_bot
if "%choice%"=="2" goto stop_bot
if "%choice%"=="3" goto restart_bot
if "%choice%"=="4" goto deploy_cmd
if "%choice%"=="5" goto menu
if "%choice%"=="6" goto run_update
if "%choice%"=="7" goto run_sync
if "%choice%"=="0" exit /b
goto menu

:start_bot
cls
echo [INFO] pruefe TypeScript-Fehler vor dem Start...
call npx tsc --noEmit >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] TypeScript-Fehler gefunden! Bot kann nicht starten.
    echo [FIX] Bitte zuerst die Fehler beheben.
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "npx tsc --noEmit" 2>&1
    echo.
    pause
    goto menu
)
echo [OK] Keine TypeScript-Fehler gefunden.
echo.
echo [INFO] Starte Discord-Bot in einem neuen Fenster...
start "Discord Bot Runner" cmd /c "cd /d %~dp0 && npm run dev"
timeout /t 2 > nul
goto menu

:stop_bot
cls
echo [INFO] Stoppe alle laufenden Discord-Bot-Prozesse...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('Beendet: PID ' + $_.ProcessId) -ForegroundColor Yellow }; Write-Host 'Alle Bot-Prozesse erfolgreich gestoppt!' -ForegroundColor Green; } else { Write-Host 'Kein laufender Bot-Prozess gefunden.' -ForegroundColor Gray; }"
echo.
pause
goto menu

:restart_bot
cls
echo [INFO] Starte Discord-Bot neu...
echo.
echo 1) Stoppe alte Prozesse...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*DiscordBot*' -or $_.CommandLine -like '*tsx*src/index.ts*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"
timeout /t 1 > nul
echo 2) Starte Bot neu...
start "Discord Bot Runner" cmd /c "cd /d %~dp0 && npm run dev"
echo.
echo [INFO] Bot wurde neu gestartet!
timeout /t 2 > nul
goto menu

:deploy_cmd
cls
echo [INFO] Registriere Slash-Befehle bei Discord...
echo.
call npm run deploy-commands
echo.
pause
goto menu

:run_update
call update.bat
goto menu

:run_sync
call sync_server.bat
goto menu
