# Stage 21: narrow CCD contract and implementation limits

The real game installs the module assets/stage21_high_speed_ccd.js immediately after the Recovery04 physics wrapper. Existing Heatline.stepCar and Game.moveCar behavior is retained, including the old six-substep system and collision responses. New continuous SAT queries are performed only if a single integrated microstep travels at least 2.15 metres. This keeps normal driving on the original path.

- Full opt-out: URL query ?stage21CCDOff=1 or global __SUNSET_STAGE21_CCD_OFF=true.
- Swept shape: oriented vehicle footprint of its current frame, translated across a linear microstep against static AABB blockers in the existing broad-phase. Ground-level blockers underneath raised roads are ignored using the production elevation guard. Deck rail collision uses the original overpass layer.
- When crossing is detected, the position is clipped slightly inside the earliest obstacle so the original carRectPush, damage, effects and audio paths each retain ownership of the impact.
- 18 spatial sampling intervals maximum, 3.5m spacing, 75m displacement anomaly guard. This is not a complete CCD solution for freely rotating 3D vehicle bodies or discrete moving obstacles, and cannot guarantee no rare tunnelling in all circumstances.
- Baseline: 70 forward and 675 sideways synthetic scenarios with the current production vehicle speed limits showed no pass-through even without this extra guard. Synthetic 13m displacement was injected to reproduce the failure mode and verify intervention.
- CPU QA evidence: QA/STAGE21_HIGH_SPEED_ACCEPTANCE.json and QA/STAGE21_WORLD_INTEGRITY.json. Real GPU performance, motion quality and >10 minute game play remain unverified.
