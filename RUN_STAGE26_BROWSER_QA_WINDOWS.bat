@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "SUNSET STATE QA SERVER" py -3 -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html?stage26qa=1"
  exit /b 0
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "SUNSET STATE QA SERVER" python -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html?stage26qa=1"
  exit /b 0
)
echo Python not found. Install Python or run a local HTTP server, then open index.html?stage26qa=1
pause
exit /b 1
