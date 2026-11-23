@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  start "SUNSET STATE Server" cmd /k "py -3 -m http.server 8765 --bind 127.0.0.1"
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/"
  exit /b 0
)
where python >nul 2>nul
if not errorlevel 1 (
  start "SUNSET STATE Server" cmd /k "python -m http.server 8765 --bind 127.0.0.1"
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/"
  exit /b 0
)
echo Python was not found. Opening the game directly in your default browser.
echo A local server is recommended for the most reliable browser behavior.
pause
start "" "%~dp0index.html"
endlocal
