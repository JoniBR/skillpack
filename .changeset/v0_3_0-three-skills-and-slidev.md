---
"@skill-pack/cli": minor
"@skill-pack/pi": minor
"@skill-pack/claude-plugin": minor
---

v0.3.0 — two new skills, one new boilerplate.

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
