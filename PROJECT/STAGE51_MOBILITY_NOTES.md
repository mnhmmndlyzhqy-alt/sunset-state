# Stage 51 mobility

## Pilot the SKYLINE 320

Open the map with **M** and find **שדה תעופה · טיסה עצמאית** at the airport terminal. Walk to the turquoise marker and press **E** to board the aircraft at the runway. After landing, you can also reboard beside the aircraft door.

| Control | Action |
| --- | --- |
| **W / S** | Increase or reduce throttle. The setting holds when you release the key. |
| **A / D** or **← / →** | Steer on the ground. Bank and turn in flight. |
| **↑** or **Shift** | Raise the nose. Build speed on the runway and then use this input to lift off. |
| **↓** or **Ctrl** | Lower the nose. Touch controls include a hold-to-descend button. |
| **Space** | Brake on the ground. |
| **C** | Toggle normal and wide chase views. |
| **E** | Exit once the plane is on the ground and stopped. |
| **R** | Return the aircraft to the runway while seated. |

To land, line up with the runway, reduce throttle, and use **↓** to descend. The airplane lowers its gear automatically near the runway. An aligned approach at a moderate speed gets a small flare assist near the surface. Brake after the wheels touch down, then exit. The airplane returns to the runway after a collision, an unsafe touchdown, or a trip beyond the map boundary.

Saves made in the cockpit resume on foot at the original boarding point. The existing save format retains the parked car and other progress. Takeoffs and landings are transient. Restarting or loading restores the aircraft to its parking position.

## Steering

At parking and city speeds, the steering rack has more travel and reacts sooner. The increase tapers out near 36 m/s, and the existing high-speed yaw limits remain in effect. The new rack response applies to the driven car through the existing realism physics installer.

## Verification

`node QA/stage51_mobility_acceptance.cjs` runs the actual game scripts with a simulated DOM and renderer. It checks low and medium speed steering against Stage 50, high-speed stability, airport access, taxiing, takeoff, banking, cockpit save fallback, landing, braking, exit, existing ambient air traffic, camera, and collision recovery. The game’s authored SKYLINE 320 remains the primary model, with the original flight geometry used while the model loads or on fallback renderers. Browser pixels and GPU performance require on-device verification.
