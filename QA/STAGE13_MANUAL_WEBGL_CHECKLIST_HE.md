# Stage 13/35 - manual real-browser rendering checklist

The Stage13 CPU checks are not a real GPU/browser screenshot or a native 1080p FPS measurement.

Start START_GAME.html through a static site or local web server with assets/ beside it. Ensure WebGL is available and compare the same scenes with and without ?stage13LobbiesOff=1.

1. Visit the seven legacy entry IDs: 1, 24, 35, 50, 62, 67 and 78.
2. Confirm each active entrance opens, with no changed walls, doors or invisible obstacles.
3. Check the narrow foyer details near the floor-one front side for clipping and unwanted overlap.
4. Enter each of the seven buildings and inspect the bench/art/lighting near the front-east nook.
5. Walk to the lift, use it, return to floor 0 and exit through the same entrance.
6. Compare with the toggle disabled: only Stage13 decorative meshes should disappear.
7. Inspect at day and night. New stage13 fixtures are emissive visuals, not verified dynamic lights.
8. Benchmark at 1920x1080 native render resolution on the target PC, noting avg, 1% low, GPU and CPU usage; target >=50 FPS is not yet certified.
9. Test all other legacy entries and CITY20 compact interior entrances for regression.
10. If any discrepancy appears, use the base Stage12 backup supplied in BACKUPS/STAGE13_OF35.

Stage13 technical CPU checks: QA/run_stage13_of35_acceptance.cjs and QA/STAGE13_AB_COMPARISON.json.
