@echo off
setlocal
cd /d "%~dp0"
py -3 --version >nul 2>nul
if not errorlevel 1 (
  start "SUNSET STATE Stage 54 Server" cmd /k "py -3 -m http.server 8765 --bind 127.0.0.1"
  goto open_game
)
python -c "import sys; sys.exit(sys.version_info[0] != 3)" >nul 2>nul
if not errorlevel 1 (
  start "SUNSET STATE Stage 54 Server" cmd /k "python -m http.server 8765 --bind 127.0.0.1"
  goto open_game
)
node --version >nul 2>nul
if not errorlevel 1 (
  start "SUNSET STATE Stage 54 Server" cmd /k "node TOOLS\serve_game.cjs 8765"
  goto open_game
)
echo SUNSET STATE needs Python 3 or Node.js to serve the game and voice files.
echo Install one of them, then run this file again.
echo Direct file opening cannot load the voice manifest and speech modules reliably.
pause
exit /b 1
:open_game
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/?build=54"
echo Keep the server window open while playing.
echo If another version opens, close the older SUNSET STATE server and run again.
endlocal
