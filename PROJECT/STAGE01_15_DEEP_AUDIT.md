# SUNSET STATE - Stage 1 of 15: deep independent issue audit

22 Nov 2026 - based on the cumulative user ZIP `SUNSET_STATE_CITY20_WORKING_PROJECT.zip`, with its engine and map preserved.

## Purpose and evidence standards

This is an **independent source-code, real-world data, and CPU smoke audit**. It does NOT claim actual GPU rendering, live player input or verified 1080p/50FPS. Items are explicitly classified; a coast overlap classifier or historic screenshot is not equivalent to a reproduced current-game issue.

**25 findings and follow-up items** grouped by evidence category. This count includes defects, delivery gaps, release blockers and explicit test tasks, not 25 proven gameplay crashes.

Counts: confirmed-data-anomaly=2, verified-code-data-gap=5, verified-code-design-limitation=6, heuristic-spatial-flag=3, verified-coverage-gap=1, previously-fixed-in-accumulated-source=1, requires-live-verification=2, release-verification-gap=1, verified-scale-risk=1, verified-metadata-error=1, verified-delivery-limitation=1, test-coverage-gap=1

## Independently rechecked world numbers

- Roads: **52**, sampled road centerlines: **3406** points.
- Portals: **298**, interior-ready: **83**, unready: **215**.
- Portal facing metadata: **{'north': 298}** (all north).
- Coast-classified water portals: **116**, ready among them: **0**.
- Display geometry: **191,357** boxes, solids **1320**, property solids **436**, defined breakable glass panels **124**.
- Stage09 facade glazing: **864**; Stage15 street geometry: **2284**, collisions added: **0**.
- Stage16 shrubs: **596**, spatially flagged: **181**.
- Traffic CPU-only: **23.76 simulated seconds**, **79 civilian vehicles**, **1** cars briefly below 90 HP. This does NOT confirm frequent AI collisions in normal gameplay.
- Measured road sample edges above a 24% grade: **0**; this is useful negative evidence, but cannot establish visual bridge correctness.

## Prioritized issue ledger

### S01-RD-01 - North Ring road centerline doubles back twice
**P0 | confirmed-data-anomaly | proposed fix stage 2**

**Evidence:** Two consecutive vertex turns 174.7 and 180.0 degrees at world positions (-523.05,-432), (-545.09,-432); a 22m backtrack between an inbound 75m and outbound 92m segment.
**Fix:** Inspect route in chosen reference and actual car scene, then correct point ordering and regenerate route samples, pathfinding, pavement and collisions together.
**Acceptance test:** Vehicles traverse northRing both ways without U-turn, clipping, unexplained braking or teleport; map layout remains unchanged.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json roadMetrics.sharp; world.roads461`

### S01-RD-02 - Private Spine road has an extremely sharp turn
**P1 | confirmed-data-anomaly | proposed fix stage 2**

**Evidence:** privateSpine469 has a 135.9 degree centerline turn at (-887.61,-16.1), with adjoining segment lengths 42.8m/118.2m.
**Fix:** Inspect camera/car route and if not intended, smooth transition without changing design reference.
**Acceptance test:** AI and player maintain appropriate road-lane continuity through the bend.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json roadMetrics.sharp`

### S01-BL-01 - Most door portals are not enterable
**P1 | verified-code-data-gap | proposed fix stage 5**

**Evidence:** 83 of 298 entrance portals have interiorReady=true; 215 are not available for entry.
**Fix:** Open selected buildings first and create functional lobbies/floors with safe collision; avoid claiming all 298 are accessible.
**Acceptance test:** Entry, floor changes, and return to street work in the selected target buildings, without fake decorative-only entries.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json; engine44.js nearestEntrance`

### S01-BL-02 - 130 new reference-mapped buildings were not supplied with new portals
**P1 | verified-code-data-gap | proposed fix stage 5**

**Evidence:** Stage02 explicitly adds decorative massing and collision solids but does not create new entrancePortals or interiorReady permissions.
**Fix:** Plan interior access for important new district buildings; integrate with the existing entrance and structural plan pipeline.
**Acceptance test:** Important mapped buildings have doors placed on usable street-facing sides and walkable interiors.
**Source:** `assets/city20_stage02.js; PROJECT/CITY20_PROGRESS.json stage2 actualDeliverable`

### S01-BL-03 - Every existing portal faces north
**P1 | verified-code-design-limitation | proposed fix stage 4**

**Evidence:** All 298 entrancePortals have facing="north" in a real world build; no portals face south/east/west.
**Fix:** Derive door orientation from the actual street-fronting facade and door/window geometry; preserve door IDs and working interior links.
**Acceptance test:** Doors around test blocks align naturally with street faces without clipping into walls or traffic.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json entranceFacingTypes`

