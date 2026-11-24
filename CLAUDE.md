# SUNSET STATE: Claude + Codex workflow

Family-friendly GTA-6-inspired WebGL2 browser game. Hero always wears a kippah and tzitzit. Stage 39+ work lives in `assets/stage39_*.js` and `stage42_streets.js` on top of `engine44.js`. Target hardware is an Intel UHD 730 iGPU, so GPU cost matters.

## Who does what

| Agent | Owns |
|---|---|
| Claude | Programming, game mechanics, physics, AI, system architecture, integration and merging |
| Codex (official `codex` plugin) | 3D modeling, graphics, shaders and visual improvements, QA and regression checks |

Codex is used through the plugin only (`/codex:rescue`, `/codex:review`, `/codex:status`, `/codex:result`). No custom integration. Runs on the existing ChatGPT subscription, never API credits.

## Worktrees (no shared working tree)

- Claude works in the main checkout (this folder, branch `main`, or a `claude/<topic>` branch).
- Codex works only in a worktree outside this folder: `..\_worktrees\codex-<topic>`, branch `codex/<topic>`.
  Example: `git worktree add -b codex/visual-qa ..\_worktrees\codex-visual-qa main`
- Start each Codex task from the worktree directory so its edits cannot touch Claude's files.
- Each side edits its own files. If both need the same file, Claude changes the code and Codex changes assets/visuals; the other side rebases afterwards.
- Never use bare `git stash` (shared across worktrees).

## Delegating to Codex

1. `/codex:rescue --background <task>` run with the Codex worktree as the working directory. Give it a bounded task, the files it may touch, and a definition of done.
2. Check progress with `/codex:status`, fetch the output with `/codex:result`.
3. Claude can keep working in the main checkout meanwhile.
4. Review Codex's diff yourself before merging. Never merge on Codex's word alone.

## Integration and regression (before every merge to `main`)

1. `git diff main...codex/<topic>`: confirm only the intended files changed.
2. Merge with `--no-ff` so the Codex work stays one visible unit.
3. Run `node QA/codex_syntax_check.cjs` (must print `0 failed`).
4. Run the browser QA relevant to the change (`QA/` scripts, `START_GAME.html`) when it touches rendering or gameplay.
5. Bump the `?v=` query on every changed script in `index.html` and `START_GAME.html`, or browsers keep stale copies.

## Rules that always apply

- Preserve all existing files and features. Add, don't delete. `BACKUPS/` is archive only.
- Commits: no global git identity is set, so use `git -c user.name="Sunset State" -c user.email="sunset-state@users.noreply.github.com"`.
- Delivery after each round: a full zip of the game (exclude `BACKUPS/`, `.git`, `.claude`, `_worktrees`). The user publishes to GitHub themselves.
- Windows notes: PowerShell blocks `.ps1` files (use `.cmd` or inline commands); Git Bash mangles the Hebrew profile path; make sure Node is on PATH.
- The Codex review gate (`/codex:setup --enable-review-gate`) stays off unless the user asks. It can burn usage limits.
