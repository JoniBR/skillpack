# skillpack — Design Document

> Companion to `spec.md`. Captures decisions made during the design interview.
> Project name: **skillpack** (formerly "sandpack" in the original brief).

## One-paragraph summary

`skillpack` is a plugin + CLI that lets agents scaffold a working project + a set
of focused, on-demand **skills** in a single command, so the agent can spend its
tokens on application logic instead of setup. The headline metric is **tokens and
wall-clock time, with vs. without `skillpack`**, measured on realistic prompts
using a vendored fork of Anthropic's `skill-creator` evaluation harness.

---

## Decisions (Q1–Q16)

### Q1 — Invocation surface

**Decision: Skill-first, with a slash command wrapper, both backed by a deterministic CLI.**

- The primary artifact is a _skill_ the agent loads when it decides to scaffold.
- A `/skillpack` slash command is sugar over the same CLI.
- The CLI (`skillpack`) does all filesystem work — no LLM in the scaffold path,
  keeping it deterministic and testable.

### Q2 — Template source & distribution

**Decision: Hybrid — bundled core sandpacks + remote registry for community ones.**

- Core boilerplates ship inside the `skillpack` npm package (fast, offline,
  deterministic for evals).
- A `sandpack.registry.json` resolver will later support remote
  (`degit`-style) fetch for community sandpacks, cached at
  `~/.skillpack/cache/`.
- Resolver is designed as `resolveSandpack(name)` so swapping in remote is a
  one-function change.

### Q3 — Where the generated project lands

**Decision: cwd by default, `--into <path>` override.**

- `/skillpack react remotion` scaffolds into cwd if empty.
- If cwd is non-empty and no `--into` is given, **refuse and ask** — never
  silently create a subdir.
- No tmp dirs (breaks evals + project context loading).
- No magic global workspace.

### Q4 — Hierarchy semantics

**Decision: Skills are namespaced under their boilerplate. No sharing across boilerplates.**

A `react/threejs` skill is fully independent from any `nextjs/threejs`. Layout:

```
skillpack/
  boilerplates/
    react/
      base/                  # template files + base SKILL.md
      skills/
        remotion/
          SKILL.md
          files/             # files to overlay/add
          manifest.json      # deps, post-install, file patches
        confetti/
    nextjs/
      base/
      skills/
        auth/
        prisma/
```

Unknown skill under a given boilerplate → hard error, list available.

### Q5 — Skill manifest format

**Decision: Declarative manifest + optional `setup.ts` escape hatch.**

```json
{
  "schemaVersion": 1,
  "version": "0.4.1",
  "deps": { "remotion": "^4" },
  "devDeps": {},
  "files": [{ "from": "files/MyVideo.tsx", "to": "src/MyVideo.tsx" }],
  "jsonPatches": [
    {
      "file": "tsconfig.json",
      "merge": { "compilerOptions": { "jsx": "react-jsx" } }
    }
  ],
  "skillMd": "SKILL.md",
  "setup": "setup.ts"
}
```

Bundled core skills may use `setup.ts` freely. Future remote registry will
require signing or sandboxing of `setup.ts`.

### Q6 — Where the dropped `SKILL.md` lands

**Decision: Write both `.claude/skills/<name>/SKILL.md` and `.pi/skills/<name>/SKILL.md`.**

- Each skill gets its own directory (no merging into one giant file).
- Content is identical between the two locations; copy, don't symlink.
- `--host pi|claude` narrows output if the user is host-locked.
- **Plus** a CLI **context-primer mode**:

  ```
  skillpack prime --boilerplate react --skills remotion,confetti [--project ./path]
  ```

  Emits a single primer string (project tree + concatenated SKILL.md
  contents + scaffold header) to stdout, suitable for piping into a
  subagent's first user message. Lets a parent agent spawn clean-context
  subagents without re-reading its own history.

### Q7 — Package manager detection + install

**Decision: Auto-detect with lockfile → `$npm_config_user_agent` → fallback order; install by default.**

