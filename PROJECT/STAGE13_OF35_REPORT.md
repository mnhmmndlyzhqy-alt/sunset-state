# SUNSET STATE - Stage 13 of 35: Furnish seven narrow legacy foyers

**Base:** SUNSET_STATE_STAGE12_OF35_FULL.zip (SHA256 preserved at BACKUPS/STAGE13_OF35/SOURCE_STAGE12_SHA256.txt). No replacement of the city layout or game engine. **Issue:** S01-IN-01.

## Root cause and exact scope

CITY20-11 had 83 active original entrance portals but decorated only 76. Seven portals (IDs **1, 24, 35, 50, 62, 67, 78**) were skipped by its foyer depth gate (required >=3.6 m). These remaining foyers have a real footprint of width 7.2 m and depth 3.42-3.591 m. All seven are active legacy buildings, with real interior scenes and usable east-facing doors after Stage06. The historical CI CITY20-11 test with 198/198 decorated was a mock world; the live world shows 76/83.

The original engine already generated standard chairs, benches and room fittings inside each active building. Thus the verified defect was the missing **CITY20 special lobby decoration layer**, not an entirely empty building.

## Implementation

- Added `assets/stage13_seven_lobby_furnishing.js` after Stage12 and before the engine. It wraps the existing world-finalization chain and targets only the seven eligible legacy foyers that lack CITY20-11 meshes. It does not create portals, solids, paths or new buildings.
- In each of the seven exterior-world foyer representations, added exactly 11 low-profile parts (floor runner, two compact seats with backrests, two wall graphic panels, wall sconces, ceiling recess and directory accent). The central axis remains unobstructed by new furniture. **77 new world meshes total**.
- Added `assets/stage13_interior_runtime.js` after all previous interior hooks. The real `polishInterior461` scene output receives exactly 10 extra detailed parts per affected ground-floor scene (compact bench, cushion, back, legs, art and sconce). The site is selected with clearance checks against existing `scene.solids`, low furniture, lift and entrance. **70 actual indoor scene meshes total**; no change to upper floors or non-target buildings.
- Toggle `?stage13LobbiesOff=1` or environment `STAGE13_LOBBIES_OFF=1` disables both additions, for genuine Stage12 A/B comparison.
- The styling is **visual only** and intentionally introduces **zero** collision bodies. Physical furniture collision/interactions are a separate Stage15 work item. Decorative emissive materials are not verified dynamic lighting (Stage14).

## A/B game-world comparison

| Metric | Stage13 off, Stage12 base | Stage13 on |
|---|---:|---:|
| World display objects | 194,478 | **194,555** |
| New lobby world display objects | 0 | **77** |
| Additional interior objects per each of 7 scenes | 0 | **10** |
| Legacy collision solids | 3,230 | 3,230 |
| Prop collision solids | 796 | 796 |
| Roads | 52 | 52 |
| All portal descriptors | 429 | 429 |
| Active entrances | 214 | 214 |
| Existing original CITY20-11 furnished foyers | 76 | 76 |
| Interior rooms/doors/lights/pickups/lift/entrance coordinates | unchanged | unchanged |

## Validations (CPU, simulated rendering backend)

| Test | Outcome |
|---|---|
| Stage13 direct game-world and game interior acceptance | **110/110 pass** |
| A/B across world, 7 real interior scene instances, transitions and solids | **9/9 pass** |
| Stage12 prop collision regression (Stage13 off) | **1,476/1,476 pass** |
| Stage11 lamp audit regression (Stage13 off) | **118/118 pass** |
| Stage10 planter audit regression (Stage13 off) | **39/39 pass** |
| Stage08 facade/window regression (Stage13 off) | **28/28 pass** |
| Stage07 building alignment regression (Stage13 off) | **23/23 pass** |

Stage13 direct tests include: 7/7 live portals and matching plans, in-game scene generation, collision clearance, no added world/scene solids, no blocked door/lift locations, entering and initiating exit for each, preserving upper floors and non-target foyers, no duplicate additions, and checking that non-decorative objects are unchanged.

**Limitations:** Node tests execute real game logic with a fake canvas and renderer, and cannot establish that the 147 new decorative parts look correct, that there is no render clipping under WebGL, or that native 1920x1080 >=50 FPS has been reached. Manual WebGL test checklist: `QA/STAGE13_MANUAL_WEBGL_CHECKLIST_HE.md`.

## Backup and next work

Original files preserved under `BACKUPS/STAGE13_OF35/`, including the unmodified Stage12 entry page, bootstrap and development plan. The original Stage12 ZIP remains untouched, and its hash is recorded. The next task is **Stage14/35: real interior lighting**, not another reconstruction of interiors.
