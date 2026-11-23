@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8765/START_GAME.html?stage23qa=1"
  py -3 -m http.server 8765 --bind 127.0.0.1
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8765/START_GAME.html?stage23qa=1"
  python -m http.server 8765 --bind 127.0.0.1
  goto end
)
echo Python was not found. Start a local HTTP server and open START_GAME.html?stage23qa=1
pause
:end
endlocal
