---
name: skillpack-boilerplate-creator
description: Author a brand-new skillpack boilerplate — the project skeleton (`base/`), the always-loaded base SKILL.md, and the entry-point markers that future skills will hook into. Use whenever the user wants skillpack to support a framework or starter it doesn't yet ship — for example "add a nextjs boilerplate to skillpack", "make skillpack support svelte", "create a new project starter for skillpack", "I want to scaffold solid-start through skillpack", "my framework isn't in skillpack yet — add it", "wrap the official astro starter as a skillpack boilerplate", "turn this Vite template into a skillpack boilerplate". This skill is ALSO auto-loaded by `skillpack-skill-migrator` when the migrator's `--to <bp>` target doesn't exist (DESIGN.md Q9c → B′): if you find yourself here from the migrator, build the boilerplate first, then hand control back. Do not confuse this with `skillpack-skill-creator`, which adds a skill on top of an *existing* boilerplate.
---

# skillpack-boilerplate-creator

A meta-skill for authoring new skillpack **boilerplates** — the bottom of
skillpack's hierarchy. Skills layer on top of boilerplates; a boilerplate
without a base is not a thing (DESIGN.md Q4: skills are namespaced under
their boilerplate, no sharing across boilerplates).

Your job, when this skill triggers, is to **end up with a working
boilerplate directory** — either as a local overlay at
`~/.skill-pack/boilerplates/<name>/` or, if the user wants to contribute
upstream, in a checkout of the `skill-pack` repo at
`boilerplates/<name>/`.

## What a skillpack boilerplate IS

A boilerplate is a directory with this contract:

```
boilerplates/<name>/
  boilerplate.json     # { schemaVersion, name, version, description }
  base/                # the actual project files (package.json, src/, configs)
  base-skill/
    SKILL.md           # always-loaded primer, frontmatter name: <bp-name>
  upstream/            # OPTIONAL: vendored canonical reference content
    SKILL.md
    references/
    VENDOR.md
    .vendor-commit
  skills/              # OPTIONAL: sub-skills shipped with the boilerplate
    <skill>/
      manifest.json
      SKILL.md
      files/
```

A boilerplate is **not** a skill. The difference, in one line: a boilerplate
defines the project shell and the markers; a skill plugs into those markers.
If the user says "add tanstack-query to react", that's a skill. If they say
"add nextjs to skillpack", that's a boilerplate. If ambiguous, ask.

Worked examples to read before writing anything:

- `boilerplates/react/` — minimal hand-rolled boilerplate (Vite + React +
  TS + Vitest, no `upstream/`).
- `boilerplates/slidev/` — boilerplate that vendors an official upstream
  agent skill into `upstream/` and points the base SKILL.md at it.

These two cover the two canonical shapes. New boilerplates are one or the
other.

## High-level loop

1. **Capture intent** — which framework? which entry-point file(s)? which
   markers will future skills need?
2. **Scaffold the skeleton** with the CLI.
3. **Fill `base/`** with a working starter. Canonical pattern: run the
   framework's own `npm init` / `create` command in a tmp dir and copy
   the output in — don't hand-author what upstream already maintains.
4. **Place skillpack markers** in entry-point files.
5. **Author `base-skill/SKILL.md`** — short (~60–100 lines), document
   markers + scripts + conventions.
6. **(Optional) Vendor `upstream/`** if the framework ships an official
   agent skill.
7. **Smoke-test** — install, build, test, dev-boot.
8. **Land** — overlay or upstream PR.

## Step 1 — Capture intent

Before touching any files, get clear answers to:

- **Name.** Short, kebab-case, the canonical name of the framework
  (`nextjs`, not `next-js-15`; `svelte`, not `sveltekit-app`).
- **What's the project shell?** Which `create-*` / `init` command produces
  the upstream canonical starter? (E.g. `pnpm create next-app`,
  `pnpm create svelte@latest`, `pnpm create vite -- --template solid-ts`.)
  If the user has no preference, default to the framework's first-party
  template.
- **What's the single entry-point file** future skills will need to mount
  into? For React it's `src/App.tsx`. For Slidev it's `slides.md`. For
  Next it'd be `app/layout.tsx` + `app/page.tsx`. Identify it now —
  marker placement depends on it.
- **Is there an upstream agent skill** maintained by the framework's
  authors (like slidevjs ships)? If yes, plan to vendor it under
  `upstream/`. If no, you'll write the conventions yourself in
  `base-skill/SKILL.md`.
- **Package manager.** skillpack assumes pnpm (DESIGN.md). Confirm the
  framework's starter works under pnpm; if it hard-requires npm or yarn,
  flag that in the boilerplate description.

If the user gave you a vague request ("add a backend boilerplate"),
narrow it: Hono? Express? Fastify? NestJS? Don't proceed until you have
a single, named target.

