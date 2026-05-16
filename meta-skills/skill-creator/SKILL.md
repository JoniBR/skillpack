---
name: skillpack-skill-creator
description: Create a new skillpack skill under an existing boilerplate, draft its manifest + SKILL.md + files, and optionally run the evaluation loop (Anthropic skill-creator machinery, vendored) to validate it. Use whenever the user wants to add a new library/integration as a reusable skillpack skill — for example "add a tanstack-query skill to the react boilerplate", "make a stripe skill", "wrap shadcn/ui as a skill", "I keep installing zustand by hand, turn that into a skillpack skill". This is the bridge between an ad-hoc idea and a packaged skill that future agents can apply in one command.
---

# skillpack-skill-creator

A meta-skill for authoring new skillpack skills with evaluation built in.

A "skill" in skillpack is a directory under
`boilerplates/<boilerplate>/skills/<name>/` containing:

```
manifest.json    # deps, file overlays, json patches, marker insertions
SKILL.md         # frontmatter + agent-facing instructions (progressive disclosure)
files/           # files to overlay into the user's project
references/      # deeper docs loaded on demand by the consuming agent
```

Your job, when this skill triggers, is to **end up with a working,
evaluated skill in the right directory**. The agent does the design work;
the CLI does the file scaffolding.

## High-level loop

This is fundamentally the Anthropic skill-creator loop (vendored under
`v/anthropic-skill-creator/`), retargeted at skillpack's directory
structure. The loop is:

1. **Capture intent** — what library/integration is this? Which boilerplate
   is it for? What does success look like?
2. **Scaffold the skill skeleton** with the CLI.
3. **Author the manifest + SKILL.md + files**.
4. **Smoke-test by scaffolding into `/tmp/`** and verifying it produces a
   working project.
5. **(Optional, recommended) Run the evaluation loop** — parallel
   with-skill vs. baseline subagents on realistic prompts, capture tokens
   - duration + grading, iterate on feedback.
6. **Land** — either as a local overlay under `~/.skill-pack/skills/` (the
   default), or as a contribution to the upstream repo (`--contribute`).

## Step 1 — Capture intent

Before doing any work, get clear answers to:

- **Boilerplate.** Which boilerplate is the host? (`skillpack list
boilerplates` to see options.) If the user names a boilerplate that
  doesn't exist, switch to the `skillpack-boilerplate-creator` skill
  first (DESIGN.md Q9c → B′).
- **Skill name.** Short, kebab-case, the library's canonical name when
  possible (`tanstack-query`, not `react-query-v5`).
- **What does this skill enable?** Describe in 1-2 sentences.
- **When should it trigger?** Concrete user phrasings — these will inform
  the `description` frontmatter, which is the _primary_ triggering
  mechanism for agents picking skills.
- **Compatibility constraints.** Does this require a specific Node
  version? A specific bundler? Note in `SKILL.md`'s preamble.

If the user gave you a vague request ("add charts"), narrow it: which
chart library (`recharts` vs `chart.js` vs `visx`)? Static vs animated?
Don't proceed until you have a single, named target.

## Step 2 — Scaffold the skeleton

Run:

```bash
skillpack skill scaffold --boilerplate <bp> --name <skill>
```

By default this creates `~/.skill-pack/skills/<bp>/<skill>/` with an empty
`manifest.json`, a stub `SKILL.md`, and empty `files/` and `references/`
directories. To contribute back to the upstream `skill-pack` repo
(opens a PR later), pass `--into <path-to-checkout>/boilerplates/<bp>/skills/<skill>/`.

The default overlay location wins over bundled skills on name collisions
(with a warning printed at scaffold time) — see DESIGN.md Q10a.

## Step 3 — Author the manifest

Open `manifest.json`. Fill in:

- **`deps` / `devDeps`** — exact npm packages and version ranges. Prefer
  caret ranges for actively-maintained libraries, exact pins for libraries
  where minor releases regularly break.
- **`files[]`** — every file you'll drop into the user's project. Source
  goes under `files/` in the skill directory; `to` is the project-relative
  path. Two skills cannot overlay the same `to` path (the CLI hard-errors)
  — use markers or `setup.ts` if you need to compose with another skill.
- **`jsonPatches[]`** — `package.json` scripts you want to add, `tsconfig`
  options, etc. These deep-merge; scalar conflicts hard-error.
- **`markers[]`** — insertions into existing source files (like `App.tsx`)
  at named markers. Each marker spec is `{ file, marker, insert, imports? }`.
  The base boilerplate's `SKILL.md` lists which markers are available.
- **`setup`** — optional escape-hatch script path. Avoid unless declarative
  steps genuinely cannot express what's needed. (Setup-script execution
  lands in skillpack v0.2.)

## Step 4 — Author SKILL.md

The dropped `SKILL.md` is the user-project's agent-facing documentation
for this skill, loaded **on demand** (progressive disclosure). Keep it
under ~150 lines. Structure:

