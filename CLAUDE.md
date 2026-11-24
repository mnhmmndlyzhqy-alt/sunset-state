# SUNSET STATE: Claude + Codex team procedure

Family-friendly GTA-6-inspired WebGL2 browser game. Hero always wears a kippah and tzitzit. Stage 39+ work lives in `assets/stage39_*.js` and `stage42_streets.js` on top of `engine44.js`. Target hardware is an Intel UHD 730 iGPU, so GPU cost matters.

This file records a procedure that was run end to end on 2026-11-24 (Codex shader audit and Claude integrity check in parallel, integrated with zero conflicts). Steps marked VERIFIED were observed working; do not skip them.

## Who does what (Codex is OPT-IN: only when the user asks for it)

**Default: Claude works alone on everything, including 3D, graphics, shaders and visual QA.** The split below applies only in a request where the user explicitly asks for Codex / GPT-6.2. Silence about Codex means no Codex. See `~/.claude/CLAUDE.md`.

| Agent | Owns |
|---|---|
| Claude | Programming, game mechanics, physics, AI, system architecture, integration, merging |
| Codex (official `codex@openai-codex` plugin) | 3D modeling, graphics, shaders, visual quality, visual QA |

**Delegation trigger (only when the user asked for Codex in this request).** Claude then hands the 3D modeling, meshes, graphics, shaders, lighting or post-processing, visual quality or visual QA part to Codex in the background and keeps working on the code part in the Claude lane. Say it in one line ("Delegating X to Codex in lane Y") and start. Even then, do not delegate trivial one-line edits or anything that needs the running game in a browser to judge. Never delegate on your own initiative, and a past request to use Codex does not carry over.

**Which path works.** The direct companion runtime below is VERIFIED. The plugin's `codex:codex-rescue` subagent (and so `/codex:rescue`) is loaded in the session but FAILED its probe on 2026-11-24 with `node: not found` (exit 127): that session's shell PATH predates the Node install. After the Claude app is restarted, retry one read-only `codex:codex-rescue` probe and update this line; until then delegate through the companion runtime directly.

Only the official plugin and its `codex-companion.mjs` runtime are used. No custom Codex integration, no API credits (ChatGPT login via `codex login`). The Codex review gate stays OFF.

## Lanes: persistent worktrees (VERIFIED)

Repo root is this folder (branch `main`). Lanes live outside it so zips never include them:

| Lane | Path (relative to this folder) | Used by |
|---|---|---|
| Codex lane | `..\_worktrees\codex-visual-qa` | Codex only |
| Claude lane | `..\_worktrees\claude-lane` | Claude only |

- Each task gets its own branch inside a lane: `git -C <lane> checkout -b codex/<topic> main` (lane must be clean and its previous branch already merged). Never reuse a lane for two live tasks.
- **Verify before any edit.** Run `git -C <lane> rev-parse --show-toplevel` and `git -C <lane> branch --show-current`. The toplevel must be the lane path and the branch must start with `codex/` (Codex lane) or `claude/` (Claude lane). Anything else: stop.
- Codex prompts must begin with the same guard (print toplevel + branch, stop if wrong). VERIFIED: Codex printed both values in its answer.
- Never edit game files in the main checkout while a lane task is open. Never use bare `git stash`.

## Delegating to Codex through the companion runtime (VERIFIED)

Resolve the runtime (the version folder changes on plugin updates):

```powershell
$comp = (Get-ChildItem "$env:USERPROFILE\.claude\plugins\cache\openai-codex" -Recurse -Filter codex-companion.mjs | Select-Object -First 1).FullName
```

Node must be on PATH (a tool started before Node was installed needs `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`).

