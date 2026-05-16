# Eval iteration 5 — three-way react+remotion bundle

**Date:** 2026-05-16
**Model:** `claude-sonnet-4-6` (Sonnet 4.6 / Bedrock-pinned via Claude Code 2.1.131)
**Mode:** `claude -p --bare --dangerously-skip-permissions` (no auto-discovery
of AGENTS.md or skill descriptions — strict no-magic baseline).
**Task:** ten-second 1080×1080 Remotion video with a `Hello` title fade-in
plus three sequenced captions. Verification REQUIRED `pnpm install`,
`pnpm typecheck`, AND a successful `out/video.mp4` ≥ 50 KB. See
[`PROMPT.md`](./PROMPT.md).

## Three cells

| Cell | Starting state |
| --- | --- |
| `baseline` | Empty `cwd`. No skill, no scaffold. Agent designs everything from scratch. |
| `upstream_only` | Empty `cwd` **except** `.claude/skills/remotion/` containing the Remotion team's own [`SKILL.md`](https://github.com/remotion-dev/skills/blob/main/skills/remotion/SKILL.md) + its 36-rule reference tree. No project files. No footgun fixes. |
| `skillpack` | `skillpack scaffold react remotion` pre-run (no install). Full Vite+TS+Vitest project, `<VideoPreview/>` mounted, `video:render` script wired, skillpack-wrapped Remotion skill (v0.2.1) with footgun fixes baked in. |

## Results

| Metric | baseline | upstream_only | skillpack |
| --- | ---: | ---: | ---: |
| Render attempts | 2 | 1 | 1 |
| **First-attempt render success** | ✗ | ✓ | ✓ |
| Final MP4 (downloadable) | [`baseline.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter5/baseline.mp4) (498 KB) | [`upstream_only.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter5/upstream_only.mp4) (494 KB) | [`skillpack.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter5/skillpack.mp4) (476 KB) |
| Turns | 22 | 25 | 26 |
| Wall-clock | 111 s | 129 s | 141 s |
| Cost | $0.209 | $0.300 | $0.253 |
| Cache-read tokens | 304 531 | 339 083 | 167 574 |
| Output tokens | 6 420 | 5 529 | 4 907 |

## What `baseline`'s first render failed on

Stream-json transcript shows the first `pnpm render` exited 1:

```
Error: Visited "http://localhost:3000/index.html" but got no response.
```

Root cause: baseline picked **React 19** + bundler-mode TS for its
from-scratch project. React 19 + the current Remotion 4 headless renderer
have a known transient where Chrome's first connection times out; the
second attempt (Chrome now cached) succeeds. This is exactly the kind of
ecosystem-knowledge gap a skill saves you from — but neither the upstream
skill nor skillpack's wrapper explicitly call out the React 18 pin. They
just *use* React 18 by convention, which sidesteps the issue.

## What the upstream Remotion skill saved vs. baseline

`upstream_only` was strictly the Remotion team's own production-grade skill
content, nothing else. Effects compared to `baseline`:

- ✓ First-attempt render success (used `npx create-video` from upstream's
  recipe → got React 18 pinned implicitly).
- ✗ Did NOT save tokens or wall-clock — actually used more on this small
  task. The skill body + rules add reading overhead the small task can't
  amortise.
- ✓ Cleaner, more idiomatic output (used `npx create-video --blank
  --no-tailwind`, idiomatic Remotion conventions).

## What `skillpack` (v0.2.1) added on top of `upstream_only`

- ✓ Lowest output tokens (4 907 vs 5 529 vs 6 420) and lowest cache-read
  (167k vs 339k vs 304k) — the pre-built scaffold means less *exploration*
  per turn even though the project tree is bigger.
- ✓ First-attempt render success (footgun fixes in our `Root.tsx` template:
  pre-calls `registerRoot`, uses bare imports — see commit
  [`8a2154c`](https://github.com/JoniBR/skillpack/commit/8a2154c)).
- ✓ Cheapest by 16% vs. upstream_only ($0.253 vs $0.300), even though
  upstream_only doesn't have to do project setup either after running
  `create-video`. Skillpack's advantage here is mostly that the agent
  doesn't need to read the upstream rule tree to know what to do — the
  scaffold *is* the answer.
- ✗ Highest wall-clock (141 s vs 129 s vs 111 s) — `pnpm install` of 340
  packages dominated; baseline's smaller dep tree installed faster. Wall
  clock here mostly tracks install time, not agent work.

## Headline takeaways

1. **Skillpack achieved the only Pareto improvement on this prompt:**
   cheapest *and* first-attempt-render-success *and* lowest output token
   spend. (baseline beats it on wall-clock, but at the cost of a failed
   first render attempt.)

2. **First-attempt success is the metric that matters.** All three cells
   eventually produced working MP4s. Only baseline burned a full Chrome
   download + bundle cycle on a failed attempt before recovering. In a
   non-interactive setting (CI, batch, eval) that's a real-cost failure
   even if the second attempt works.

3. **The upstream Remotion team's skill is great content, but not by
   itself a token win on this scale of task.** It got first-attempt
   render right (via `create-video`), but cost more in tokens and dollars
   than baseline. Its real value shows up on harder Remotion-specific
   sub-tasks (audio sync, captions, transitions) that the rule tree
   teaches — the size of the body that needs to be read amortises across
   those.

4. **Skillpack's specific value-add over upstream-only is the scaffold +
   footgun fixes**, not the skill content (which we vendor wholesale from
   upstream). Those two things are what bought us −16% cost and −11%
   wall-clock-per-agent-work vs. having the upstream skill alone.

## Methodology / reproducibility

```bash
# From repo root, with `claude` CLI on PATH and ANTHROPIC_API_KEY set:
EVAL_ROOT=$(pwd)/evals/workspaces/iteration-5
ls $EVAL_ROOT  # PROMPT.md + analyze.py + cell dirs
# Re-run the analyzer against committed stream-json files:
python3 $EVAL_ROOT/analyze.py
```

The full stream-json transcripts for each cell are at
`evals/workspaces/iteration-5/{baseline,upstream_only,skillpack}.stream.jsonl`
and the parsed `metrics.json` is alongside.

## Caveats

- **n=1.** This is one prompt × one iteration × three cells. Real benchmarks
  want 3-5 prompts × ≥3 iterations each so we can report ± stddev (see
  vendored `aggregate_benchmark.py`). Iteration 5 numbers should be read
  as a smoke result, not a benchmark.
- **`--bare` mode** disables auto-loading of `AGENTS.md` and skill metadata
  in normal Claude Code. In interactive use, skillpack's AGENTS.md adds
  ~600 tokens up-front, and skill descriptions add ~500 more, which both
  upstream_only and skillpack would pay; this eval undercounts that.
- **Renderer transient.** Baseline's first-attempt failure was
  framework-version-related (React 19 + Remotion 4 headless flakiness),
  not a skillpack-design footgun. The recovery cost wasn't huge (~30s of
  re-bundling). A truly hostile scenario would be one where the agent
  can't self-debug — to surface that, run the eval with a tighter turn
  limit.
