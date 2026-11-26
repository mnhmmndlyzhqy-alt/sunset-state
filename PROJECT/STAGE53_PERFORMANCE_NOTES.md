# Stage 53 CPU preparation work

The first four-scene Stage52/Stage53 CPU comparison found higher simulation/preparation times after the new content. Both reports are preserved in `QA/STAGE53_CPU_BEFORE_OPTIMIZATION.json`. The harness runs actual Game updates, dynamic preparation and light selection under Node with a simulated rendering surface. It is not a GPU or browser FPS benchmark.

A subsequent V8 CPU profile isolated two avoidable sources of work. Public-island height queries scanned all helipads and piers even for coordinates far from any of those surfaces. Pedestrian movement projected every candidate solid onto each proposed position using two general clamp calls, even when a solid could not touch the walker.

The final public-island layer indexes the exact pad support envelope, pier bounds and path segments in numeric spatial cells. Candidate order remains pad before pier, preserving overlapping supports and feather interpolation. During world construction it uses the original live arrays until the complete index can be installed. World replacement creates a fresh index. Actual restart validation also caught a navigation-cache invalidation error: the map cache is now cleared as a Map, preserving the interface expected by map drawing.

The engine's walker loop rejects points strictly outside a solid's bounds expanded by the existing 0.38 m walker radius. Near a possible contact it keeps the original coordinate clamps and squared corner-distance calculation. Invalid inverted bounds fall through to the earlier calculation. This changes candidate work, not colliders, geometry, animation detail or input behavior. The office interaction now tests its existing seven-metre horizontal radius before querying the terrain.

`QA/stage53_walk_collision.cjs` compares the shipped loop with the exact prior collision loop. Eight groups passed, with 904 exact movement comparisons including 48 live avatar steps and 120 NPC steps. The distant-solid fixture performs four clamp calls instead of 874 and retains the same result. `QA/stage53_islands.cjs` checks indexed and original lookup parity at cell, pad feather, overlapping pier and path boundaries, plus a real world restart.

The final paired four-scene sample and its limitations are documented in `QA/STAGE53_VALIDATION_REPORT_HE.md` and `QA/STAGE53_CPU_TIMING.json`. Existing instanced rendering, skinned-array reuse, resolution settings and detailed-character policy are retained. None of the CPU measurements claims an achieved GPU frame rate.
