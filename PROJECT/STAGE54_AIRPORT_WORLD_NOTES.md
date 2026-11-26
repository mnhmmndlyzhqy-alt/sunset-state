# Stage 54 airport terminal world

The main terminal occupies its original surveyed 225.21 × 58.53 m footprint. Departures and Arrivals have public entrances from the forecourt. Two ground-level doors connect the terminal to the existing apron near Gates A and B. The metal canopy, glazed skylight, satellite hangars, control tower, elevated jetways, runway and five parked aircraft stands retain their original locations.

The shared world now contains a check-in hall with six bag-drop counters, two security lanes, a concourse, gate lounges and podiums, an information desk and flight directory, a café, and an arrivals hall with two baggage carousels. Four graded door ramps meet a 2.33 m interior floor. The terminal furniture and walls use the regular walker collision index. Floor support is scoped to the terminal and ramps. The chase camera follows the door openings and stays below the canopy indoors.

## Integration

`assets/landmarks_461.js` delegates the terminal shell and contents to `H.airport54World.decorate` when the Stage 54 world script is present. `?airport54Off=1` retains the authored Stage 53 terminal mesh and collision. A built site's API is available as `H.airport54World.setup(game)` or `game.world.airport54`. `H.airport54World.floorAt(x,z)` returns `null` beyond the building and approach ramps.

- `entry.outside`, `entry.threshold` and `entry.inside` locate the main public entry. `positions.arrivals` is the inside end of the second public door.
- `positions.infoDesk`, `positions.checkIn`, `positions.security`, `positions.cafe`, `positions.baggage` and `positions.exit` are standing interaction locations.
- `routes` contains authored sequences between the hub, screening, concourse, gate approaches and amenities. `path(from,to)` joins standable points through clear corridors. `segmentClear(a,b)` checks terminal furniture and walls with pedestrian clearance.
- `queues` describes lines, service locations, clear exits and waiting positions. `seats` includes a standing approach, a sitting point, `seatY` and `yaw`. `staff` lists actual standing posts. `gates` includes desk and ground boarding routes. `offstage` points are screened from the public entry line and gate door sightlines.
- The asset uses the existing in-world shop sign projection and roof, floor, glass, furniture and light materials. Twenty signs are registered for the existing pooled display. Twenty-nine fixture locations feed the existing point-light pass, with at most eight terminal emitters and twelve total lights returned for an indoor view.

## Validation

`node QA/stage54_airport_world.cjs` loads the genuine Game through the CPU bootstrap. It checks entry at both public doors, exit at Departures, travel in both directions through both apron doors, the stepped walker height, facade collision, chase camera clearance, gate route screening, the indoor light budget and all original parked stand coordinates. It verifies standing positions on ten queues, 148 seat approaches and thirteen staffing posts against the real Game collision query.

The terminal contributes 1,267 static render pieces, 48 physical wall or column records and 54 indexed camera volumes. The route graph contains 349 points. The CPU run exercises the game simulation and renderer-facing data with a simulated rendering surface. Browser pixels, glass appearance and GPU performance remain unverified.
