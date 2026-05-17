---
"@skill-pack/cli": patch
"@skill-pack/pi": patch
"@skill-pack/claude-plugin": patch
---

v0.4.1 — dogfood-driven skill improvements.

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