### S01-BL-04 - 130 mapped building footprints are all axis aligned
**P1 | verified-code-design-limitation | proposed fix stage 4**

**Evidence:** Stage02 calls H.coastShape461 or H.box at yaw=0 for each generated mass; the stage02 district metadata does not include rotation.
**Fix:** Rotate building orientations according to neighboring streets/blocks after geometry and collider audit.
**Acceptance test:** Buildings relate to road directions instead of a globally uniform grid; parking and doors remain navigable.
**Source:** `assets/city20_stage02.js makeMassing/addMesh`

### S01-BL-05 - New windows are concentrated on a single side
**P2 | verified-code-design-limitation | proposed fix stage 4**

**Evidence:** Stage09 creates most window panes at facadeZ = building.z + building.depth/2 + 0.055; not a four-sided facade pass.
**Fix:** Add window patterns on relevant visible sides while respecting room layout, draw budget and gameplay glass.
**Acceptance test:** Building facade variety holds up from street corners and in overhead camera views.
**Source:** `assets/city20_stage09.js facadeZ`

### S01-BL-06 - 116 entrances classify as water; none are currently enterable
**P1 | heuristic-spatial-flag | proposed fix stage 3**

**Evidence:** The coast classifier marks 116/298 portal coordinates as water; the same probe finds zero interiorReady portals in that subset.
**Fix:** Cross-check building foundations, actual water geometry and reference map before adjusting elevation/position.
**Acceptance test:** No entrance or wall visually sits in incorrect water/terrain; no existing valid coastal portal is moved arbitrarily.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json portalsWaterClassified/portalsReadyInWater`

### S01-ST-01 - 181 outdoor planters remain in road/water-classified zones
**P1 | heuristic-spatial-flag | proposed fix stage 3**

**Evidence:** 181 of 596 Stage16 planter shrubs fail the coast/road safety heuristic after 55 planter sites were moved in earlier repair.
**Fix:** Review scene-aligned coordinates and move only confirmed bad sites together with bases, canopies and bollards.
**Acceptance test:** No props appear inside roads, canals or safe walking corridors; road and door map preserved.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json stageGeometry.planter-shrub; QA/DEEP_AUDIT_FULLWORLD.json`

### S01-ST-02 - 30 street lights could not be relocated safely
**P1 | heuristic-spatial-flag | proposed fix stage 3**

**Evidence:** Deep audit patch reports 30 unresolved decorative streetlamps, after 13 were relocated.
**Fix:** Visually inspect unresolved lamp positions and place on valid sidewalks without blocking lanes or paths.
**Acceptance test:** No streetlights float, overlap road lanes or clip building entrances.
**Source:** `QA/DEEP_AUDIT_FULLWORLD.json auditStats.unresolvedLamps`

### S01-ST-03 - Stage15 street props have no gameplay colliders
**P1 | verified-code-data-gap | proposed fix stage 2**

**Evidence:** Stage15 adds 2,284 visible street assets, including bollards, planters and lamps, with collisionsAdded=0 and unchanged world.solids.
**Fix:** Add lightweight collision shapes selectively to truly solid props, keeping decorative leaves nonblocking and ensuring AI avoidance.
**Acceptance test:** Player and vehicles cannot phase through bollards/planter bases in a controlled test.
**Source:** `assets/city20_stage15.js; QA/STAGE01_15_DEEP_METRICS.json stageGeometry.15`

### S01-IN-01 - Lobby furnishing coverage does not match number of ready entrances
**P1 | verified-coverage-gap | proposed fix stage 5**

**Evidence:** 83 portal entries are interiorReady; Stage11 decorates only 76 lobby plans and Stage13 processes only 71 for wayfinding/light fixtures.
**Fix:** List exact 7/12 omitted portals by floor dimensions and supply compact layout variants where appropriate.
**Acceptance test:** Every target ready lobby has working accessible fixtures and no fake inaccessible rooms.
**Source:** `QA/DEEP_AUDIT_FULLWORLD.json runtimeStages; assets/city20_stage11.js; assets/city20_stage13.js`

### S01-IN-02 - Lobby lighting stage adds zero real dynamic lights
**P1 | verified-code-design-limitation | proposed fix stage 6**

**Evidence:** Stage13 reports actualDynamicLightsAdded=0 and uses light_emissive visual meshes; Stage10 lamps are explicitly visual-only too.
**Fix:** Use a limited, culled actual interior lighting strategy with baked/clustered fallbacks; confirm visual light impact.
**Acceptance test:** Interior lamps visibly illuminate adjacent surfaces at night without breaking 50 FPS target.
**Source:** `assets/city20_stage13.js stats.actualDynamicLightsAdded; assets/city20_stage10.js`

