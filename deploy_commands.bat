@echo off
chcp 65001 > nul
title Discord Bot - Deploy Commands
cd /d "%~dp0"

echo =======================================================
echo     Registriere Slash-Befehle bei Discord...
echo =======================================================
echo.
call npm run deploy-commands
echo.
pause
