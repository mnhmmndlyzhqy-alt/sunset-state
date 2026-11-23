# Stage06 visual QA — pending

A local HTTP server returned 200 OK for START_GAME.html. A headless Chromium attempt with SwiftShader flags timed out before producing a reliable screenshot. The GPU process reported EGL initialization failure. This is a limitation of the execution environment, not proof that the game itself is broken. FPS and real door visibility remain **not verified**.

For manual testing, run the game using a local HTTP static server, walk through representative north/south/east/west doors and verify exterior animations, wall openings and transitions into/out of interiors, then record native 1920x1080 FPS.
