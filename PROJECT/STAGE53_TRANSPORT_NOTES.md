# Stage 53 flight controls and island transportation

The airport flight deck gives the driver a throttle slider, hold-to-steer and hold-to-pitch buttons, and wheel brakes. It displays airspeed, height, climb rate, pitch, bank, and landing gear. Pointer and keyboard inputs work independently. Cancelling a touch or releasing its capture ends that input.

| Control | Aircraft action |
| --- | --- |
| **W / S** or slider | Increase or reduce throttle. The setting holds after release. |
| **A / D** or **← / →** | Steer on the runway or bank the airplane in flight. |
| **↑ / Shift** and **↓ / Ctrl** | Raise and lower the nose. |
| **F** | Toggle flaps. Deployed flaps support lower-speed flight and add drag. |
| **Space** | Apply wheel brakes on the ground. |
| **T / X** | Toggle taxi speed or, while stopped, pushback. |
| **C / L** | Cycle views or show runway alignment guidance. |
| **E / R** | Exit when stopped or return to an available runway position. |

On the runway, accelerate to the indicated speed and hold the pitch-up button or key. Use the landing guide to line up with the runway, lower throttle, and descend. The flap control denies deployment above 212 km/h. Landing gear still deploys automatically near the ground.

## Island travel

Open **M** to find the island pier markers. At a pier or helipad, press **B** or click the destination button. A ferry follows a navigable water route. Passenger helicopters rise from the departure pad, cruise across the city, and descend onto the destination pad. Press **E** after arrival to disembark.

Press **E** by a pier to board a manual boat. Use **W/S** to drive forward or back, **A/D** to steer, and **Space** to slow. Approach the next pier at low speed before pressing **E** to dock. Press **E** at a marked helipad to take the controls of its helicopter. Use **WASD**, **Space** to gain height, and **Shift** to descend. Press **E** while low and slow over the pad to land and get out.

The island transit routes use the existing geography. Ferry courses and manual navigation reject land and low bridge decks. Saves made during a trip resume on foot at the boarding location. Property islands can be visited through transit with or without ownership, and the existing property progression still controls construction.

`node QA/stage53_transport_acceptance.cjs` checks the real Game with simulated DOM and rendering, including pointer-controlled takeoff, connected ship routes, docking, passenger flight, and save/load. GPU rendering, audio playback, and on-device performance require separate verification.

## Private island vehicle storage

- The private island has a second working runway. Board one of the five parked airliners through its door at the mainland airport, then use the same cockpit controls to fly it to the island. Press **L** near the island for its approach markers. Runway recovery returns to the runway most recently boarded or landed on.
- After landing, brake with **Space** and taxi to the marked hangar apron. Stop beside a free bay and use **K** or the storage button. The mainland training dispatch remains available from the terminal.
- Take an existing public skiff and sail to the private pier. Brake with **Space**, stop by an available berth, and use **K**. The mainland harbor and public island piers offer passenger routes to the private island.
- Drive a stolen car to the mainland freight marker and stop. **B** opens the freight destination. The ferry transports the same car on its deck. After arrival, press **E** to unload onto the estate road, drive to the garage bays, stop, and use **K**.
- Each garage, hangar, and harbor starts with one bay. Estate upgrades raise that class's capacity to three and then five. **E** retrieves each stored vehicle through its normal boarding point.
- Storage updates the estate autosave. On loading a save made while using a stored car, return on foot to its estate bay where the stored car is available. When saving during a freight trip with a car outside storage, resume behind its wheel at the departure staging point.

The private-fleet acceptance scenario exercises the existing airport airframe, manual flight across the world, landing and taxi, manual island boating and braking, moving vehicle ferry, paid capacity, and Stage19 save/load with the original Game scripts and a simulated rendering surface.
