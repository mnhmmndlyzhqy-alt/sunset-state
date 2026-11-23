# Visual recovery 2/7 — interior exploration

Added `assets/interior_recovery_phase02.js` to existing game startup after phase 1. For already-accessible portals with matched structural foyers, records three route guide nodes (existing entrance, foyer approach, foyer center), adds eight low-cost visual details per foyer and keeps a central passage clear. Never unlocks doors, adds physical collision, creates new floors or changes road geometry. Locked/invalid portals are skipped. A/B `?interiorRecovery2Off=1`.

19/19 isolated acceptance checks passed; full in-browser traversal and GPU performance NOT verified. This is an incremental improvement, NOT completion of fully explorable buildings. Future work needs true geometry, stairs, elevators, navigation and real interaction.