### S01-IN-03 - CITY20 interior decorations are mostly visual-only overlays
**P1 | verified-code-design-limitation | proposed fix stage 5**

**Evidence:** Stage11/12/13 explicitly add zero collisions and no newly navigable rooms or door permissions.
**Fix:** Give chosen interior spaces usable collision, interactable elements and actual traversable floor layouts.
**Acceptance test:** Furniture cannot be walked through where solid and working floors link to actual paths.
**Source:** `assets/city20_stage11.js; stage12.js; stage13.js; PROJECT/CITY20_PROGRESS.json`

### S01-GL-01 - New facade glazing does not join the gameplay breakable-glass system
**P1 | verified-code-data-gap | proposed fix stage 4**

**Evidence:** Stage09 adds 864 visual glazing panels; the world.glassPanels collection contains 124 separately defined gameplay panels.
**Fix:** Map selected facade and storefront glazing to glass interactions/damage via existing engine, using distance-based budget.
**Acceptance test:** A controlled impact can affect intended windows without shattering unrelated decorative geometry.
**Source:** `assets/city20_stage09.js; world.glassPanels; QA/STAGE01_15_DEEP_METRICS.json`

### S01-RT-01 - Stage14 original storefront logic was inactive in full world
**P2 | previously-fixed-in-accumulated-source | proposed fix stage 7**

**Evidence:** Stage14 original portal descriptor filter matches zero live portals; a later deep-audit patch applies 342 corrective details to 60 venues.
**Fix:** Consolidate real commercial metadata contracts and keep live-world regression tests; do not remove existing workaround before replacement.
**Acceptance test:** All intended commercial venues have storefront metadata and stable visible entry/counter access.
**Source:** `assets/city20_stage14.js; assets/city20_deep_audit_repair.js; QA/DEEP_AUDIT_FULLWORLD.json`

### S01-WL-01 - Only 3 of 8 crocodiles can use high-detail model at once
**P1 | verified-code-design-limitation | proposed fix stage 10**

**Evidence:** Wildlife model selector has crocodileBudget=3. There are eight crocodiles and no near/far crossfade.
**Fix:** Implement continuous LOD with visually matching low/mid models and a model budget tuned on real hardware.
**Acceptance test:** No abrupt model silhouette changes in a fixed-distance fly-in/walk-in test; GPU budget monitored.
**Source:** `engine44.js select Wildlife43Renderer near crocodileBudget; PROJECT/ANIMAL_RECOVERY_PHASE03_REPORT_HE.md`

### S01-SV-01 - Save/load does not restore the full physical game state
**P1 | verified-code-data-gap | proposed fix stage 12**

**Evidence:** LocalStorage persists profile/missions/crime/rewards/story/weather/volume, but no complete avatar position, live vehicle condition or time-of-day snapshot path is present.
**Fix:** Design versioned save-state with a migration path and recovery tests, retaining the current localStorage data keys.
**Acceptance test:** Reload returns to a user-saved position and important gameplay/vehicle state without corrupting old progress.
**Source:** `engine44.js saveProfile/saveMissions30/saveVisitRewards; assets/life_445.js`

### S01-AI-01 - Pedestrian navigation uses simple local street routing
**P1 | requires-live-verification | proposed fix stage 11**

**Evidence:** Recovery5 fixed a time-key navigation bug; report says network is still a simple sidewalk graph without global robust planning for every complex intersection.
**Fix:** Stress navigation around bridges/interiors/large crowds and improve route planning for actual observed stalls.
**Acceptance test:** Pedestrians navigate crossings and varied streets in 10+ minute real play without repeated deadlocks or teleportation.
**Source:** `PROJECT/CITY_LIFE_RECOVERY_PHASE05_REPORT_HE.md`

### S01-PH-01 - Physics substeps are not continuous collision detection
**P1 | requires-live-verification | proposed fix stage 2**

**Evidence:** Movement recovery limits walking to 5 and driving to 6 substeps, explicitly not a mathematically complete CCD solution.
**Fix:** Test high-speed and narrow collision scenarios across level changes; patch any reproducible tunneling or launch.
**Acceptance test:** No collision tunneling or arbitrary vehicle hanging at critical bridges and roadside solids.
**Source:** `PROJECT/PHYSICS_RECOVERY_PHASE04_REPORT_HE.md`

### S01-PF-01 - 1080p/50FPS goal has no real hardware certification
**P0 | release-verification-gap | proposed fix stage 14**

