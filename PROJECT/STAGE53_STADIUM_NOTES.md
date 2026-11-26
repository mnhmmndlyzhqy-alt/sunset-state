# Stadium and exhibition match

Walk to the stadium from the existing approach road. The southwest gate has an open covered passage to the bowl, and the same route leads back out. The field, stand bank, and access ramp use the terrain elevations the visitor sees. The stadium retains its map position, silhouette, canopy, and exterior road layout.

Two seven-player teams and a referee play continuously while a nearby outdoor visitor is in free roam. The ball has possession, passing, shot flight, interceptions, goal-line and crossbar checks, saves, and out-of-play restarts. Both scoreboards and the Hebrew stadium HUD follow the local match. Spectators follow the play and stand and react after goals. A visitor can face a loose ball and press **E** while the HUD displays the kick prompt. Nearby interactions resume as soon as the ball moves out of reach or is claimed.

The stadium has 42 authored spectator placements. Characters use existing skinned meshes with football kit materials and venue-specific poses. Camera direction and range gate submissions, and the match has a fixed 40 Hz step with bounded catch-up. Simulation stops outside the local activation range, and retired match state is absent from saves.

`node QA/stage53_stadium_acceptance.cjs` exercises the actual Game, World, foot collision and chase camera, a three-minute seeded match, goals, restarts, the E interaction, and the queued stadium character poses. The harness uses a simulated display surface, so it verifies geometry, simulation, and pose submission through game code. Visual and GPU performance verification require the running game.