1. **Preflight before EVERY delegation (global policy in `~/.claude/CLAUDE.md`):** `node "$env:USERPROFILE\.claude\codex-preflight.cjs" --cwd <codex-lane> [--effort xhigh]`. It must print `PREFLIGHT: OK` (model `gpt-6.2-sol`, effort `high`, ChatGPT account). Exit 1 means do not launch. A `WARN` about 90%+ usage means light tasks only and ask the user before anything heavy. Also confirm once per session that `node $comp setup --json` shows `"ready": true` and `loggedIn: true`.
2. **Write the prompt to a file outside the repo** (long prompts break shell quoting): guard step, exact files Codex may create or modify, a definition of done, "do not touch anything else".
3. **Launch in the background, inside the lane:**
   `node $comp task --background --write --cwd <codex-lane> --model gpt-6.2-sol --effort high --prompt-file <prompt.txt> --json`
   Always pass `--model gpt-6.2-sol --effort high` explicitly (`--effort xhigh` only for a very complex task; never astra, spark or another model without the user's explicit approval; no automatic fallback to a weaker model). It returns a `jobId` immediately. `--cwd` is accepted although the usage text omits it. VERIFIED: the detached worker keeps running after the launching shell exits.
4. **Collect the result automatically (no slash command, no relaying).** Start a waiter as a background shell command so Claude is notified on completion:
   `node $comp status <jobId> --wait --timeout-ms 900000 --poll-interval-ms 3000 --cwd <codex-lane> --json`
   (Bash/PowerShell tool with `run_in_background: true`.) VERIFIED: the completion notification arrived by itself, and the JSON showed `status: completed`.
5. **Fetch the output:** `node $comp result <jobId> --cwd <codex-lane>`. VERIFIED: returns Codex's final answer plus a `codex resume <session-id>` line.
6. **Pitfall: job state is per git worktree.** `status`, `result` and `cancel` only see jobs of the worktree given by `--cwd` (state lives in `%TEMP%\codex-companion\<lane>-<hash>`). Always pass the same `--cwd` that launched the job, or you will see "no jobs".
7. `status <jobId> --cwd <lane>` shows live `running`/`phase`/`elapsed`; `cancel <jobId> --cwd <lane>` stops a job. If a detached background job ever dies with its shell, fall back to running `task --write --cwd <lane> ...` (no `--background`) as a background shell command and read its stdout.
8. A harmless `DEP0190` deprecation warning prints to stderr from the companion. Ignore it.

Codex does not commit. Claude commits Codex's files on the Codex branch, with `Co-Authored-By` and the job id in the message.

## Concurrent work (VERIFIED)

Launch the Codex job first, then do Claude's own task in the Claude lane while it runs. In the test, Claude's commit (19:51:31 local) landed while Codex's job was still `running` (started 19:50:39, finished 19:52:27).

## Integrate and test safely (VERIFIED)

1. **Inspect both diffs.** `git diff --name-status main...claude/<topic>` and `main...codex/<topic>`: only the intended files; the two file lists must not overlap. Spot-check Codex's claims against the source (line numbers, counts) and re-run its script: it must be deterministic and must not modify tracked files.
2. **Dry-run conflicts:** `git merge-tree --write-tree --name-only main <branch>` per branch.
3. **Throwaway integration worktree:** `git worktree add -b integration/test ..\_worktrees\integration-test main`, merge `claude/<topic>` then `codex/<topic>` with `--no-ff`, check `git diff --diff-filter=U` is empty.
4. **Regression suite** (all must pass, from the integration worktree and again on `main`):
   - `node QA\codex_syntax_check.cjs`: every `.js` parses (expect `0 failed`, 138 files at 2026-11-24)
   - `node QA\game_integrity_check.cjs`: every script tag in `index.html` and `START_GAME.html` exists, is non-empty and parses (100 scripts each); it fails on a missing or broken script (negative-tested)
   - `node QA\shader_audit.cjs`: static GLSL audit, regenerates `QA\SHADER_AUDIT_REPORT.md` (informational, exits 0)
   - Browser QA (`QA\` scripts, `START_GAME.html`) when a change touches rendering or gameplay. The scripts above are static only.
5. **Existing files intact:** compare `git ls-tree -r` before and after; every baseline entry must be unchanged (only additions allowed), and `BACKUPS/` and `assets/` counts must match.
6. **Promote:** `git merge --ff-only integration/test` in the main checkout, re-run the regression suite there, then `git worktree remove` the throwaway (leave the shell's working directory outside it first, or Windows refuses with "Permission denied") and `git branch -d integration/test`.
7. Re-running `shader_audit.cjs` makes git show `QA/SHADER_AUDIT_REPORT.md` as modified from line-ending conversion only (`git diff --numstat` is empty). Restore it with `git checkout -- QA/SHADER_AUDIT_REPORT.md`.
8. After integrating, move each lane to a fresh branch from `main` before the next task.

## Rules that always apply

- Preserve all existing files and features. Add, don't delete. `BACKUPS/` is archive only.
- Commits: no global git identity is set, so use `git -c user.name="Sunset State" -c user.email="sunset-state@users.noreply.github.com"`.
- Bump the `?v=` query on every changed game script in `index.html` and `START_GAME.html`, or browsers keep stale copies.
- Delivery after each round: a full zip of the game (exclude `BACKUPS/`, `.git`, `.claude`, `_worktrees`). The user publishes to GitHub themselves.
- Windows: PowerShell blocks `.ps1` files (use `.cmd` or inline commands); Git Bash mangles the Hebrew profile path; no Python-based or Node-based tool may be assumed on a tool's PATH without the refresh above.
- Do not bypass permission prompts. Codex runs with the plugin's default sandbox (`--write` = workspace-write, confined to its lane).
