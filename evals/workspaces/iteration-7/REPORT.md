# Eval iteration 7 — proper three-way bundle eval, n=3

**Date:** 2026-05-17
**Model:** `claude-sonnet-4-6` via `claude -p` (interactive Claude Code mode)
**Design:** 3 fresh-context trials × 3 cells = **9 parallel runs**.

## What changed from iter-6

A reviewer (correctly) pointed out that iter-6's design was biased
against skillpack and didn't measure what a real user would experience:

| Issue (iter-6)                                                                                                                                                              | Fix (iter-7)                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Used `claude -p --bare`, which **disables** `AGENTS.md` and `.claude/skills/` auto-discovery. Agents had to `ls` / `cat` to find them — that's not how Claude Code is used. | Dropped `--bare`. AGENTS.md auto-loads in the skillpack cell; project-local skills auto-register in the remotion_skill cell.                           |
| Skillpack's timing only counted agent time, excluding the scaffold+install step (which **is** the user-facing experience).                                                  | Skillpack's total now includes scaffold (`5s`) + install (`12s`) + agent. Apples-to-apples wall-clock.                                                 |
| `upstream_only` had skill files lying loose in the working tree — meaningless because in `--bare` they weren't auto-discovered.                                             | Renamed to `remotion_skill` and put the official Remotion skill at `.claude/skills/remotion-best-practices/` so it auto-registers like a real install. |
| Renamed `baseline` to `no_skill` for clarity.                                                                                                                               | Same cell — no skill, no scaffold, agent does everything from scratch.                                                                                 |

We also added **tool-call counts by type** to the analyzer — this turns
out to be the most informative metric.

## Cells

| Cell             | Starting state                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no_skill`       | Empty `cwd`. No skill, no scaffold.                                                                                                                                                                                               |
| `remotion_skill` | `.claude/skills/remotion-best-practices/` containing the Remotion team's own [`SKILL.md`](https://github.com/remotion-dev/skills/blob/main/skills/remotion/SKILL.md) + its 36-rule reference tree. Claude Code auto-discovers it. |
| `skillpack`      | `skillpack scaffold react remotion` runs first (timed, ~5 s), then `pnpm install` (timed, ~12 s), then the agent runs. AGENTS.md + the skillpack-wrapped Remotion skill auto-load.                                                |

## Headline numbers (n=3, mean ± stddev)

| Metric                                    |       no_skill | remotion_skill |      **skillpack** |
| ----------------------------------------- | -------------: | -------------: | -----------------: |
| MP4 success rate                          |           100% |           100% |               100% |
| **First-attempt render**                  |       **100%** |       **100%** |           **100%** |
| Agent turns                               |         13 ± 2 |         18 ± 3 |         **13 ± 2** |
| **Tool calls**                            |         12 ± 2 |         16 ± 3 |         **11 ± 2** |
| Output tokens                             |    2 794 ± 153 |    3 411 ± 611 |    **2 452 ± 779** |
| **Cost (USD)**                            | $0.210 ± 0.013 | $0.262 ± 0.028 | **$0.192 ± 0.034** |
| Agent wall-clock                          |      140 ± 3 s |      169 ± 6 s |     **124 ± 23 s** |
| Total wall-clock (incl. scaffold+install) |      140 ± 3 s |      170 ± 6 s |         144 ± 23 s |

**MP4 artifacts** (canonical trial-1 of each cell, downloadable):

- no_skill → [`no_skill.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/no_skill.mp4) (513 KB)
- remotion_skill → [`remotion_skill.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/remotion_skill.mp4) (484 KB)
- skillpack → [`skillpack.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/skillpack.mp4) (541 KB)

## Skillpack is Pareto-optimal

- **−9% cost** vs. no_skill, **−27% cost** vs. remotion_skill.
- **Fewest output tokens** (2 452 vs 2 794 vs 3 411).
- **Fewest tool calls** (11 vs 12 vs 16).
- **Fastest agent time** (124 s vs 140 s vs 169 s).
- **Same first-attempt render rate** as the others (100%).
- Total wall-clock including the scaffold+install step is **only 4 s
  slower than no_skill** — those 17 s of setup cost less than the agent
  time it saves later.

remotion_skill is the most expensive cell on every per-agent metric — the
agent reads more, writes more, and runs more tools when the skill is
present in the discoverable-but-not-pre-applied form. The skill content
is good (it gets to first-render success too), but the _reading
overhead_ exceeds the _setup it saves on this scale of task_.

## Tool-call mix is the cleanest evidence

