# @skill-pack/cli

## 0.4.0

### Minor Changes

- a281292: v0.4.0 — community-authoring v1.

  The missing meta-skills + the overlay registry: anyone can now author
  their own boilerplates and skills locally without forking this repo.

  **New meta-skills** (ship via both pi extension and Claude plugin):
  - `skillpack-skill-migrator` — converts an existing general `SKILL.md`
    (anywhere on disk) into a skillpack skill under the right host
    boilerplate. LLM-driven inference of `manifest.json` shape (deps,
    files, jsonPatches, markers), smoke-tests before declaring done,
    default output to overlay (`~/.skill-pack/skills/<bp>/<name>/`),
    `--contribute` flag for upstream PRs. Auto-loads
    `boilerplate-creator` if the target boilerplate doesn't exist.
  - `skillpack-boilerplate-creator` — authors a new boilerplate from
    scratch at `~/.skill-pack/boilerplates/<name>/`. Bakes in the
    acceptance criteria from DESIGN.md (install + build + test + dev-boot
    smoke check), the canonical `@skillpack:*` marker naming convention,
    and the optional `upstream/` vendoring pattern (with the
    slidev boilerplate as a worked example).

  **New CLI surface:**
  - `skillpack boilerplate scaffold --name <bp> [--into <path>]` creates
    the boilerplate skeleton at the overlay location.
  - `skillpack list boilerplates` / `list skills <bp>` now show
    `(overlay)` next to user-authored entries.
  - `skillpack skill scaffold` now verifies the parent boilerplate
    exists (bundled OR overlay) before creating; if missing, errors
    with a helpful pointer to `boilerplate scaffold`.
  - Also fixed a latent ESM bug in `skill scaffold` that broke the
    command under the built dist (`require('node:fs')` → ESM import).

  **Resolver — overlay registry:**
  - New `packages/cli/src/overlay.ts` resolves `~/.skill-pack/` for
    user-authored boilerplates and skills. `resolveBoilerplate` /
    `resolveSkill` check overlay first; on shadow-with-bundled, returns
    overlay and emits a one-line `console.warn` (DESIGN.md Q10a → C
    with the "overlay wins with warning" semantics).
  - Project manifest `InstalledSkill.source` now correctly reflects
    `overlay` vs `bundled` (was always recording `bundled` before).
  - 13 new unit tests around the overlay logic; full suite now 28/28.

  **Fixed slidev vendor doc:** `boilerplates/slidev/upstream/VENDOR.md`
  still referenced the old Option-B destination path
  (`.claude/skills/slidev-slidev-best-practices/upstream/`). Updated to
  match the actual destination (`.claude/skills/slidev/upstream/`).

  Smoke-tested end-to-end:
  - `boilerplate scaffold` produces the skeleton, `list` shows the
    overlay marker, `scaffold react remotion` still works, `scaffold
slidev` still auto-ships the 52-file upstream tree.

  See [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) for what's deferred to
  v0.5 (`skillpack publish` + remote registry resolver).

## 0.3.0

### Minor Changes

- d0fb5f4: v0.3.0 — two new skills, one new boilerplate.

  **New skills (under `react`):**
  - `recharts` — chart-driven dashboards (`<LineChart>`, `<BarChart>`,
    `<AreaChart>` with `<ResponsiveContainer>`, sample `Dashboard` component
    mounted in `<App />`). Covers the dashboard / analytics use case from the
    README. Composes with `remotion` for animated chart videos (recipe in
    `references/composing-charts.md`).
  - `satori` — Open Graph image / social card generation. Node-side script
    (`npm run og:generate`) renders a JSX template via Vercel's satori
    into `public/og/card.png`. Vendors the community
    [nuxt-modules/og-image](https://github.com/nuxt-modules/og-image) skill
    (MIT, attributed).

  **New boilerplate:**
  - `slidev` — Slidev (Vite + Vue) markdown-driven slide decks. Ships the
    official [slidevjs/slidev](https://github.com/slidevjs/slidev) skill
    (52-file reference tree, MIT, attributed) automatically — no sub-skill
    to type.

  **CLI improvements:**
  - Scaffolder now copies boilerplate-level aux directories (e.g.
    `upstream/`) alongside the base `SKILL.md`, so boilerplates can ship
    always-on canonical reference material. Used by the new `slidev`
    boilerplate.
  - New `vitest.config.ts` to exclude bundled (`boilerplates/`, `vendor/`,
    `meta-skills/`) directories from test discovery — they ship template
    test files that shouldn't run inside the CLI package.

  Verified end-to-end in a fresh tmp dir:
  `scaffold react remotion recharts satori` → typecheck ✓, test ✓,
  `npm run og:generate` produces 263 KB PNG ✓, Remotion render produces
  964 KB MP4 ✓. `scaffold slidev` → `slidev build` produces a working SPA ✓,
  upstream skill auto-ships (52 reference files).

## 0.2.0

### Minor Changes

- 70b1104: Initial public release of skillpack.

  Ships:
  - `@skill-pack/cli` — the CLI (`skillpack scaffold | prime | list | skill scaffold`)
    with the bundled `react` boilerplate, the `remotion` skill (with the
    Remotion team's official skill content vendored under `upstream/`), the
    vendored Anthropic `skill-creator` eval machinery, and the
    `skill-creator` meta-skill.
  - `@skill-pack/pi` — the pi extension contributing the `/skillpack` prompt
    template plus the meta-skills.
  - `@skill-pack/claude-plugin` — the Claude Code plugin contributing the
    `/skillpack` slash command (also wired via the repo-root
    `.claude-plugin/marketplace.json`).

  See https://github.com/JoniBR/skillpack for the full README, design doc,
  and the three-way eval results that shaped this release.