- Detection order: lockfile walking up → `$npm_config_user_agent` → first
  available of `pnpm > npm > yarn > bun`.
- For fresh scaffolds (empty cwd) `$npm_config_user_agent` is the primary
  signal: `pnpm dlx skillpack ...` → pnpm, `bunx skillpack ...` → bun, etc.
- Install runs by default. `--no-install` skips for fast scaffolds / evals.

### Q8 — Skill ordering & file-conflict resolution

**Decision: Marker insertions in CLI arg order; declarative steps run before `setup.ts`.**

Execution pipeline per scaffold:

1. Copy `boilerplates/<name>/base/` → project.
2. For each skill in CLI arg order: apply `files` (overlay).
3. Merge all `deps`/`devDeps` into `package.json`; merge all `jsonPatches`.
4. For each skill in CLI arg order: apply marker insertions.
5. For each skill in CLI arg order: run `setup.ts`.
6. Install deps (Q7).
7. Write `.claude/skills/` and `.pi/skills/` SKILL.md files.
8. `git init` + initial commit (Q14 precondition).

Conflict rules:

- Two skills overlay (`files`) the same `to` path → **hard error**. Author
  must use markers or `setup.ts`.
- `jsonPatches` deep-merge; conflicting scalar values → **hard error**.
- Marker insertions append in CLI arg order. Different argument order is
  permitted to produce different output (predictable, not commutative).

Base templates use named markers, e.g.:

```tsx
function App() {
  return <>{/* @skillpack:mount */}</>;
}
```

### Q9 — `skill-migrator` behavior

**Decisions:**

- **Q9a → B (LLM-driven inference).** The migrator skill instructs the agent
  to read the source SKILL.md + target boilerplate's `base/`, draft a full
  manifest + `setup.ts` + new SKILL.md, show a diff, ask the user to confirm.
- **Q9b → C (explicit `--to` wins, else agent inspects and proposes).** Agent
  uses `skillpack list boilerplates` and explains its choice.
- **Q9c → B′.** If target boilerplate doesn't exist, the migrator **loads the
  `boilerplate-creator` skill** and runs that flow first.

v1 ships **three first-class authoring skills**:

- `skillpack-skill-creator` — author a new skill under an existing boilerplate.
- `skillpack-skill-migrator` — convert a general skill into a skillpack skill.
- `skillpack-boilerplate-creator` — author a new boilerplate (`base/` + base
  SKILL.md) from scratch.

### Q10 — `skill-creator` behavior

**Decisions:**

- **Q10a → C.** Default writes go to a user-scoped overlay at
  `~/.skillpack/skills/<boilerplate>/<skill>/`. `--contribute` writes into a
  local checkout of the upstream repo for PRs. Overlay resolution: bundled +
  overlay are merged at scaffold time. On name collision, **overlay wins with
  a warning** (option b in the original decision).
- **Q10b → B (LLM-driven authoring).** User describes the feature in prose;
  agent reads `base/`, drafts a complete manifest + `setup.ts` + SKILL.md,
  shows diff for confirmation. CLI provides `skillpack skill scaffold
--boilerplate react --name <skill>` to create the empty skeleton.
- **Q10c → i + ii + iii for v1.** Validate: manifest schema, SKILL.md
  frontmatter, referenced `files/` exist. Dry-scaffold + typecheck is
  deferred to a later `skillpack lint`.

### Q11 — Eval integration (Anthropic skill-creator)

**Decisions:**

- **Q11a → A now, B in Phase 2.** Vendor Anthropic's `skill-creator/scripts`,
  `agents/`, `eval-viewer/`, `references/` under
  `vendor/anthropic-skill-creator/` with LICENSE preserved. Phase 2 ports
  the Python to TS; JSON schemas (`evals.json`, `benchmark.json`,
  `grading.json`, `feedback.json`) stay identical so workspaces remain
  readable across the port.
