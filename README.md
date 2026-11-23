# SUNSET STATE

Open-world browser game (WebGL2, no build step). Original content — inspired by modern open-world games, family-friendly.

**Play:** open `index.html` through any static web server, e.g. `py -3 -m http.server 8765` and browse to http://127.0.0.1:8765/ (or `RUN_GAME_WINDOWS.bat`). GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml`.

## Stage 39 — Realism Core
- HDR physically based renderer, physical atmosphere, soft shadows, bloom, grading.
- Skinned human characters with procedural animation.
- Tyre-model driving with stability assist and handbrake drifts; faster on-foot movement.
- Rolling terrain, palm-lined streets, café terraces, neon, balconies, rooftops, lobby entrances, furnished interiors.

Details (Hebrew): `README_STAGE39_REALISM_HE.md`. Compare with the original renderer: `?realismOff=1`.
