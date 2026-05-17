# Slidev deck

Scaffolded by [skillpack](https://github.com/) using the `slidev` boilerplate.

## Scripts

```bash
pnpm install        # install deps
pnpm dev            # start dev server at http://localhost:3030
pnpm build          # build static SPA into ./dist
pnpm export         # export to PDF (see "Exporting to PDF" below)
```

## Exporting to PDF

PDF export is **not** a single `pnpm export` — it needs Playwright AND a
chromium binary. The one-shot setup is:

```bash
pnpm run export:setup    # installs playwright-chromium + downloads chromium (~92 MiB)
pnpm export              # writes ./slides-export.pdf
```

Or do it by hand:

```bash
pnpm add -D playwright-chromium
pnpm exec playwright install chromium
pnpm export
```

> If `pnpm export` prints
> `Error: ... please install it via npm i -D playwright-chromium`
> **even after** you ran `pnpm add -D playwright-chromium`, the npm
> package is fine — the *browser binary* is missing. Run
> `pnpm exec playwright install chromium` and retry.

> Heads-up: `pnpm export` emits a noisy rolldown / "Failed to scan for
> dependencies" stack trace from Vite 8 before the real error. It is
> harmless for the build itself; only the *last* line tells you whether
> the PDF was written.

## Editing the deck

The deck content lives in [`slides.md`](./slides.md). See the bundled
`slidev` agent skill (under `.claude/skills/` or `.pi/skills/` after scaffold)
for Slidev syntax, layouts, animations, and export options.