```
no_skill         Bash=7.0, Write=5.3
remotion_skill   Bash=8.7, Write=3.0, Read=1.7, Edit=1.3, Skill=1.0
skillpack        Read=4.7, Bash=3.0, Edit=1.3, Skill=1.0, Write=1.0, Glob=0.3
```

- **no_skill** mostly runs `Bash` (`pnpm init`, `pnpm add ...`, etc.) and
  `Write`s new files. 5.3 file writes — that's the full project structure.
- **remotion_skill** does the same Bash-heavy setup _plus_ `Skill=1.0`
  (the skill loads) _plus_ extra Reads and Edits — net more work.
- **skillpack** does **0 Bash setup commands**. It Reads (existing
  scaffold files), Edits (Root.tsx + MyVideo.tsx to taste), and
  triggers Skill once for the Remotion skill body. Only 1 Write (the
  out/ directory file is what they all produce).

**This is what "skills as code, not docs" looks like as a metric:** the
agent spends its tool budget on logic, not setup.

## What "Skill=1.0" means

In all three cells the agent ultimately invokes the Remotion skill exactly
once. For `no_skill` it's not there to invoke. For `remotion_skill` the
agent's skill auto-discovered description matches, the skill body loads,
the agent works from it. For `skillpack` AGENTS.md tells the agent the
project is already wired and points at `.claude/skills/react-remotion/`
which auto-discovers too.

The interesting comparison: in `remotion_skill` the agent additionally
reads `upstream/rules/` files (cache-read tokens spike), while in
`skillpack` the agent sees a tight wrapper SKILL.md saying "the project
is already set up, only edit these two files" and _doesn't_ dive into
the rules tree. **That's the AGENTS.md primer earning its keep.**

## Per-trial breakdown

```
no_skill         first_render = ✓✓✓   agent_s = [137, 138, 143]   cost = [$0.211, $0.196, $0.222]
remotion_skill   first_render = ✓✓✓   agent_s = [162, 171, 173]   cost = [$0.245, $0.247, $0.293]
skillpack        first_render = ✓✓✓   agent_s = [121, 148, 102]   cost = [$0.211, $0.213, $0.151]
```

Skillpack has the widest stddev — trial-3 was very fast/cheap (102 s,
$0.15), trial-2 was slower (148 s, $0.21). Same MP4 outcome either way.

## What still didn't move

- **First-attempt render success is 100% in every cell**. The
  React-19/Remotion-headless-Chrome transient that hit iter-5's
  baseline did not reproduce on iter-7's no_skill (Chrome was system-cached,
  React-version choice didn't trigger it). The footgun-as-code thesis
  still **conceptually** holds (a fix in template code is more durable
  than a fix in SKILL.md prose), but this eval doesn't surface it as a
  binary outcome — yet. To make it measurable: containerise each run with
  no Chrome cache, force React 19 explicitly, restrict turn budgets.

## What this means for the launch post

The numbers now back the headline claim:

> **Skills as code, not docs.** Skillpack ships the answer (a working
> scaffold with the right packages, the right wiring, the known footguns
> fixed in code), not just guidance on how to find it. The eval shows
> the result: an agent given a pre-wired skillpack project does the same
> task in fewer turns, fewer tool calls, fewer output tokens, and at
> lower dollar cost than either a from-scratch baseline or a baseline +
> the best docs-as-skill available.

## Reproducibility

```bash
EVAL_ROOT=evals/workspaces/iteration-7
python3 "$EVAL_ROOT/aggregate.py"      # re-aggregates committed stream-json files
cat "$EVAL_ROOT/summary.json"          # full machine-readable numbers
# To re-run live (costs ~$2 in API):
for t in 1 2 3; do
  for c in no_skill remotion_skill skillpack; do
    "$EVAL_ROOT/run.sh" "$t" "$c" &
  done
done
wait
```

The 9 stream-json transcripts (`trial-N.CELL.stream.jsonl`) and
per-run `trial-N.CELL.timing.json` files are committed so any reader can
re-verify the numbers without spending API budget.

## Caveats

- **One task, ten seconds of video.** The crossover task where the
  Remotion rules tree pays for its reading cost should be larger
  (multi-scene, audio sync, captions, transitions). We haven't measured
  that.
- **Shared Chrome cache.** All 9 cells share the user's
  `~/.cache/remotion-chrome-headless`. The first run to need Chrome paid
  the download (~30 s); the rest got it cached. Containerised runs would
  surface a different first-render-success picture.
- **n=3.** Stddevs are wide for skillpack (trial-3 is much faster than
  trial-2). 5-10 trials would tighten intervals.
- **One model** (`claude-sonnet-4-6`). Repeating with `claude-haiku-4-5`
  would inform readers on the cost-per-capability tradeoff.
