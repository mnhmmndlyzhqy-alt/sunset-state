# Stage 53 residents and grounded dialogue

`stage53_resident_ai.js` augments the existing sidewalk and StreetLife systems. The engine calls observation after danger prediction, conversation holding before specialist jobs, and ordinary decisions before the existing StreetLife advance. Specialist flight crew, home residents, story contacts, witnesses, prison actors and gang behavior retain their earlier owners. Authored island residents use their own safe routes and share the identity and voice event interfaces.

Five deterministic personality profiles weight social, errand and rest needs. Local visits reserve existing open venue slots. Decisions inspect at most 18 nearby venues, 42 slots and 12 neighbor candidates; they do not run a global path search. Obstructed destinations are rejected, and a newly blocked final approach releases its reservation. The existing movement system owns the actual walk. Conversations suspend a task and resume it on close. Panic interrupts ordinary behavior, followed by a brief recovery period. Social encounters expire and do not hold citizens indefinitely.

The base walker call now passes its timestep as `dt`. Existing recovery wrappers also accepted the old `simDt` spelling, so this change is not evidence that the earlier complete build lacked pedestrian movement.

`stage53_resident_dialogue.js` answers from actual estate state: approved identity, assigned apartment, agreed rent and installed services. It does not execute purchases or modify a lease through free text. The existing sentence bank, persona and session name-memory remain the fallback. Chat48 accepts current public-island and estate actors, and rejects a removed or replaced actor. Door, vehicle and transport interaction priority is retained.

The nine newly authored island candidates have stable appearance bits consistent with their names and derived voice profile. Original model and recording files remain unchanged.

Verification: `QA/stage53_resident_ai.cjs` exercises the actual Game and walker code; `QA/stage53_dialogue_acceptance.cjs` checks live estate dialogue, original name memory, current-world membership and the real effect-ducking methods. `QA/stage53_estate_world_acceptance.cjs` checks island routines, dialogue holding, vehicle avoidance and return to the assigned home route. These are simulation and command checks using a simulated display and audio surface, not listening or browser pixel validation.
