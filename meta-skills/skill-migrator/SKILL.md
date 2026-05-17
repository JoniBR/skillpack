---
name: skillpack-skill-migrator
description: Convert an existing SKILL.md (a "general" or Claude-Code-style skill, an Anthropic skill-creator output, or any ad-hoc SKILL.md a user already has) into a proper skillpack skill that drops cleanly into a boilerplate. Use whenever the user says things like "convert my existing claude skill to skillpack", "migrate this SKILL.md", "turn this skill into a skillpack skill", "wrap this skill so I can `skillpack scaffold` it", "my skill works in claude code but not skillpack", "port this anthropic skill over", "make my SKILL.md compatible with skillpack", "I have a skill I wrote by hand, please packify it", or any time the user already has a SKILL.md file (theirs, a teammate's, or from another repo) and wants to use it through skillpack scaffolding. Trigger even if the user does not say the word "migrate" — the signal is "existing SKILL.md + wants skillpack". If the target boilerplate doesn't exist yet, this skill hands off to `skillpack-boilerplate-creator` first; if it exists, this skill drives the full inference → manifest → smoke-test → land loop.
---

# skillpack-skill-migrator

A meta-skill for turning a pre-existing SKILL.md (written for Claude Code,
Anthropic's skill-creator, or just by hand) into a fully-fledged skillpack
skill: `manifest.json` + overlay `files/` + marker insertions + boilerplate-
aware `SKILL.md`, living under `boilerplates/<bp>/skills/<name>/`.

This is the **inverse** of `skillpack-skill-creator`. The creator starts
from intent and ends at a skill. The migrator starts from a SKILL.md and
ends at the same place — but the manifest, file overlays, and dep list all
have to be **inferred from prose**, then confirmed with the user.

Per DESIGN.md Q9 this skill is explicitly **LLM-driven, not mechanical**:
read the source, propose a mapping, diff it, ask the user.

## High-level loop

1. **Locate + read the source SKILL.md** (and any sibling `references/`,
   `scripts/`, `assets/`, etc.).
2. **Pick the target boilerplate.** `--to <bp>` wins; otherwise infer from
   source content and propose.
3. **Scaffold the empty skill skeleton** with the CLI.
4. **Infer the manifest** — deps, file overlays, json patches, markers —
   from the source prose + assets. Show the diff. Confirm with user.
5. **Rewrite the SKILL.md** in skillpack house style (boilerplate-aware,
   marker-aware, progressive-disclosure).
6. **Smoke-test by scaffolding into `/tmp/`** and running typecheck +
   build + test.
7. **(Optional)** Run the eval loop against the original SKILL.md as
   baseline — does the migrated version do at least as well?
8. **Land** — overlay under `~/.skill-pack/skills/` (default) or
   `--contribute` into a checkout of the upstream repo.

## Step 1 — Locate and read the source

Get the absolute path to the source SKILL.md from the user. Then **read
everything next to it**:

```bash
SRC=/path/to/source/SKILL.md
ls -la "$(dirname "$SRC")"
```

You're looking for: `references/`, `files/` or `assets/`, `scripts/`,
`setup.sh`/`setup.ts`, an `evals/` directory, and a manifest of any kind
(`manifest.json`, `skill.yaml`, frontmatter-only). Read the SKILL.md
end-to-end before doing anything else — the prose is your spec.

Catalogue, in your head:

- **Frontmatter** — `name`, `description`, any `allowed-tools`, version.
- **Declared deps** — anything in code fences that looks like
  `npm install …`, `pnpm add …`, `yarn add …`, `pip install …`, a
  `package.json` snippet, or an import statement that implies a package.
- **File drops** — every fenced block prefixed with a path comment
  (`// src/foo.ts`, `# path: app/api/x.ts`) or any "create a file at …"
  prose. These become `files[]` entries.
- **Edits to existing files** — anything that says "add this to your
  `App.tsx`" / "register this in `vite.config.ts`" / "add this script to
  `package.json`". These become `markers[]` or `jsonPatches[]`.
- **Setup steps** — anything imperative that isn't a file edit (DB
  migrations, env-var prompts). These belong in `setup` (escape hatch).
- **References** — long-form material that should not live in the new
  SKILL.md body; goes under `references/`.

## Step 2 — Pick the target boilerplate

```bash
skillpack list boilerplates
```

- **If user passed `--to <bp>`**: that wins. Verify it exists in the
  listing; if not, fail fast and ask.
- **Else**: infer. Heuristics:
  - Imports `react`, `next/*`, `vite`, mentions `App.tsx`, `tsx` files →
    `react` (or `nextjs` if Next-specific APIs).
  - Mentions `app/` directory, `route.ts`, RSC, server actions → `nextjs`.
  - Pure-TS / Node CLI / no UI → `vite-vanilla-ts` or whichever
    framework-less boilerplate exists.
  - Server-only (Express, Hono, Fastify) → matching server boilerplate.
- **Surface your inference to the user** before committing. Format:

  > "Based on the imports of `react-dom/client` and the `App.tsx`
  > marker references, I'll target the **`react`** boilerplate. Other
  > plausible targets: `nextjs`. Say `--to nextjs` to switch."

- **If the inferred boilerplate doesn't exist** (`skillpack list
boilerplates` doesn't include it) → **stop and load
  `skillpack-boilerplate-creator`** (DESIGN.md Q9c → B′). Do the
  boilerplate creation flow first, then come back here.
- **If the source skill is non-React / non-web / clearly off-spectrum**
  (e.g. a PDF-processing Python skill) and no matching boilerplate
  exists, the same B′ branch applies — load `boilerplate-creator` and
  propose creating a new host boilerplate before migrating. Do not try
  to shoehorn it into `react`.
- **If two boilerplates are equally plausible**, ask. Don't guess
  silently. Present both choices with a one-line rationale each.

## Step 3 — Scaffold the empty skeleton

Once the target boilerplate is locked in:

```bash
skillpack skill scaffold \
  --boilerplate <bp> \
  --name <skill-name>
```

The skill name should be the same kebab-case canonical library name the
source skill used (strip `claude-`, `anthropic-`, `my-` prefixes if the
source had them — those don't belong in skillpack).

Default location: `~/.skill-pack/skills/<bp>/<skill>/`. To write straight
into a checkout of upstream `skill-pack` (for a PR), add
`--contribute <path-to-checkout>` — this writes into
`<checkout>/boilerplates/<bp>/skills/<name>/`. The default overlay wins
over bundled skills on name collisions (warning at scaffold time).

## Step 4 — Infer the manifest

This is the core of the migrator. Open `manifest.json` in the new skill
dir and fill it in by reading the source.

### `deps` / `devDeps`

Walk every code fence in the source SKILL.md + references. For each:

- Direct install commands → exact entries.
- Imports → look up the package, pick a range. Prefer **caret** ranges
  for actively-maintained libs, **exact pins** for libs with churny
  minors.
- TypeScript-only deps (`@types/*`) → `devDeps`.
- Anything the source pinned exactly → preserve the pin and note "source
  pinned this; review whether to loosen" in your diff explanation.

### `files[]`

For every fenced code block in the source that has a path hint, copy the
content into `files/<path>` under the skill dir and add an entry:

```json
{ "from": "files/<path>", "to": "<project-relative-path>" }
```

Existing assets next to the source SKILL.md (icons, JSON, templates) →
copy as-is into `files/`.

**Conflict rule:** two skills cannot overlay the same `to` path
(the CLI hard-errors). If the source skill rewrites a file the
boilerplate's `base/` already ships (e.g. `src/App.tsx`), it must become
a `markers[]` insertion instead.

### `jsonPatches[]`

Anything in the source that says "add this to package.json" →
`jsonPatches[]` against `package.json`. Same for `tsconfig.json`,
`vite.config.ts` JSON-ish bits, etc. These deep-merge; scalar conflicts
hard-error, so prefer additive scripts and arrays.

### `markers[]`

For every "add this to your existing X file" instruction:

1. Open the target boilerplate's `base/` and find the named marker.
   Boilerplates declare their markers in their own `SKILL.md`.
2. Translate the source's prose-y instructions into:

   ```json
   {
     "file": "src/App.tsx",
     "marker": "PROVIDERS",
     "insert": "<MyProvider>{children}</MyProvider>",
     "imports": ["import { MyProvider } from './my-provider';"]
   }
   ```

3. If the source assumes a marker that doesn't exist in the
   boilerplate's `base/`, you have two options:
   - Best: change the boilerplate's `base/` to add the marker (this is
     a boilerplate PR; load `skillpack-boilerplate-creator`).
   - Escape hatch: `setup` script that patches the file by regex. Mark
     this clearly in the manifest with a `// TODO: prefer marker` and
     surface it in the user-facing diff.

### `setup`

Only for genuinely imperative steps that can't be expressed
declaratively (DB migrations, interactive env prompts). If the source
SKILL.md was 80% imperative `bash` blocks, **most** of those should
collapse into `files[]` + `jsonPatches[]`; only the truly stateful
remainder belongs in `setup`. (Setup-script execution lands in
skillpack v0.2 — if you emit one before then, document it as a manual
follow-up in the new SKILL.md.)

### Show the diff, get confirmation

Before writing the final manifest, **print the proposed manifest** and
the file-by-file mapping table to the user, with your reasoning. The
user owns the final call; don't silently commit inferences.

## Step 5 — Rewrite SKILL.md in skillpack house style

The source SKILL.md is your spec; the new SKILL.md is for an agent
working **inside a project already scaffolded from the boilerplate**.
Differences:

- **Frontmatter `name` becomes `<bp>-<skill>`** (e.g. `react-tanstack-query`).
- **Description must be pushy** — enumerate concrete user phrasings.
  Lift the source's description as a starting point but rewrite for
  triggering. See `skillpack-skill-creator` for examples.
- **Drop install/setup instructions** — the manifest handles those. The
  agent reading this SKILL.md is post-scaffold.
- **Add a file layout table** of every path the skill touched (mirrors
  `files[]` + `markers[]`).
- **Keep API cheatsheet, common tasks, pitfalls** — these are the parts
  that carry over from the source mostly verbatim.
- **Move anything over ~300 lines** into `references/<topic>.md` and
  link with explicit "read this when …" guidance.
- **Target <150 lines** for the body.

## Step 6 — Smoke-test

```bash
TMP=$(mktemp -d)
cd "$TMP"
skillpack scaffold <bp> <skill> --into ./test-app --pm pnpm
cd test-app
pnpm typecheck
pnpm test --run || true
pnpm build
```

Typical migration failures:

- Source assumed a global install (`npm i -g foo`) → won't survive
  scaffolding; rewrite as a `devDeps` entry or a `setup` note.
- Marker insertion lacks imports → add `imports[]` to the marker spec.
- File overlay collides with `base/` → convert to a marker.
- `jsonPatches` scalar conflict (source overrides a script `base/`
  already defined) → either rename the script or drop the patch and
  document the collision.

Fix and re-run until clean.

## Step 7 — Optional: eval against the original

If the user wants quantitative validation that the migration didn't
regress quality, use the vendored Anthropic skill-creator eval loop
(see `vendor/anthropic-skill-creator/SKILL.md` end-to-end).

Two useful baselines for a migration specifically:

- **Original vs. migrated SKILL.md** (per-skill eval) — run the same
  prompts against an agent loaded with the source SKILL.md, and against
  one loaded with the new skillpack SKILL.md. The migrated version
  should be at least as good.
- **Manual install vs. `skillpack scaffold` (bundle eval)** — does
  starting from `skillpack scaffold <bp> <skill>` actually save time
  vs. the original "follow the SKILL.md by hand" flow?

Iterate on the new SKILL.md (and only the new SKILL.md — the manifest
should be stable by now) using grader feedback in
`<workspace>/iteration-N/feedback.json`.

## Step 8 — Land

- **Default (overlay):** the migrated skill lives at
  `~/.skill-pack/skills/<bp>/<skill>/` and is immediately usable via
  `skillpack scaffold <bp> <skill>` on this machine. It takes
  precedence over a same-named bundled skill (with a warning).
- **Contribute upstream:** if the source skill is broadly useful and
  the user owns / has permission to redistribute it, copy into a
  checkout of `skill-pack` at `boilerplates/<bp>/skills/<name>/`, add
  a changeset, open a PR. Preserve attribution from the source's
  frontmatter / LICENSE in a `NOTICE` file inside the skill dir if
  the source had its own license.

Bump `version` in `manifest.json` on every meaningful content change.

## Edge cases / footguns

- **Source SKILL.md is non-React / non-web.** Don't shoehorn. Either
  use a matching boilerplate or hand off to
  `skillpack-boilerplate-creator` to make one.
- **Source has no frontmatter description.** You'll have to synthesise
  one. Read the body, propose 3 candidate descriptions, let the user
  pick — and run the description optimiser afterwards
  (`vendor/anthropic-skill-creator/scripts/run_loop.py`).
- **Source is multi-file and recursive** (skills that reference other
  skills). Migrate the leaf skills first, then the composite, so the
  composite's manifest can list its dependencies as existing skillpack
  skills.
- **Two boilerplates are equally plausible.** Ask. Don't guess silently.
- **Source's `setup.sh` does network I/O at install time.** Strongly
  push the user toward making that lazy / on-demand instead of part of
  the manifest; scaffolding should be deterministic and offline-safe.

## When in doubt

Read `meta-skills/skill-creator/SKILL.md` for the creation-side
mechanics, and `vendor/anthropic-skill-creator/SKILL.md` for the
underlying eval loop. This migrator is a thin adapter on top of both.
