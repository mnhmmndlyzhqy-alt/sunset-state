# SUNSET STATE 4.7.9 -- continuation checkpoint

**Base:** the exact existing SUNSET STATE 4.7.8 full checkpoint. This is an incremental update of the same game, world, custom WebGL2 renderer and mission systems, not a new project.

## Stage A: City ground material continuity

The original shared coastal ground mesh retains its exact **34,042 vertices and 65,012 triangles**. The added `assets/continuation_479.js` applies smooth, world-space macro color variations once during mesh construction, using the existing per-vertex colors. Roads, municipal paved areas and sandy shorelines are excluded. This reduces the monotonous grass/ground appearance without adding textures, GPU shader branches, render passes or draw calls. The original materials, topography and terrain indices remain unchanged.

## Stage B: Distant facade consistency

After the final city-building layout is assembled, the update gently blends the colors of surviving distant facade elements toward their own authored near-range main shell (20% adjustment). **82 retained skyline components** were adjusted. Material types, LOD thresholds, geometry, draw batches, collision hulls and building positions are unchanged. Original facade colors retain 80% influence to preserve architectural variety. The original map/reference layouts are untouched.

## Exact source continuity

- Final playable world: **84 retained buildings**, **176,421 world box primitives** (same as 4.7.8).
- Roads: **52** original routes. The previously repaired maximum sampled grade is still **9%**.
- Wild animals: **8 crocodiles still in actual water**, at exactly the same coordinates as 4.7.8.
- The **48 optional landscaping primitives** from 4.7.8 and the previous predictive traffic braking system remain unchanged.
- City objects and terrain geometry digest match 4.7.8 exactly; only color data changed. No additional objects were added.
- No engine changes, no changes to avatar/car physics, police, economy, shops, lobbies, entry triggers, vehicles, bridges or saves.

## Quality assurance / FPS guard

- `QA/SUNSET_STATE_4_7_9_CPU_ACCEPTANCE.json`: **23/23** new source, game-world and geometry checks pass.
- 4.7.8 adjusted compatibility suite: **14/14** pass. The original 4.7.8 suite had a class-name-only check explicitly naming PerformanceGuard478; the compatibility suite accepts later versioned subclasses while checking the same behavior. The original historical test is retained.
- 4.7.7 original CPU regression checks: **12/12** pass.
- Comparing current vs. prior world: box count, positions, dimensions, materials, LOD range, road slopes, crocodile positions, terrain vertex/index count, and shoreline positions/normals remain identical.
- The F8 JSON report is upgraded to 4.7.9, reports the actual native render dimensions, skyline audit and current visible instance count where available. It makes no device-wide 50 FPS guarantee.
- Chromium did not load the game in this sandbox due to `ERR_BLOCKED_BY_ADMINISTRATOR` before DOM readiness. Therefore **1920 x 1080 at 50+ FPS is NOT verified on an actual GPU**. Startup timings on this sandbox are not frame rate measurements. No screenshots claiming a new graphics result are included.

## Real GPU acceptance procedure

1. Extract the full ZIP to one folder and open `START_GAME.html` in Chrome/Edge.
2. Set the native Full HD quality mode (F4 if necessary). F3 must report an internal render target of **1920 x 1080** (not merely a similarly sized application window).
3. Use F9 to sample and compare stationary/moving gameplay in the same location before/after; press F8 to export the result. Check on foot, in traffic, inside a lobby and in a helicopter.
4. Accept the 50 FPS requirement only after sustained samples in **all** required scenes. If the frame rate worsens, disable optional details with the established performance guard and compare without downscaling the native pixels.
5. Inspect shore/grass appearance and the city facade transitions at varying camera distances. The user can keep 4.7.8 unchanged and roll back by restoring its ZIP.

## Next engineering tasks

- GPU-tested material and wave improvements (water in particular still has repeated wave patterns), and real-world screenshot QA.
- Improve the central pilot district at street level: continuous shop entrance, door-to-lobby walk-through and usable upstairs floors.
- Investigate bridge guardrails and traffic in congested real scenes (the isolated physics simulator alone is insufficient).
- Test the 1920 x 1080 / 50 FPS objective on the target computer; never claim it is passed without actual measurements.

**Next checkpoint:** SUNSET STATE 4.7.9. Previous complete checkpoint 4.7.8 is retained as an independent rollback. Do not rebuild the game from scratch.
