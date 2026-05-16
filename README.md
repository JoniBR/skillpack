# skillpack

> Scaffold a working project + a curated set of agent skills in one command, so
> the agent can spend its tokens on application logic instead of setup.

```bash
# Agent picks the boilerplate and skills it needs:
/skillpack react remotion confetti
```

`skillpack` drops a ready-to-run project into your cwd — dependencies installed,
git initialised, and a small `AGENTS.md` primer plus per-skill `SKILL.md` files
that load on demand. The agent reads what it needs, when it needs it. No more
burning a fifth of the context window on "how do I wire up Remotion again?"

**Status:** v0.1 in progress. See [`DESIGN.md`](./DESIGN.md) for the full
design and [`spec.md`](./spec.md) for the original brief.

---

## The pitch

The spec asks: *"eval tokens used and time with and without"* setup boilerplate.
That's the whole product thesis. `skillpack` exists to move the **median agent
session** towards "the agent built the thing" and away from "the agent set up
the project, ran out of context, and asked the user to continue tomorrow."

How:

- **Bundled boilerplates** (`react`, later `nextjs`, `vite-vanilla-ts`) — one
  CLI command, deterministic output, offline-capable.
- **Boilerplate-scoped skills** (`react/remotion`, `react/confetti`, …) — each
  skill knows the conventions of its host boilerplate. No leaky abstractions.
- **Progressive-disclosure `SKILL.md`s** — one tight `AGENTS.md` always loads;
  per-skill bodies load on demand; deep references load only if invoked.
- **Built-in eval loop** — vendors Anthropic's `skill-creator` evaluation
  machinery to measure with-skill vs. baseline tokens and duration, both
  per-skill and at the bundle level.

## Installation

> v0.1 not yet published. Once released:

```bash
# Standalone CLI
pnpm add -g skillpack         # or npm / yarn / bun — auto-detected at scaffold

# Claude Code plugin
/plugin marketplace add github.com/JoniBR/skillpack
/plugin install skillpack

# pi extension
pi extension add @skillpack/pi
```

The host plugins contribute three meta-skills (`skill-creator`,
`skill-migrator`, `boilerplate-creator`) and the `/skillpack` slash command.
Both shell out to the `skillpack` CLI on PATH, falling back to
`npx -y skillpack@<pinned>`.

## Usage

### Scaffold

```bash
skillpack scaffold react remotion confetti
# → ./ if empty, refuses otherwise (use --into ./my-app to override)
# → installs deps with the PM you invoked it with (pnpm dlx → pnpm, bunx → bun, …)
# → writes .claude/skills/ and .pi/skills/
# → git init + initial commit
```

Flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--into <path>` | cwd if empty | Target directory. |
| `--no-install` | install | Skip `npm install`. |
| `--pm <pnpm\|npm\|yarn\|bun>` | auto | Override package-manager detection. |
| `--host <claude\|pi\|both>` | both | Which agent host(s) to write `SKILL.md`s for. |
| `--with-eval` | off | After scaffolding, run the bundle eval. |

### Prime a subagent

```bash
skillpack prime --boilerplate react --skills remotion,confetti
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

### Lifecycle (v0.2)

```bash
skillpack add tanstack-query        # add a skill to an already-scaffolded project
skillpack remove confetti           # reverse the safe parts; print a checklist for the rest
skillpack upgrade --detect          # warn when project's recorded versions are stale
```

All lifecycle commands require a clean git tree (`--force` overrides). The
initial scaffold's `git init` provides this for free.

## How a generated project looks

```
my-app/
├── AGENTS.md              # always-on primer: tree, scripts, skills installed, skillpack metadata
├── .claude/skills/
│   ├── react/SKILL.md
│   ├── react-remotion/SKILL.md
│   └── react-confetti/SKILL.md
├── .pi/skills/            # mirrors .claude/skills (cp, not symlink)
│   └── …
├── .skillpack/state/      # per-skill content hashes for lifecycle ops
│   ├── react.json
│   ├── remotion.json
│   └── confetti.json
├── src/
└── package.json
```

The `AGENTS.md` primer carries a machine-readable manifest block:

```json
{
  "schemaVersion": 1,
  "skillpackVersion": "0.1.0",
  "boilerplate": { "name": "react", "version": "1.2.0", "contentHash": "sha256:…" },
  "skills": [
    { "name": "remotion", "version": "0.4.1", "contentHash": "sha256:…", "source": "bundled" },
    { "name": "confetti", "version": "0.2.0", "contentHash": "sha256:…", "source": "bundled" }
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

## Roadmap

- **v0.1** — CLI (`scaffold`, `prime`, `list`); `react` boilerplate with
  `remotion` skill; vendored eval harness; `skill-creator` meta-skill; both
  host integrations; one bundle eval scenario in CI.
- **v0.2** — `confetti` and `tanstack-query` skills; `skillpack add/remove`
  and `upgrade --detect`; `skill-migrator` meta-skill.
- **v0.3** — `nextjs` and `vite-vanilla-ts` boilerplates;
  `boilerplate-creator` meta-skill; overlay registry.
- **Phase 2** — remote community registry resolver; TypeScript port of the
  vendored Python; real `skillpack upgrade` with diff-and-reapply; schema
  migrations as needed; signed/sandboxed community `setup.ts`.

## License

TBD (likely Apache-2.0 to match the vendored Anthropic scripts' licensing).

## Acknowledgements

The eval harness is a vendored fork of
[`anthropics/skills/skill-creator`](https://github.com/anthropics/skills).
Their `LICENSE.txt` is preserved under `vendor/anthropic-skill-creator/`.