**Evidence:** Current live browser cannot navigate local game (ERR_BLOCKED_BY_ADMINISTRATOR), and fake renderer CPU tests cannot validate visual/GPU FPS.
**Fix:** Run at least three 20-second native 1920x1080 sessions per required scene on target PC and document p95/p99 frames; optimize based on actual bottleneck.
**Acceptance test:** At least 50 sustainable display FPS plus p95<=20ms in target scenes, with internal render buffer actually 1920x1080.
**Source:** `PROJECT/RECOVERY_STATUS.json visualQA; QA/STAGE01_15_MANUAL_HE.md`

### S01-PF-02 - Large JS/game world increases performance and memory risk
**P1 | verified-scale-risk | proposed fix stage 14**

**Evidence:** 191,357 world display boxes, 59 script references, 21.4MB engine44.js, and 156.7MB of asset directory data (many high-detail assets load on demand).
**Fix:** Profile startup, draw calls, garbage collection and LOD budget; do not assume total asset bytes are all loaded at page startup.
**Acceptance test:** No unacceptable startup delay, frame spikes or memory growth in real 10+ minute sessions.
**Source:** `QA/STAGE01_15_DEEP_METRICS.json; START_GAME.html; engine44.js`

### S01-PR-01 - Recovery7 completion is contradicted by older progress metadata
**P2 | verified-metadata-error | proposed fix stage 1**

**Evidence:** PROJECT/CITY20_PROGRESS.json still indicates phases 1..6 completed and nextPhase=7 although PROJECT/RECOVERY_STATUS.json clearly confirms 7/7.
**Fix:** Update only the progress metadata and explain Stage1 is a NEW 15-stage QA plan, not redoing Recovery7.
**Acceptance test:** All progress files agree about Recovery 7/7 and Stage 1 status.
**Source:** `PROJECT/CITY20_PROGRESS.json; PROJECT/RECOVERY_STATUS.json`

### S01-PU-01 - Current full game is not standalone one-file HTML
**P2 | verified-delivery-limitation | proposed fix stage 15**

**Evidence:** START_GAME.html references 59 local JavaScript modules; the 288-file ZIP must be extracted and served or opened with compatible local file permissions.
**Fix:** At final stage package for GitHub Pages and optionally an optimized self-contained delivery if feasible without losing models.
**Acceptance test:** Player can open the published game without manually installing dependencies.
**Source:** `START_GAME.html script references`

### S01-QA-01 - Past 4.7.6 bug protocol must be re-verified in current build
**P1 | test-coverage-gap | proposed fix stage 15**

**Evidence:** Historical reports include floating car parts, broken curved bridge railings, repeated AI crashes, unnatural slopes, camera clipping and confusing vehicle/foot interactions. Several related code fixes exist after 4.7.6, so not confirmed current bugs.
**Fix:** Reproduce each old screenshot route in live current game and close only with before/after evidence; prioritize critical bridge/car issues.
**Acceptance test:** Bug ledger records PASS/FAIL/NOT TESTED with exact scene screenshots and coordinates.
**Source:** `BUG_PROTOCOL_476_ORIGINAL_HE.md; PROJECT/PHYSICS_RECOVERY_PHASE04_REPORT_HE.md`

## What was already addressed in existing source (do not re-open without proof)

The big timber wildlife observation walkway was intentionally removed in 4.7.7-era accumulated code; crocodile habitat water banks were added; the severe pedestrian time-key bug was repaired in Recovery 5; car movement received adaptive substeps; old Stage14 zero-commercial output is compensated for 60 active venues by the deep audit patch. These are not counted as uncorrected current visible bugs without new evidence.

## Test environment and next actions

1. The optional `?stage1qa=1` mode adds a field-test panel and report export; normal game mode is unchanged.
2. Confirm all eight live scenarios, three native-1080 20-second measurements, real screenshot capture, and game persistence on a capable local browser.
3. Start Stage 2 on road centerline reversal and real-world bridge/collision tests after documenting the exact geometry, while respecting the chosen city reference and retaining all cumulative assets.
4. Do not treat CPU/mock checks, structural GLB checks, or DOM-only screenshots as proof of final AAA or GPU FPS.
5. Source archive remains unchanged and its original map/engine are not edited in this stage.

## Reproduction commands

```sh
node QA/run_stage01_deep_metrics.cjs
node QA/run_stage01_traffic_cpu.cjs
node QA/run_recovery07_smoke.cjs
python QA/validate_recovery07_gltf.py
```

If local browser allows file loading: open `OPEN_STAGE01_QA.html`, click launch, enter the game, and export `SUNSET_STAGE01_15_LIVE_QA.json`.
