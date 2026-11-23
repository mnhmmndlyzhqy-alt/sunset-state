# SUNSET STATE - Stage 21/35: manual browser and GPU validation

This is a test checklist, not a claim of visual validation. CPU harness uses the real physics code but a fake GL renderer.

1. Extract the full archive and open START_GAME.html in a current WebGL2 browser, keeping DevTools open.
2. Drive a regular vehicle at low and medium speed; check steering, brakes, wheel grip, curb impacts, scratches and car damage against Stage 20.
3. Drive a vehicle at high speed toward thin solid walls, roadside bollards and lamp posts. Check it cannot emerge on the far side after a frame stutter.
4. Repeat from an angled approach and along tight building corners; record any contact jitter or unexplained snapping.
5. Drive on top of a raised road over a lower crossing. Check the lower-road obstacles do not block the upper route; repeat on the lower level.
6. Check guard rails, bridge edges, destructible train gates, vehicle collisions, glass and dynamic street props still behave according to native gameplay.
7. Repeat one scenario with ?stage21CCDOff=1; this disables only Stage 21 and restores Stage 20 behavior.
8. Run a 10+ minute driving session and collect browser console errors, crashes, wall penetration, and GPU performance.
9. Record native 1920x1080 frame time/FPS in real GPU conditions; 50 FPS is a pending Stage 22 gate, not verified here.
10. In DevTools, inspect Heatline.stage21HighSpeedCCD.stats for clippedSteps, broadphaseQueries, skippedLowTravel and anomalies.

A/B state is not persisted. This stage does not provide complete rotational 3D CCD, mesh-accurate collision, multi-body TOI, or browser performance certification.