1. **Frontmatter** — `name: <bp>-<skill>` and a _pushy_ `description` (see
   Anthropic's guidance: "Make sure to use this skill whenever the user
   mentions X, even if they don't explicitly ask for 'X'"). The
   description is the primary triggering mechanism.
2. **One-paragraph what-and-why** — what library, why it matters in this
   boilerplate.
3. **File layout table** — every path this skill touches, with its role.
4. **Scripts added** — anything new in `package.json`.
5. **Core API cheatsheet** — 5-10 snippet-sized usage patterns.
6. **Common tasks** — recipes for the 3-5 most likely follow-up requests
   ("add a second composition", "swap the data source", etc.).
7. **Pitfalls** — actual footguns, not generic advice.
8. **References pointer** — "see `references/X.md` for deeper coverage of Y."

For longer reference material (>300 lines), put it in
`references/<topic>.md` and link from `SKILL.md` with explicit guidance
on when to read.

## Step 5 — Smoke-test

Before evaluating, sanity-check that the skill produces a working project:

```bash
TMP=$(mktemp -d)
cd "$TMP"
skillpack scaffold <bp> <skill> --into ./test-app --pm pnpm
cd test-app
pnpm typecheck
pnpm test
pnpm build
```

Fix any failures before moving to evaluation. Typical failures:

- Marker insertion didn't add the import → check `markers[].imports`.
- TypeScript can't find module → check the dep version + `tsconfig` paths.
- Vite refuses to start → check the skill didn't break the base `vite.config.ts`.

## Step 6 — Evaluation loop (recommended)

Adapted from Anthropic's skill-creator (vendored at
`vendor/anthropic-skill-creator/`). Two baselines matter for skillpack
(DESIGN.md Q11b):

- **Per-skill eval.** Run the same task with the SKILL.md present vs.
  absent. Tests whether the SKILL.md you wrote actually helps the agent.
- **Bundle eval.** Run the same task in an empty cwd (agent has to set
  up everything from scratch) vs. starting from
  `skillpack scaffold <bp> <skill>`. Tests whether the _whole package_
  (boilerplate + skill + AGENTS.md) saves the agent time and tokens.

For the per-skill loop, follow Anthropic's vendored instructions
verbatim — read
`vendor/anthropic-skill-creator/SKILL.md` for the full walkthrough. The
key mechanics:

1. Save 2-3 realistic test prompts to `<skill-dir>/evals/evals.json`.
2. Spawn parallel subagents in the same turn: one with the skill path,
   one without (or with the previous iteration). Save outputs to
   `<workspace>/iteration-N/eval-K/{with_skill,without_skill}/`.
3. Capture `total_tokens` + `duration_ms` from each task notification
   into `timing.json`. _This is the only opportunity to capture this
   data._
4. Spawn a grader subagent reading
   `vendor/anthropic-skill-creator/agents/grader.md` to evaluate each
   assertion; save to `grading.json`.
5. Aggregate:
   ```bash
   python -m vendor.anthropic_skill_creator.scripts.aggregate_benchmark \
     <workspace>/iteration-N --skill-name <bp>-<skill>
   ```
6. Open the viewer:
   ```bash
   python vendor/anthropic-skill-creator/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "<bp>-<skill>" \
     --benchmark <workspace>/iteration-N/benchmark.json
   ```
7. Read `feedback.json`, improve, iterate.

For the bundle eval, the only changes are: (a) baseline is "empty cwd, no
scaffold" rather than "no skill", and (b) you measure the full session
including the scaffold command itself, since that's part of what we're
selling.

## Step 7 — Land

- **Default (overlay):** the skill is already at `~/.skill-pack/skills/<bp>/<skill>/`.
  It's immediately available to `skillpack scaffold` on this machine; it
  takes precedence over a same-named bundled skill (with a warning).
- **Contribute upstream:** if the skill is generally useful, copy it into
  a checkout of the upstream `skill-pack` repo at
  `boilerplates/<bp>/skills/<name>/`, add a changeset, and open a PR.

Bump the skill's `version` in `manifest.json` semver-style on every meaningful
content change — the content hash is the source of truth for drift detection,
but the version is what humans read in CHANGELOG.

## A reminder about description triggering

Currently agents tend to **undertrigger** skills — i.e. they don't reach for
the right skill when they should. Combat this by writing pushy descriptions
that enumerate concrete user phrasings:

> Bad: `"Adds Stripe checkout to the project."`
>
> Good: `"Add Stripe checkout, subscriptions, billing portal, or webhook
handling to this Next.js project. Use whenever the user mentions
Stripe, billing, payments, subscriptions, paywalls, or 'taking
money', even if they don't explicitly name Stripe. Includes the
webhook route, the Checkout session helper, the customer-portal
link, and TypeScript types for products/prices."`

After the eval loop has converged on a SKILL.md you're happy with,
optionally run Anthropic's description optimiser
(`vendor/anthropic-skill-creator/scripts/run_loop.py`) — it generates
20 realistic trigger prompts, asks for your sign-off, then iterates the
`description` frontmatter against train/held-out splits.

## When in doubt

Read `vendor/anthropic-skill-creator/SKILL.md` end-to-end. The mechanics
described there are the proven baseline; this file only documents how
skillpack remaps the directory layout and adds a bundle-level baseline.
