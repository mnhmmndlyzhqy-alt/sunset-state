# SUNSET STATE -- Recovery 7/7: final technical QA and visual-QA handoff

Date: 2026-11-22. This is a continuation of SUNSET STATE 4.7.9, the complete CITY20 sequence, and all six earlier recovery phases. The original city reference and original models were preserved; this is NOT a new game.

## Result and evidence

**Technical QA: completed. Visual/GPU QA: NOT completed due to the managed-browser restriction.** It would be inaccurate to certify a full AAA visual result or 50 FPS at 1920x1080.

- `QA/RECOVERY07_REGRESSIONS.json`: 27/27 existing regression suites passed, including stages 02-18, project baseline, visual/interior/animal recovery, full-world audit, physics, crowd and performance.
- `QA/RECOVERY07_CPU_SMOKE.json`: 30/30 CPU gameplay and optional-panel checks passed. This harness executes the real `Game` class, loads the complete world, starts a real game state, calls update/HUD/tick, moves the player, uses a real ready entrance, rides an elevator to floor one and back, exits the lobby, checks the default clock and toggles the day/night cycle. The DOM and graphics renderer are expressly simulated. Results are NOT browser screenshots, GPU timing, or frame-rate certification.
- `QA/RECOVERY07_GLTF_VALIDATION.json`: 9/9 original GLB asset payloads validated (including crocodile_hi, flamingo_hi/mid, heron_hi/far, unique fish, airplane models and a pedestrian model). Validation covers gzip/base64, GLB 2 header and byte count, JSON chunk, mesh index references and declared metadata. Shape, lighting, animation appearance and GPU playback were NOT visually verified.
- Chromium was launched and an attempt was made to load a basic local page. Even `data:text/html` was denied with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore this run did **not** produce a real game screenshot or a defensible GPU/FPS measurement.

## Actual corrections and new capabilities

1. `START_GAME.html`: the clock's initial DOM text now reads **12:15** and the slider starts at **12.25**, matching `Game.worldHour = 12.25` and the already-disabled day/night cycle. This prevents the initial stale display of 16:17 / 17.5 before the first update.
2. `QA/recovery07_live_checklist.js`: opt-in manual visual QA panel via `START_GAME.html?recovery7qa=1`. The normal game does not load this script. It offers eight user-driven scene checks, a 20-second display-frame-cadence measurement, full canvas-size capture in a JSON report, optional canvas PNG export, a saveable issue list and a state snapshot of the actual game. Its frame metric is not a hardware GPU profiler.
3. The new QA panel's collapse control was tested and corrected to remain accessible after the other controls are hidden.
4. `QA/run_recovery07_smoke.cjs`: added a repeatable full-engine startup/movement/interior/clock/input/render-loop CPU test. **The fake renderer is explicit**; it does not claim to render WebGL.
5. `QA/validate_recovery07_gltf.py` and regression runner record structured machine-readable test outcomes.

## Known significant unresolved defects and risks

- 116 existing entrance coordinates are flagged as water by the coast classifier, and 181 planter sites plus 30 ornamental lamps remain suspicious; see `PROJECT/CITY20_DEEP_AUDIT_REPORT_HE.md`. The classifications may need visual context; no automatic reallocation of functional portals was made.
- Crocodile hi model is structurally valid (~195,560 declared triangles), but the actual look of the head, its color, the three-model rendering budget, near/far LOD transition and swimming/land animations were not visually evaluated. Do not call these problems fixed.
- The 190k+ scene-object city needs hardware visibility tests, road/bridge scene captures, GPU load, mobile loading and sustained 1080p frame timings on the user's device. The 50 FPS goal is NOT verified.
- No real on-device full playthrough of retail, missions, driving crashes, police chases, swimming or persistence has been recorded. Passing CPU mocks alone is not proof of high production quality.
- `canvas.toBlob` may generate a blank image on some WebGL configurations with `preserveDrawingBuffer=false`. If so, use a device screenshot of the running game instead; never submit a blank image as proof of a successful visual review.

## Manual acceptance procedure

1. Extract the full ZIP. Open `START_GAME.html` in Chrome/Edge. Verify start on foot in bright 12:15 light and time cycle paused. For QA use `START_GAME.html?recovery7qa=1` (the URL query can also be appended when served locally).
2. Run all eight checklist scenarios, recording PASS or FAIL; export the JSON report and actual screenshots. The panel is intentionally not loaded in normal mode.
3. Verify 1920x1080 *internal drawing buffer*, not only window dimensions. Use F3, F10 and the QA panel measurements; perform at least three 20-second measurements in the city, driving and coast, with an additional long-play stress test.
4. Compare close and far crocodile head/body appearances; capture full-resolution screenshots and note visible LOD transitions. Inspect roads, overpasses, lobby stairs/lifts and waterfront vegetation.
5. Save and reload progression, test weather and day/night changes, NPC conversations and police scenarios on real hardware.
6. Reopen any issues found; the test suite establishes only a technical baseline, not AAA certification.

## Final status

**Recovery phase 7 technical scope completed and packaged; hardware visual acceptance remains OPEN.** All previous cumulative game systems and original model assets are kept. Reports deliberately separate structural validation, CPU gameplay simulation and unperformed live GPU verification.
