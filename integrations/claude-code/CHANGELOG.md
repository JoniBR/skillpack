# @skill-pack/claude-plugin

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
