# @skill-pack/cli

## 0.4.2

### Patch Changes

- v0.4.2 — full test pyramid + drift fixes uncovered by the new validators.

  **Test infrastructure (155/155 pass + 1 skipped, 8.5 s for the full PR run):**

  | Tier                                           | Files |      Tests |
  | ---------------------------------------------- | ----: | ---------: |
  | 1a Unit (`src/*.test.ts`)                      |    10 |         72 |
  | 1b CLI integration (`integration/cli/`)        |     7 |         34 |
  | Meta validators (`integration/meta/`)          |     8 | 17 dynamic |
  | Tier 2 per-skill (`integration/skills/`, slow) |     6 |          6 |
  - Shared `packages/cli/integration/_helpers.ts` exposes `withTmpDir`,
    `libScaffold`, `runCli`, `expectFiles`, `fileSize`, `REPO_ROOT`, etc.
  - Vitest `globalSetup` (`integration/_setup.ts`) stages bundled assets
    ONCE before any test starts — eliminates the race where `npm pack`'s
    `prepublishOnly` rewrites `packages/cli/boilerplates/` mid-flight.
  - Two configs: `vitest.config.ts` (fast: unit + cli + meta) and
    `vitest.integration.config.ts` (slow: per-skill, `pnpm test:integration`).
  - New CI `integration` job runs Tier 2 on push to main +
    `workflow_dispatch`, with cached Remotion Chrome + Playwright browsers.

  **Drift caught by the new meta validators (real bugs, fixed in this release):**
  - `integrations/claude-code/LICENSE` + `integrations/pi/LICENSE` were
    missing — added + listed in each `package.json#files` so the npm
    tarballs ship license text.
  - `packages/cli/LICENSE` copied into the package dir explicitly.
  - `boilerplates/react/skills/satori/upstream/LICENSE.md` copied from
    upstream (nuxt-modules/og-image, MIT).
  - `boilerplates/slidev/upstream/LICENSE` copied from upstream
    (slidevjs/slidev, MIT).
  - `boilerplates/react/skills/remotion/upstream/NOTICE.md` added —
    upstream (remotion-dev/skills) shipped no LICENSE at the vendored
    commit; NOTICE documents that explicitly.
  - `boilerplates/slidev/base/slides.md` got a `<!-- @skillpack:slides -->`
    marker comment so future slidev skills have an attachment point (the
    marker-presence meta test requires every boilerplate to have ≥1
    marker).

  **No API changes.** Pure additive: more tests, fixed authoring drift,
  LICENSE hygiene. All bundled boilerplates and skills behave identically
  to v0.4.1 from the user's perspective; the only externally observable
  difference is that LICENSE text now ships inside each published
  package's npm tarball.

## 0.4.1

### Patch Changes

- 91ab993: v0.4.1 — dogfood-driven skill improvements.

  Spawned 4 subagents, each tried to do a realistic task in a fresh
  scaffold of one skill, recorded every footgun, and fixed the skill in
  place. All four verified with first-attempt-success on a re-scaffold.

  **`remotion` (skill v0.3.0)** — 8 footguns found, 8 fixed:
  - `video:render` script now honours `OUT=...` env var so agents can
    render to alternative MP4 paths without bypassing the script.
  - `out/.gitignore` template ships so rendered videos don't get
    accidentally git-committed.
  - `<Player>` now passes `acknowledgeRemotionLicense` to silence the
    benign per-test license warning (with a comment about what that does
    and doesn't mean — it's not a license decision).
  - SKILL.md restructured: new "Pitfalls — read this BEFORE editing
    anything" section promoted to right after "What's already done for
    you", expanded to 8 numbered items including registerRoot, bare
    imports, render-path override, no-CSS-animation, asset wrappers,
    `staticFile`, Sequence rebasing, Player/Composition geometry drift.
  - `Caption` now exits with a 12-frame opacity fade-out (was a hard cut).
  - Sequence rebasing rule (`useCurrentFrame()` zero-bases inside
    `<Sequence>`) is now documented + exercised in the Caption code.
  - New "Rendering recipes" cheatsheet in SKILL.md.

  **`recharts` (skill v0.1.1)** — 6 footguns found, 6 fixed:
  - `<Cell>` for per-bar / per-slice colour overrides added to the
    cheatsheet. Without it, agents naively try `fill={fn}` which silently
    paints every bar the same colour.
  - `stackOffset="sign"` for diverging stacked-area charts documented.
  - New "Accessibility" section promoting `accessibilityLayer` +
    `aria-label` to SKILL.md (was buried in references); the scaffolded
    `Dashboard.tsx` now demonstrates both patterns.
  - New "Layout & responsive breakpoints" section showing both
    `auto-fit` (soft) and `@media` (exact pixel) patterns.
  - Worked multi-series snippet added (was prose-only).
  - `vitest.setup.ts` filters the harmless `width(0) and height(0) of
chart` warning from jsdom rendering so test output stays clean.

  **`satori` (skill v0.1.1)** — 1 hard hit + 2 latent fixed:
  - `hsl()` / named colours in `linear-gradient(…)` crash satori 0.10's
    gradient parser with `Missing )`. Documented prominently as a new
    Pitfall, with a drop-in `hslToHex` helper for agents that need
    deterministic per-item colours.
  - New "TS conventions" subsection documents the `.js` import quirk
    (Node + ESM convention) and the `as Parameters<typeof satori>[0]`
    invocation pattern that avoids JSX-runtime mismatches between the
    Node script and the Vite app.

  **`slidev` (boilerplate v0.1.1)** — 3 footguns found, 3 fixed:
  - `pnpm export` actually needs TWO install steps, not one — the
    Playwright binary install (`pnpm exec playwright install chromium`,
    ~92 MB) was missing from upstream docs. New `export:setup` npm script
    combines both.
  - Slidev's runtime error message when the chromium binary is missing is
    misleading (it says "install playwright-chromium" even when the
    package is already installed; the real fix is the binary download).
    Documented in a new Overlays section.
  - Vite 8 / rolldown peer-dep warnings + dep-scan stack trace during
    `pnpm export` are harmless — documented as such so agents don't
    mistake them for export failures.

  **Compose check:** scaffolding `react remotion recharts satori` together
  still produces a working project on first attempt; typecheck, test,
  build, `video:render`, and `og:generate` all green; `out/.gitignore`
  correctly excludes rendered MP4s while keeping the directory tracked
  for the render script.

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
