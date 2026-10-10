@echo off
chcp 65001 > nul
title Discord Bot - Dev Runner
cd /d "%~dp0"

echo =======================================================
echo     Starte Discord Bot im Entwicklungsmodus (npm run dev)...
echo =======================================================
echo.
call npm run dev
echo.
if %errorlevel% neq 0 (
    echo [FEHLER] Der Bot ist mit einem Fehlercode beendet worden.
)
pause