- **Q11b → C (both axes).** Per-skill eval (with-skill vs. no-skill) catches
  skill quality regressions. **Bundle eval** (full scaffold vs. empty cwd) is
  the spec's headline metric — that's what justifies the project to users.
- **Q11c → C.** Always available; opt-in (`--with-eval`) for users authoring
  their own skills; mandatory for the meta-skills in our own CI.

### Q12 — Packaging & install

**Decisions:**

- **Q12a → A (monorepo, pnpm workspaces, changesets).**
- **Q12b → A (`npx skillpack` is canonical).** No bundled binaries — Node is
  already a dep since we scaffold JS projects.
- **Q12c (host integrations):**
  - Claude Code: `.claude-plugin/marketplace.json` at the repo root + plugin
    directory contributing the three meta-skills + `/skillpack` slash command.
    `/plugin marketplace add github.com/<org>/skillpack` → `/plugin install skillpack`.
  - pi: `package.json` with `pi.extension` section, contributing the same
    meta-skills + a pi prompt-template for `/skillpack`.
  - Both shell out to `skillpack` on PATH, falling back to
    `npx -y skillpack@<version-pinned-in-extension>`.
- **Q12d → C.** Bundle core boilerplates in the CLI package; lazy-fetch
  community sandpacks into `~/.skillpack/cache/`.

Monorepo layout:

```
skillpack/
  packages/
    cli/                       # `skillpack` npm package (CLI + core boilerplates)
  integrations/
    claude-code/               # publishable plugin
    pi/                        # publishable extension
  boilerplates/                # bundled in @ packages/cli at build time
  meta-skills/
    skill-creator/
    skill-migrator/
    boilerplate-creator/
  vendor/
    anthropic-skill-creator/   # vendored Python (LICENSE preserved)
  evals/
    bundles/                   # bundle eval scenarios for CI
```

### Q13 — SKILL.md content shape

**Decisions:**

- **Q13a → C.** Each per-skill SKILL.md is <150 lines: (1) project
  conventions / file layout, (2) curated 5–10 snippet cheatsheet, (3) pointers
  to `references/` for the long tail. Progressive disclosure is the reason
  this beats "just `npm create vite` + read the docs" on tokens.
- **Q13b → C.** A project-root `AGENTS.md` is the always-on primer (scaffold
  provenance, scripts, tree, list of installed skills with one-liners).
  Per-skill SKILL.md files load on demand.
- **Q13c → C.** Hand-curate SKILL.md for bundled core skills (the showcase).
  `skill-creator` drafts user skills; the eval loop polishes them. Use
  Anthropic's `run_loop.py` for description-frontmatter triggering tuning.

**`AGENTS.md` template** emitted at scaffold time:

```md
# Project: <name>

Scaffolded by skillpack: `react` + `remotion`, `confetti`.

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm test` — vitest

## Tree

<auto-generated, depth 3, gitignore-aware>

## Skills installed

- **react** — project conventions, routing, component patterns. See `.claude/skills/react/SKILL.md`.
- **remotion** — programmatic video components, `<Composition>` registry at `src/Root.tsx`. See `.claude/skills/react-remotion/SKILL.md`.
- **confetti** — `canvas-confetti` mounted via `useConfetti()` at `src/hooks/useConfetti.ts`. See `.claude/skills/react-confetti/SKILL.md`.

## Skillpack metadata

<!-- skillpack:manifest -->

{
"schemaVersion": 1,
"skillpackVersion": "0.1.0",
"boilerplate": { "name": "react", "version": "1.2.0", "contentHash": "sha256:..." },
"skills": [
{ "name": "remotion", "version": "0.4.1", "contentHash": "sha256:...", "source": "bundled" },
{ "name": "confetti", "version": "0.2.0", "contentHash": "sha256:...", "source": "bundled" }
]
}

