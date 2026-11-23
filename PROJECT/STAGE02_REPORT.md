# SUNSET STATE CITY20 | STAGE 02 IMPLEMENTATION

Date: 2026-11-21
Source: Stage 01 project based on original SUNSET STATE 4.7.9.
Status: Stage 02 (reference-registered urban fabric) completed in code. Live GPU results unavailable.

## What actually changed
- Added `assets/city20_stage02.js` to the exact existing WebGL2 engine script pipeline.
- Added **130 physical scene building masses** and **523 renderable geometry objects**. New solids and 2D map footprint metadata represent these additions.
- Distribution: 89 residential houses across western canal neighborhoods, 14 port warehouses, 11 smaller structures on actual developed eastern resort islands, 9 civic masses to the north of downtown, 4 downtown towers, 2 eastern midrise buildings, and 1 airport-adjacent service building. Numbers are generated reproducibly from the chosen reference coordinate system.
- Defined use zones in coordinates registered through `Heatline.reference469.world`. Original reference remains unchanged.
- Each placement is screened against land/water, slopes, actual road route samples, existing building solids, protected areas (airport, stadium and parking, courtyards, parks and fairways), starter car and 298 original door thresholds.
- The new buildings have compact distance-capped geometry and retain outer masses to 3,200 world units. They are *not* yet interactive interior buildings; that is reserved for stages 10 through 12.
- No new drivable roads or bridges, no relocation of original structures, no edits to vehicle/police/player/mission/save logic. Terrain, water and bridge geometry remain for stages 3, 4, and 5.

## Geometry and continuity measurements (code-level)
| Measure | Before | After |
|---|---:|---:|
| Existing core building records | 84 | 84 |
| Renderable scene objects / boxes | 176,421 | 176,944 |
| Collision solids | 1,190 | 1,320 |
| 2D map features | 272 | 402 |
| Existing entrance portals | 298 | 298 |
| Drivable road routes | 52 | 52 |
| Maximum sampled road grade | 9% | 9% |
| Crocodiles at water coordinates | 8 | 8 |

CPU startup sampled in this container: baseline ~6.1 seconds, Stage 02 ~6.2 seconds in one test run (not GPU FPS or a controlled browser benchmark).

## Quality verification
- `node QA/run_stage02_acceptance.cjs`: **27/27** tests passed, including full preservation of all pre-existing 176,421 scene objects, all original core buildings/door portals/road polylines, map registration and no new geometry overlapping water, drivable roads, protected sites or old entrances.
- Original reference image SHA256 remains unchanged (`7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38`).
- `QA/CITY20_STAGE02_REFERENCE_OVERLAY.png` is a **reference-plan placement visualization**, NOT a game screenshot and not a new reference layout.
- Chromium headless at 1920x1080 did not finish launching the game in the provided environment. It exited on timeout without a screenshot. **A real GPU test of >= 50 FPS at an internal drawing buffer >= 1920x1080 remains required**. Native mode switch and existing F3/F8/F9 controls were preserved; no automatic resolution downgrade was added by Stage 02.

## Honest limits of Stage 02
This stage improves building placement density and region identities, but does NOT fully recreate every individual roof footprint, street alignment, 3D tower facade, canal bridge or lobby from the reference photograph. Those are subsequent dedicated stages. New stage-02 volumes are not claimed to have finished interiors or photoreal materials.

## No checkpoint proliferation
Stage 01 baseline backup remains the one historical backup. This stage updates the same working project and its `PROJECT/CITY20_PROGRESS.json`; there is no new independently versioned checkpoint. When the user says the next "continue", execute exactly **Stage 03: terrain and topography**.