## Step 2 — Scaffold the skeleton

Run:

```bash
skillpack boilerplate scaffold --name <bp>
```

This creates `~/.skill-pack/boilerplates/<bp>/` with an empty
`boilerplate.json`, an empty `base/`, and an empty `base-skill/` directory
(stub `SKILL.md` inside). To contribute back to the upstream `skill-pack`
repo (PR later), pass `--into <path-to-checkout>/boilerplates/<bp>/`.

> Note: the `skillpack boilerplate scaffold` command is new in v0.3.
> If `skillpack --help` doesn't list it, you're on an older CLI — fall
> back to creating the directories by hand, matching the structure
> above exactly.

Fill in `boilerplate.json` immediately so the rest of the CLI sees the
boilerplate as registered:

```json
{
  "schemaVersion": 1,
  "name": "<bp>",
  "version": "0.1.0",
  "description": "<framework> starter scaffolded by skillpack, with markers wired into <entry-point>."
}
```

## Step 3 — Fill `base/` with a working starter

Do **not** hand-write `package.json` + configs from memory. Instead:

```bash
TMP=$(mktemp -d)
cd "$TMP"
# Run the framework's own init in a throwaway dir
pnpm create <framework> my-app   # or `npm init`, `npx create-…`, etc.
# Then copy the result into base/
cp -R my-app/. /path/to/boilerplates/<bp>/base/
```

Then in `base/`:

- Remove `.git/`, `node_modules/`, lockfiles you don't want to ship
  (`package-lock.json`, `yarn.lock`; **keep `pnpm-lock.yaml`** only if
  you want to pin), README files that are upstream-template-specific,
  and any `.env`/secrets.
- Replace `name` in `package.json` with a generic placeholder like
  `"skillpack-<bp>-base"`. The scaffolder rewrites this at consume time.
- Verify the project still installs and runs from a clean state (see
  Step 7 — Smoke-test).

## Step 4 — Place skillpack markers

Every boilerplate's primary entry-point file **must** contain at least
one named skillpack marker so future skills can insert imports and
content via `manifest.json`'s `markers[]` declarations. Without markers,
no skill can attach without overlaying the whole file (which the CLI
hard-errors on for collisions — see `skill-creator` SKILL.md).

**Naming convention:** lowercase identifier, prefixed `@skillpack:`,
embedded in whatever comment syntax the file uses.

**Recommended canonical marker names** (use these unless there's a
reason not to — consistency across boilerplates is what lets skill
authors target multiple boilerplates from muscle memory):

| Marker                  | Where it goes                                       | Used by skills to…                  |
| ----------------------- | --------------------------------------------------- | ----------------------------------- |
| `@skillpack:imports`    | Top of the entry file, after framework imports      | Append new `import` statements      |
| `@skillpack:mount`      | Inside the root component / render tree             | Insert top-level UI / routes / etc. |
| `@skillpack:providers`  | Just outside `@skillpack:mount`, wrapping the tree  | Wrap with context providers         |
| `@skillpack:routes`     | Inside a router config (where applicable)           | Register additional routes          |
| `@skillpack:plugins`    | Inside the bundler/framework config (vite, next…)   | Register build-time plugins         |
| `@skillpack:env`        | At the top of `.env.example`                        | Document required env vars          |

Use whichever subset makes sense for the framework. React uses
`@skillpack:imports` + `@skillpack:mount`. Slidev needs none in the
markdown deck (skills insert sibling files instead). Next.js will
likely want `@skillpack:imports` + `@skillpack:providers` in
`app/layout.tsx` and `@skillpack:routes` is moot (file-based routing).

Concrete shape, from `boilerplates/react/base/src/App.tsx`:

```tsx
import React from 'react';

// @skillpack:imports

export function App(): React.ReactElement {
  return (
    <main>
      <h1>Hello, world.</h1>
      {/* @skillpack:mount */}
    </main>
  );
}
```

Document every marker you place in `base-skill/SKILL.md` (see next step) —
skill authors discover markers by reading the base SKILL.md, not by
grepping `base/`.

## Step 5 — Author `base-skill/SKILL.md`

This SKILL.md is **always loaded** when a user scaffolds your boilerplate
— it's the project preamble. Keep it short (~60–100 lines). Structure:

1. **Frontmatter:** `name: <bp>` (no prefix — the boilerplate name is the
   skill name here), and a `description` that names the framework and
   describes when an agent should reach for these conventions while
   editing in this project.
2. **One-paragraph what-and-why** — what was scaffolded, why this layout.
3. **Project conventions** — entry file paths, where new components/
   routes/tests live, the markers you placed in Step 4 (named, with
   their exact location).