<!-- /skillpack:manifest -->
```

### Q14 — Post-scaffold lifecycle

**Decisions:**

- **Q14a → A.** `skillpack add <skill>` runs the skill's manifest pipeline
  against the existing project. Required by the spec's headline use case.
- **Q14b → C.** `skillpack remove <skill>` reverses the cheap and safe parts:
  removes deps, deletes the SKILL.md, deletes files the skill created **that
  the user hasn't modified** (detected via per-skill state file content
  hashes). Source-file insertions get a printed checklist; we don't pretend
  to un-edit `App.tsx`.
- **Q14c → C for v1, A in Phase 2.** v1: `skillpack upgrade --detect` warns
  when the project's recorded versions are stale. Real diff-and-reapply
  upgrades land later, prioritized by which skills change manifests often.
- **Q14d → C.** Refuse to operate on a dirty git tree (`--force` overrides).
  Leverages git as the audit/rollback mechanism.

**Git-repo precondition:** initial `scaffold` does `git init` if cwd isn't a
repo, makes an initial commit immediately after install. Every subsequent op
requires a clean tree.

Per-skill state file: `.skillpack/state/<skill>.json` records the manifest
hash applied and the content hashes of every file written/touched.

### Q15 — Versioning

**Decisions:**

- **Q15a → C.** Project manifest records CLI version + per-skill semver +
  per-skill content hash. Verbose but write-once, read-by-tools.
- **Q15b → A.** `schemaVersion: 1` on every `manifest.json` and every
  project manifest block from day one. CLI refuses unknown schema versions.
- **Q15c → C.** Per-skill `version` field for human-readable CHANGELOG;
  **content hash** is the source of truth for drift detection.
- **Q15d → A.** Even user-owned overlays get hashed in the project manifest,
  so silent drift in `~/.skillpack/skills/` is detectable.

### Q16 — v0.1 MVP scope

**Decision: A (thin slice) + `skill-creator` retargeted at our paths.**

v0.1 deliverables:

1. Monorepo skeleton; `pnpm` workspaces; changesets.
2. CLI commands:
   - `skillpack scaffold <boilerplate> <skills...> [--into] [--no-install] [--pm] [--host]`
   - `skillpack prime --boilerplate <bp> --skills <a,b,c> [--project <path>]`
   - `skillpack list [boilerplates|skills <bp>]`
3. One boilerplate: `react` (Vite + TS + Vitest + `<App/>` with named
   marker comments).
4. One skill: `react/skills/remotion` (full manifest: deps, files, marker
   insertion in `App.tsx`, `setup.ts` no-op, SKILL.md, `references/`).
5. Vendored Anthropic `skill-creator` scripts under
   `vendor/anthropic-skill-creator/` with LICENSE preserved.
6. `skill-creator` meta-skill SKILL.md retargeting Anthropic's flow at
   `boilerplates/<bp>/skills/<name>/`.
7. AGENTS.md emitter with the manifest block from Q13/Q15.
8. Git-init + initial commit at scaffold time.
9. Claude Code plugin manifest + pi extension manifest, both wired to
   `npx -y skillpack@<pinned>` as CLI fallback.
10. **One bundle eval scenario:** "build a 15-second animated product-feature
    reel with synced captions" (Remotion-flavored). Captures tokens &
    duration with/without skillpack. Becomes the headline number in the
    README.

**v0.2:** add `confetti` and `tanstack-query`; ship `skillpack add/remove`
and `upgrade --detect`; ship `skill-migrator`.

**v0.3:** add `nextjs` and `vite-vanilla-ts` boilerplates; ship
`boilerplate-creator`; ship overlay registry (Q10a → C tier 2).

**Phase 2:** remote registry resolver; TS port of vendored Python (no JSON
schema changes); real `upgrade` diff-and-reapply; schema migrations as
needed.

---

## Reference: open questions in original spec

| Spec question                  | Resolved by                                              |
| ------------------------------ | -------------------------------------------------------- |
| Where are plugins stored?      | Q2 (templates) + Q3 (artifacts) + Q12d (registry cache). |
| Auto-detect npm/bun/yarn/pnpm? | Q7.                                                      |
