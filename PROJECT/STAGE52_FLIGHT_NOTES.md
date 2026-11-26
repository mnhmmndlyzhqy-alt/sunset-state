# Stage 52 flight

## Aircraft at the airport

Walk to either side of an existing parked SKYLINE 320 door and press **E**. All five existing stands are available. You can also board from the marked terminal desk and start on the runway as in Stage 51. The aircraft remains where you stop and exit. Loading an earlier save or restarting restores the five surveyed parking positions.

| Control | Action |
| --- | --- |
| **W / S** | Increase or reduce throttle. |
| **A / D** or **← / →** | Steer during taxi. Bank in flight. |
| **↑ / Shift** and **↓ / Ctrl** | Raise and lower the nose. |
| **T** | Toggle the low-speed taxi limiter while on the ground. |
| **X** | Toggle pushback when stopped. Use **W** to move back and **Space** to stop. |
| **Space** | Brake on the ground. |
| **C** | Cycle chase, wide chase, and forward nose views. |
| **L** | Toggle runway alignment guidance in the current eastbound or westbound direction. |
| **E** | Exit on the ground after stopping. |
| **R** | Move the occupied aircraft to a clear departure position on the runway. |

A parked aircraft starts in low-speed taxi mode. Once aligned on the runway, holding throttle and raising the nose removes the limiter. Runway-end protection brakes a rolling aircraft as it nears the pavement edge. A low-speed ground obstruction stops the aircraft in place. You can back away using **X**.

The landing guide displays distance to the threshold, centerline offset, heading correction, and speed or descent warnings. Four turquoise strips identify the selected threshold at close range. The guide leaves steering, pitch, throttle, and braking under player control. Press **L** twice to select the other direction after changing heading. The nose camera sits ahead of the highest-detail mesh and follows aircraft pitch.

In-flight saves use the existing ground fallback at the original door or terminal desk. The autonomous airliner continues its own route. The airport and aircraft models use the existing game assets.

## Verification

`node QA/stage52_flight_acceptance.cjs` exercises the real Game with a simulated DOM and renderer. It covers parked-aircraft access, pushback, taxi steering, camera positions, takeoff, eastbound and westbound landing guidance, runway-end braking, distinct aircraft identities, and save/load. `node QA/stage51_mobility_acceptance.cjs` exercises the original manual takeoff, landing, exit, and steering regressions. Browser pixels, GPU performance, and audible playback require on-device verification.
