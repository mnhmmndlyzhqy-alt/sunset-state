@echo off
setlocal
cd /d "%~dp0"
echo SUNSET STATE Stage22 - native 1920x1080 GPU check
echo The game will be available at http://127.0.0.1:8765/START_GAME.html?stage22qa=1
echo Open that URL in Chrome and start the game.
echo Use F4 to select Native 1080p. Keep the browser foregrounded.
echo.
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -m http.server 8765 --bind 127.0.0.1
) else (
    python -m http.server 8765 --bind 127.0.0.1
)
endlocal
pause
