# Eval iteration 1 — react-remotion bundle

**Date:** 2026-05-16
**Scenario:** Build a 10-second Remotion video (1080×1080@30fps) with a
fade-in "Hello" title and three sequenced captions (one/two/three).
**Baselines:** `baseline` (empty cwd) vs `with_skillpack`
(`skillpack scaffold react remotion` already applied, no install).
**Agents:** two fresh-context `delegate` subagents spawned in parallel,
same prompt (`PROMPT.md`).

## Results

| Assertion                             | baseline | with_skillpack |
| ------------------------------------- | :------: | :------------: |
| Has `Root.tsx` with `<Composition>`   |    ✔     |       ✔        |
| Uses `useCurrentFrame()`              |    ✔     |       ✔        |
| `Hello` title appears in source       |    ✔     |       ✔        |
| One/two/three caption strings present |    ✔     |       ✔        |
| `pnpm typecheck` passes               |    ✔     |       ✔        |
| **Functional pass rate**              | **5/5**  |    **5/5**     |

Both runs produced working, typechecked Remotion compositions matching the
prompt. The interesting signal is **effort**, not outcome.

## Effort comparison

| Metric                              | baseline | with_skillpack |
| ----------------------------------- | -------: | -------------: |
| Files created by the agent          |        5 |              0 |
| Files modified by the agent         |        0 |              2 |
| Setup decisions made                |   many ¹ |           none |
| Files in final project (excl. deps) |        5 |            107 |

¹ Baseline had to choose: React version (picked 19), Remotion version
(picked 4.0.462), `tsconfig` shape (strict + jsx react-jsx + bundler
resolution), file layout (`src/index.ts` calling `registerRoot`,
`src/Root.tsx`, `src/HelloVideo.tsx`), `package.json` scripts
(`build`, `dev`, `typecheck`), and the registration pattern. None of
these decisions are wrong; they're just _cognitive load_ and _token
spend_ that the with_skillpack run skipped entirely.

The with_skillpack run's "edit 2 files" was specifically:

1. `src/video/Root.tsx` — bump `durationInFrames` 450→300 and set
   `defaultProps={{ title: 'Hello' }}`.
2. `src/video/MyVideo.tsx` — change scene timing to match the prompt's
   frame ranges, drop the existing decorative captions in favour of
   "one"/"two"/"three".

That's it. Everything else — Remotion+CLI+Player+Media deps installed,
`<Composition>` registered, in-app `<Player />` mounted, `video:render`
script, `remotion.config.ts`, base test passing, git initialised,
`AGENTS.md` primer, both `.claude/skills/` and `.pi/skills/` populated —
was already in place.

## What `with_skillpack` shipped that `baseline` did not

- **AGENTS.md** with project conventions + scripts + tree + manifest
  block. The agent read this first.
- **`.claude/skills/react-remotion/SKILL.md`** + the vendored
  `upstream/` tree (the Remotion team's own skill with 36 rule files).
  This is what gave the agent immediate domain knowledge with zero
  doc-fishing.
- **`.claude/skills/react/SKILL.md`** with React-in-this-project
  conventions (file layout, scripts, testing patterns).
- A working in-app preview at `<App />` via `<VideoPreview />` — the
  baseline had no preview path at all (would need to add Vite or
  rebuild that itself).
- Pinned, compatible Remotion 4.0.220+ versions (vs. baseline pulling
  latest 4.0.462, which is fine here but historically a source of
  breakage when Remotion ships breaking minors).
- A regression test (`src/App.test.tsx`) that passes.
- `git init` + initial commit (the baseline run produced an
  un-versioned tree).

## Caveats / limitations of this run

- Both runs were on `delegate` agents (parent-model inherited) — token
  counts and exact wall-clock durations were not surfaced by the
  subagent harness in this configuration. To get those, swap to
  Anthropic's vendored
  `skill-creator/scripts/run_eval.py` flow which emits
  `total_tokens` + `duration_ms` per task.
- **One eval, one iteration, one prompt** — this is a smoke result, not
  a benchmark. To be statistically meaningful: 3-5 prompts × 3 reruns
  each, then aggregate via
  `vendor/anthropic-skill-creator/scripts/aggregate_benchmark.py`.
- Both agents bypassed the project's `pnpm-workspace.yaml` correctly
  (used `--ignore-workspace`). When the eval workspaces are removed
  from inside the repo (e.g. moved to `/tmp/`), this won't be needed.
- The bundle-installed `node_modules/` in `with_skillpack` skews "files
  in project" — the 107 includes installed deps plus the upstream
  rule tree (~36 markdown files).

## What this tells us

Even on a **single, small prompt**, skillpack reduced the agent's
surface area from "decide everything + write 5 files" to "edit 2 files
to taste". That's the v0.1 thesis working as designed. The next eval
should:

1. Use longer, harder prompts (multi-scene reels with audio + captions
   - transitions — the kind where upstream rules like
     `audio-visualization.md` and `transitions.md` would _really_ save
     tokens).
2. Wire up Anthropic's `run_eval.py` for proper `total_tokens` +
   `duration_ms` capture.
3. Run ≥3 iterations per condition for a noise estimate.

Those are v0.2 work (DESIGN.md Q11c "users authoring skills get opt-in
evals"; we'll dogfood our own meta-skill on the bundled skills as
v0.2's release-gate).
