# skillpack

> **Skills as code, not docs.** Scaffold a project + curated skills in one
> command so the agent never has to rediscover the setup or the footguns.

> ⚠️ **POC, not a maintained tool.** I built skillpack to test whether
> agent skills work better as scaffolded code than as documentation. The
> [accompanying post](https://yonibraslaver.pages.dev/posts/skills-as-code/),
> the [iter-7 eval](./evals/workspaces/iteration-7/REPORT.md), and the
> design notes are the real artefact. The CLI works and the eval is
> reproducible — but I'm not actively maintaining or supporting it. If
> you want to take it forward,
> [open an issue](https://github.com/JoniBR/skillpack/issues) and I'll
> happily hand over context.

Most agent skills today are documentation: a `SKILL.md` that _tells_ the
agent which package to install, which version to pin, which footgun to
avoid. skillpack ships the answer instead — a working scaffold with the
right package versions, the right wiring, the known footguns _already
fixed in code_ — plus a small `SKILL.md` for the parts that genuinely
need agent judgement.

```bash
# Agent picks the boilerplate and skills it needs:
/skillpack react remotion       # available now
/skillpack react remotion recharts   # chart-driven animated reels
/skillpack slidev               # presentations (vendored slidevjs official skill ships automatically)
```

You get a ready-to-run project: dependencies installed, `Root.tsx` wired
the way the headless renderer actually expects, `AGENTS.md` primer that
auto-loads, per-skill bodies that load on demand.

**Status:** v0.x, real evals green. See [`DESIGN.md`](./DESIGN.md) for the
full design.

---

## When to reach for skillpack

skillpack is built for the case where you point an agent at **one focused
task** and want it to ship:

- _"Generate a 15-second product reel for our launch tomorrow."_
- _"Build me a 12-slide investor deck from this outline."_
- _"Run the cohort retention analysis on this CSV and produce a chart."_
- _"Scaffold a dashboard that polls this endpoint and graphs the latency."_

For tasks like these, the bottleneck is rarely the task itself — it's
the **task scaffold**. The agent needs to pick a framework, pin
compatible versions, dodge the well-known footguns, wire the entrypoints
the headless tooling expects, and _then_ start on the actual work. By
the time it has, half its turns and a third of its tokens are gone on
plumbing the user didn't ask about.

skillpack pre-pays that cost as a CLI command. The agent inherits a
working project and a small, tuned `AGENTS.md` primer, then spends its
turns on the task. In our eval, that translated to **−27% cost,
−28% output tokens, and −27% agent wall-clock** vs. the same agent
starting from the best docs-as-skill alternative — with the same
first-attempt render success rate.

skillpack is **not** the right tool when:

- The user is iterating on a long-running, multi-feature codebase —
  scaffold-once doesn't help here; you want a long-lived
  `CLAUDE.md`/`AGENTS.md` instead.
- The boilerplate you'd need doesn't exist yet — you can write one with
  `skillpack-boilerplate-creator` (v0.4), but for a one-off you'll
  probably just hand-bootstrap.
- The task is dominated by genuine domain reasoning (e.g. "design our
  retry policy"), not by setup. skillpack doesn't help with judgement
  work.

---

## Headline result — three-way Remotion eval

We pitted skillpack against two reasonable baselines on the same prompt:
build a 10-second Remotion video, verify with `install` + `typecheck` + a
successful headless render to MP4. **3 trials per cell**, fresh-context
`claude -p` (no `--bare`), `claude-sonnet-4-6`.

- **`no_skill`** — empty cwd, no skill, agent designs everything from scratch.
- **`remotion_skill`** — the Remotion team's own production skill
  (`SKILL.md` + 36-rule reference tree) installed at `.claude/skills/`.
  The best docs-as-skill you can buy.
- **`skillpack`** — `skillpack scaffold react remotion` runs first
  (timed), then `pnpm install` (timed), then the agent. AGENTS.md and the
  skillpack-wrapped Remotion skill auto-load.

| Cell           |  MP4 ✓   | 1st render |    Turns |    Tools |   Output tokens |               Cost | Agent time | Total time |
| -------------- | :------: | :--------: | -------: | -------: | --------------: | -----------------: | ---------: | ---------: |
| no_skill       |   100%   |    100%    |     13±2 |     12±2 |     2 794 ± 153 |     $0.210 ± 0.013 |      140 s |      140 s |
| remotion_skill |   100%   |    100%    |     18±3 |     16±3 |     3 411 ± 611 |     $0.262 ± 0.028 |      169 s |      170 s |
| **skillpack**  | **100%** |  **100%**  | **13±2** | **11±2** | **2 452 ± 779** | **$0.192 ± 0.034** |  **124 s** |      144 s |

**Skillpack is Pareto-optimal on every per-agent metric**: cheapest
(−9% vs no_skill, −27% vs remotion_skill), fewest output tokens, fewest
tool calls, fastest agent time. Total wall-clock including the
scaffold+install step (~17 s) is only 4 s slower than no_skill — those
17 s of setup pay for themselves in saved agent work.

Two surprises:

1. **The maintainer's own skill is the most expensive cell on this task.**
   `remotion_skill` succeeds first-try but spends 27% more dollars and
   36% more output tokens than skillpack. On a small task, the
   reading-overhead of a 36-file reference tree exceeds the work the
   skill saves.
2. **The tool-call mix tells the whole story.** `no_skill` does
   `Bash=7, Write=5.3` (creating from scratch). `remotion_skill` does
   `Bash=8.7, Write=3, Read=1.7, Edit=1.3, Skill=1` (still creating,
   plus the skill overhead). `skillpack` does
   `Read=4.7, Bash=3, Edit=1.3, Skill=1, Write=1` — **0 setup
   commands.** Just reads, edits, and uses the skill.

Canonical MP4s (trial-1 of each cell):
[`no_skill.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/no_skill.mp4) ·
[`remotion_skill.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/remotion_skill.mp4) ·
[`skillpack.mp4`](https://github.com/JoniBR/skillpack/releases/download/v0.1.0-evals-iter7/skillpack.mp4).

---

## Footgun fixes, shipped as code

A Remotion 4 project that's wired _almost_ right will typecheck happily,
run in the dev server happily, and then fail at headless render with
`Visited "http://localhost:3000/index.html" but got no response` (React 19
flake) or `this file does not contain registerRoot` (missing entry call) or
`MyVideo.js doesn't exist` (TS `.js` extension imports that webpack
doesn't honour).

The official Remotion skill dodges these by _telling_ the agent to run
`npx create-video`, which happens to pin React 18 and call `registerRoot`
for you — sidestepping the issues without ever naming them. The fix is
implicit; the next time `create-video`'s defaults change, the skill
breaks silently.

skillpack dodges them _explicitly_: the `react/remotion` scaffold's
[`Root.tsx`](./boilerplates/react/skills/remotion/files/src/video/Root.tsx)
calls `registerRoot` directly and uses bare imports
([commit 8a2154c](https://github.com/JoniBR/skillpack/commit/8a2154c)).
React version, renderer entrypoint, and module resolution are
**version-controlled in the boilerplate**, not in a sentence the agent
might or might not read.

The footgun lives in one place — the scaffold — and is fixed in code.
Not in a `SKILL.md` sentence the agent has to parse correctly on every
generation. Not in implicit transitive behaviour of a third-party CLI.
In code.

When upstream ships a fix to one of these, your scaffold inherits it;
every future generation gets it for free.

---

## The pitch

`skillpack` exists to move the median agent session towards "the agent
built the thing" and away from "the agent set up the project, ran out of
context, and asked the user to continue tomorrow."

How:

- **Bundled boilerplates** (`react`, later `nextjs`, `vite-vanilla-ts`) —
  one CLI command, deterministic output, offline-capable.
- **Boilerplate-scoped skills** (`react/remotion`, `react/recharts`, `react/satori`, …) —
  each skill knows the conventions of its host boilerplate. No leaky
  abstractions.
- **Footgun fixes shipped as code, not text.** When a skill's domain
  has a known sharp edge (React 19 + Remotion-headless, ESM/CJS
  mismatches, pinned peer-deps), the fix lives in the scaffold the
  agent inherits — not in a `SKILL.md` sentence the agent has to read
  correctly every time. When upstream ships a fix, your scaffold gets
  it, every future generation inherits it.
- **Progressive-disclosure `SKILL.md`s** — one tight `AGENTS.md` always
  loads; per-skill bodies load on demand; deep references load only if
  invoked.
- **Built-in eval loop** — vendors Anthropic's `skill-creator` evaluation
  machinery to measure with-skill vs. baseline tokens and duration, both
  per-skill and at the bundle level.

## Installation

All three packages are on npm; install whichever surface you prefer.

```bash
# Standalone CLI
pnpm add -g @skill-pack/cli   # or npm / yarn / bun — auto-detected at scaffold

# Claude Code plugin
/plugin marketplace add github.com/JoniBR/skillpack
/plugin install skill-pack

# pi extension
pi extension add @skill-pack/pi
```

The host plugins contribute three meta-skills (`skill-creator`,
`skill-migrator`, `boilerplate-creator`) and the `/skillpack` slash command.
Both shell out to the `skillpack` CLI on PATH, falling back to
`npx -y skillpack@<pinned>`.

## Usage

### Scaffold

```bash
skillpack scaffold react remotion
# → ./ if empty, refuses otherwise (use --into ./my-app to override)
# → installs deps with the PM you invoked it with (pnpm dlx → pnpm, bunx → bun, …)
# → writes .claude/skills/ and .pi/skills/
# → git init + initial commit
```

Flags:

| Flag                          | Default      | Meaning                                       |
| ----------------------------- | ------------ | --------------------------------------------- |
| `--into <path>`               | cwd if empty | Target directory.                             |
| `--no-install`                | install      | Skip `npm install`.                           |
| `--pm <pnpm\|npm\|yarn\|bun>` | auto         | Override package-manager detection.           |
| `--host <claude\|pi\|both>`   | both         | Which agent host(s) to write `SKILL.md`s for. |
| `--with-eval`                 | off          | After scaffolding, run the bundle eval.       |

### Prime a subagent

```bash
skillpack prime --boilerplate react --skills remotion
```

Emits a single primer string (project tree, depth-limited and gitignore-aware,
plus concatenated `SKILL.md` contents) to stdout. Pipe it into a subagent's
first user message to give it clean-context awareness without re-reading the
parent agent's history.

### List

```bash
skillpack list boilerplates
skillpack list skills react
```

## How a generated project looks

Everything below is what `skillpack scaffold react remotion` writes — no
further config required, no further generations to read this.

```
my-app/
├── AGENTS.md              # always-on primer: tree, scripts, skills installed, skillpack metadata
├── .claude/skills/
│   ├── react/SKILL.md
│   └── react-remotion/SKILL.md
├── .pi/skills/            # mirrors .claude/skills (cp, not symlink)
│   └── …
├── .skillpack/state/      # per-skill content hashes for lifecycle ops
│   ├── react.json
│   └── remotion.json
├── src/
└── package.json
```

The `AGENTS.md` primer carries a machine-readable manifest block:

```json
{
  "schemaVersion": 1,
  "skillpackVersion": "0.1.0",
  "boilerplate": {
    "name": "react",
    "version": "1.2.0",
    "contentHash": "sha256:…"
  },
  "skills": [
    {
      "name": "remotion",
      "version": "0.2.1",
      "contentHash": "sha256:…",
      "source": "bundled"
    }
  ]
}
```

…which is how `skillpack add/remove/upgrade` reason about what's already
installed in a project.

## Authoring your own skills

```
# Create a new skill scaffold under an existing boilerplate
skillpack skill scaffold --boilerplate react --name tanstack-query
# Then invoke the skill-creator meta-skill from your agent — it'll fill in
# the manifest, files, SKILL.md, and (optionally) run an eval loop on it.
```

By default, user-authored skills land in the **overlay** at
`~/.skillpack/skills/<boilerplate>/<skill>/` and are merged with the bundled
skills at scaffold time. On name collisions the overlay wins, with a warning.
Pass `--contribute` to write into a local clone of the upstream repo for PRs
instead.

The eval loop is a vendored fork of Anthropic's
[`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
(`vendor/anthropic-skill-creator/`, LICENSE preserved). It runs parallel
with-skill and baseline subagents, captures `total_tokens` and `duration_ms`,
grades against assertions, aggregates into `benchmark.json`, and opens an HTML
review viewer. Phase 2 ports it to TypeScript without changing the JSON
schemas.

## Repository layout

```
skillpack/
├── packages/
│   └── cli/                       # `skillpack` npm package (CLI + bundled core)
├── integrations/
│   ├── claude-code/               # publishable Claude Code plugin
│   └── pi/                        # publishable pi extension
├── boilerplates/                  # bundled into @packages/cli at build time
│   └── react/
│       ├── base/
│       └── skills/
│           └── remotion/
├── meta-skills/
│   ├── skill-creator/
│   ├── skill-migrator/
│   └── boilerplate-creator/
├── vendor/
│   └── anthropic-skill-creator/   # vendored Python eval scripts (LICENSE preserved)
├── evals/
│   └── bundles/                   # bundle eval scenarios for CI
├── DESIGN.md                      # full design doc (Q1–Q16)
├── spec.md                        # original brief
└── README.md                      # you are here
```

## Testing

Three tiers, runnable from `packages/cli/`:

```bash
pnpm test                # tier 1 + meta validators (~10 s, runs on every PR)
pnpm test:integration    # tier 2 per-skill (~5–15 min, real pnpm install + framework)
pnpm test:all            # both
```

| Tier                   | What                                                                                                                                                                                                                                    | Files                                                           | Cost     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| **1a Unit**            | Pure functions: schema, hash, json-merge, markers, pm, registry, overlay, agents-md, prime, fs-utils                                                                                                                                    | `src/<module>.test.ts` (10 files, 72 tests)                     | <1 s     |
| **1b CLI integration** | `scaffold` / `prime` / `list` / `skill scaffold` / `boilerplate scaffold` exercised as a library + via subprocess, real fs in tmp dirs                                                                                                  | `integration/cli/<cmd>.test.ts` (7 files, 34 tests)             | ~5 s     |
| **Meta validators**    | Walk repo: every manifest is valid; every SKILL.md has frontmatter; every `upstream/` has VENDOR.md + .vendor-commit + license/NOTICE; every marker target file actually has the marker; `npm pack --dry-run` ships expected files only | `integration/meta/<check>.test.ts` (8 files, 17 dynamic checks) | ~3 s     |
| **2 Per-skill**        | End-to-end: scaffold → `pnpm install` → framework verify (Remotion render, Satori og:generate, Slidev build, etc.)                                                                                                                      | `integration/skills/<combo>.test.ts` (6 files)                  | 5–15 min |

CI runs tiers 1 + meta on every PR (`pnpm test`). Tier 2 runs on push to
`main` and on `workflow_dispatch` only (cached Chrome + Playwright keep
it reasonable). See `.github/workflows/ci.yml`.

## What's actually shipped

The repo at HEAD has:

- **CLI** — `scaffold`, `prime`, `list`, `skill scaffold`,
  `boilerplate scaffold`.
- **Boilerplates** — `react`, `slidev`.
- **`react` skills** — `remotion`, `recharts`, `satori`.
- **Meta-skills** — `skill-creator`, `skill-migrator`, `boilerplate-creator`.
- **Eval harness** — vendored fork of Anthropic's `skill-creator` Python
  scripts; the iter-7 three-way eval that produced the headline numbers
  above lives at `evals/workspaces/iteration-7/`.
- **Tests** — 155 unit + CLI-integration + meta-validator tests, plus
  optional per-skill end-to-end tests (`pnpm test:integration`).

Lifecycle commands (`add` / `remove` / `upgrade`) and additional
boilerplates (`nextjs`, `vite`, `astro`) are sketched in `DESIGN.md` but
were out of scope for the POC.

## License

[MIT](./LICENSE). The vendored Anthropic `skill-creator` under
`vendor/anthropic-skill-creator/` remains under its original Apache-2.0
license (preserved as `LICENSE.txt` in that directory).

## Acknowledgements

The eval harness is a vendored fork of
[`anthropics/skills/skill-creator`](https://github.com/anthropics/skills).
Their `LICENSE.txt` is preserved under `vendor/anthropic-skill-creator/`.
