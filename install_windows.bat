@echo off
chcp 65001 > nul
title GLGBot - Installation
cd /d "%~dp0"

echo =======================================================
echo                GLGBot - Installation (Windows)
echo =======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js wurde nicht gefunden.
    echo    Bitte Node.js 22 LTS installieren: https://nodejs.org/
    echo    Danach dieses Fenster schliessen und die Datei erneut starten.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo ✅ Node.js %%v gefunden

if not exist .env (
    copy .env.example .env > nul
    echo.
    echo ⚠️  Es wurde eine .env angelegt - sie oeffnet sich jetzt im Editor.
    echo    Bitte DISCORD_TOKEN, CLIENT_ID, GUILD_ID usw. eintragen, speichern und schliessen.
    notepad .env
)

echo.
echo [1/4] Bot: Abhaengigkeiten installieren ...
call npm ci || goto fail
echo [2/4] Bot: bauen ...
call npm run build || goto fail
echo [3/4] Dashboard: installieren und bauen ...
pushd web
call npm ci || (popd & goto fail)
call npm run build || (popd & goto fail)
popd
echo [4/4] Slash-Befehle registrieren ...
call npm run deploy-commands

echo.
set /p CREATE_SHORTCUT="Moechtest du eine Desktop-Verknuepfung fuer start.bat erstellen? (J/N): "
if /i "%CREATE_SHORTCUT%"=="J" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\GLGBot.lnk'); $s.TargetPath = '%~dp0start.bat'; $s.WorkingDirectory = '%~dp0'; $s.Save()"
    echo ✅ Desktop-Verknuepfung 'GLGBot' wurde auf dem Desktop erstellt!
)

set /p AUTOSTART="Moechtest du den Bot automatisch beim Windows-Start starten? (J/N): "
if /i "%AUTOSTART%"=="J" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\GLGBot.lnk'); $s.TargetPath = '%~dp0start.bat'; $s.WorkingDirectory = '%~dp0'; $s.Save()"
    echo ✅ Autostart-Eintrag im Windows Autostart-Ordner eingerichtet!
)

echo.
echo ✅ Fertig! Starten mit start.bat (Bot) - das Dashboard mit: cd web ^&^& npm start
pause
exit /b 0

:fail
echo.
echo ❌ Installation fehlgeschlagen - siehe Meldungen oben.
pause
exit /b 1
