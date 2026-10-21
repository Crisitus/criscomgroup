@echo off
REM Doble clic para levantar todo el stack local de Criscom Group.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
echo.
pause
