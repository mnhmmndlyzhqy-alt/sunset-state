# SUNSET STATE - Stage25 manual publication + browser QA

1. Extract the website-only ZIP and verify index.html, START_GAME.html, engine44.js, assets/, .nojekyll are all in the repository root.
2. Before publishing, create/select a repository belonging to SUNSET STATE, NOT an unrelated existing project.
3. Commit and push through GitHub Desktop, then configure Settings > Pages > Deploy from a branch > main > /(root).
4. Verify real Pages URL as shown by GitHub. Open the page and wait for the game splash, check DevTools Network has no 404s.
5. Start game with Play, walk on WASD, enter and exit at least three buildings, interact with a shop, drive a vehicle, open map, save via F5 then load with Shift+F5.
6. Verify the on-demand model assets and the radio WAV files load without 404 errors. Try loading within a repository subpath, not only local root.
7. Run stage22qa and stage23qa on a hardware GPU at 1920x1080 and export performance reports. FPS certification requires actual hardware measurements.
8. Check the browser console for fatal errors, test a refresh/load of save after browser restart, and repeat with one slow connection if practical.
9. If a problem is found, keep the stage24 checkpoint and full stage25 ZIP; do not force-push or erase history.

These browser/hardware checks are OPEN, not represented as passed by local HTTP tests.
