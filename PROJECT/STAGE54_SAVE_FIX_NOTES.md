# Stage 54 save fixes

- A declined offer keeps its original reason when upgrades make the applicant eligible or another tenant signs for the apartment. New refusals record which required services were missing. Earlier saves retain their reason and show a general message for missing services.
- When a rent or maintenance payment falls during a door transition, the estate saves the new wallet balance and payment clocks as soon as the transition clears.
- Loading a stolen car removes the copy spawned in its original parking spot. A save from before the theft preserves the original parking spot.

Run the estate and fleet regressions from the game directory.

```sh
node --test --test-concurrency=1 QA/stage54_save_regressions.cjs QA/stage53_estate.cjs QA/stage53_navigation_save.cjs QA/stage53_private_fleet_acceptance.cjs
```

All 15 tests passed. The run covered three new save regressions, five estate finance tests, six navigation and autosave tests, and a private-fleet scenario with 38 checks. The save fixture for the transition case starts an actual building-entry animation, crosses the payment boundary, and loads the resulting autosave. The tests use the packaged game logic and a simulated display, inputs, and browser storage. Browser rendering and real-device performance were outside this verification.