4. **Scripts table** — every `package.json` script and what it does.
5. **Testing / lint conventions** — runner, env, file naming.
6. **"When in doubt" pointer** — to `upstream/` if you vendored one;
   otherwise to the framework's own docs URL.

Use `boilerplates/react/base-skill/SKILL.md` as the template for the
no-upstream case, and `boilerplates/slidev/base-skill/SKILL.md` for the
vendored-upstream case.

## Step 6 — (Optional) Vendor an upstream agent skill

If the framework's authors maintain an official agent skill (Slidev does,
under `slidevjs/slidev/skills/slidev/`), vendor it rather than rewriting:

```
boilerplates/<bp>/upstream/
  SKILL.md           # the upstream-authored skill, copied verbatim
  references/        # progressive-disclosure deep-dives, copied verbatim
  README.md          # upstream README if present
  VENDOR.md          # attribution + license + upgrade instructions
  .vendor-commit     # the upstream commit SHA you copied from
  .vendor-source     # the upstream URL
```

Read `boilerplates/slidev/upstream/VENDOR.md` end-to-end — it's the
template. Critical bits to preserve:

- Upstream URL and exact commit SHA (in `.vendor-commit`).
- Original license file or text + copyright line.
- An "Upgrade" section with the exact commands to re-vendor.

At scaffold time, the scaffolder copies the boilerplate's `upstream/`
into the consuming project at `.claude/skills/<bp>/upstream/` (and
`.pi/skills/<bp>/upstream/`). The base SKILL.md should point at that
path explicitly so the agent knows where to load it from — see
`boilerplates/slidev/base-skill/SKILL.md`'s frontmatter for the wording.

If there is **no** upstream skill, skip this step entirely. Do not
fabricate an `upstream/` from generic docs scraped off the web — the
whole point is faithful attribution to authoritative content.

## Step 7 — Smoke-test (acceptance criteria)

Before declaring done, the boilerplate **must** pass this checklist on a
clean install. This is the v0.3 quality bar from DESIGN.md
OPEN-QUESTIONS. Treat any failure as blocking.

```bash
TMP=$(mktemp -d)
cd "$TMP"
skillpack scaffold <bp> --into ./test-app --pm pnpm
cd test-app

pnpm install            # MUST succeed
pnpm build              # MUST succeed (typecheck + bundle)
pnpm test               # MUST run cleanly (even if zero tests)
timeout 10 pnpm dev &   # MUST boot within 10 seconds without errors
sleep 10 && kill %1 2>/dev/null || true
```

Additionally, verify:

- The markers you placed in Step 4 are present in the scaffolded output
  (`grep -r '@skillpack:' test-app/`).
- A trivial skill can attach to one of them. Easiest check: write a
  one-marker `manifest.json` in `/tmp`, run `skillpack scaffold <bp>
  <fake-skill>`, confirm the insert lands at the marker site.
- `boilerplate.json` validates against the v1 schema (the CLI's
  `skillpack list boilerplates` will refuse to list it otherwise — use
  that as a free check).

If any of these fail, fix in `base/` and re-run from a fresh tmp dir.
Don't ship a boilerplate that fails its own smoke test; downstream skills
will all inherit the breakage.

## Step 8 — Land

- **Default (overlay):** the boilerplate is already at
  `~/.skill-pack/boilerplates/<bp>/`. It's immediately available to
  `skillpack scaffold <bp>` on this machine; it takes precedence over a
  same-named bundled boilerplate (with a warning) under the overlay
  registry rules (DESIGN.md Q10a → C tier 2).
- **Contribute upstream:** copy the directory into a checkout of the
  `skill-pack` repo at `boilerplates/<bp>/`, add a changeset, open a PR.
  Include the smoke-test transcript in the PR description.

Bump `version` in `boilerplate.json` semver-style on every meaningful
content change — same convention as skills.

## If you got here from the skill-migrator

The migrator hands off to you when its `--to <bp>` target doesn't exist
(DESIGN.md Q9c → B′). Do the full loop above, then return control: the
migrator will pick up at "the boilerplate now exists, scaffold the
migrated skill into it". Do **not** also try to create the skill — that's
the migrator's job. Build the boilerplate, smoke-test it, stop.

## A reminder about description triggering

The base SKILL.md's `description` frontmatter is what makes the agent
reach for the boilerplate's conventions while editing inside a scaffolded
project. Same rule as `skill-creator`: write pushy, enumerate concrete
phrasings. See `meta-skills/skill-creator/SKILL.md`'s closing section for
the worked good/bad example — the guidance applies identically here.

## When in doubt

Open both `boilerplates/react/` and `boilerplates/slidev/` side-by-side
and copy the shape that matches your case. Those two are the contract;
this file just describes the loop.
