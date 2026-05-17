# Vendored from nuxt-modules/og-image

- **Upstream:** https://github.com/nuxt-modules/og-image
- **Subpath:** `.claude/skills/satori-skilld/`
- **Vendored at commit:** `67b8ddc05f757e01a43cbbe07d8aaafcd1d13671` (see `.vendor-commit`)
- **License:** MIT (Copyright (c) 2024 Harlan Wilton). See
  `LICENSE.md` in the upstream repo.

## What's in here

- `SKILL.md` — the community `satori-skilld` skill: a compact API/best-
  practices reference for `vercel/satori`, including version-specific
  API change notes and a curated list of footguns (font loading,
  variable fonts, Tailwind config, edge-runtime caveats, etc.).

The upstream `satori-skilld/` directory is intentionally lean — the
deep references it points at (`.skilld/docs/`, `.skilld/issues/`,
`.skilld/releases/`) are generated on demand by the `skilld` CLI and
are not part of the vendored snapshot. Run `skilld search "..." -p satori`
in a project that has `skilld` installed to fetch them lazily.

## Why vendor instead of fetch-at-runtime

- Skillpack's promise is offline-deterministic scaffolding. Runtime
  fetches break that.
- Our eval harness needs reproducible inputs.
- The agent in a scaffolded project benefits from progressive
  disclosure (upstream `SKILL.md` is loaded once; deeper rules are
  loaded on demand), which only works if the entry file is present
  locally.

## What skillpack does with this content

At scaffold time, `react/skills/satori/manifest.json` copies the entire
upstream tree into the consuming project at:

- `.claude/skills/react-satori/upstream/` (Claude Code)
- `.pi/skills/react-satori/upstream/` (pi)

The skillpack-authored `SKILL.md` (one level up) wraps this with a
project-specific preamble (file layout, the `og:generate` script,
font-loading expectations, the `public/og/` output path), then points
the agent at this upstream content for everything else.

## Upgrade

```
git clone https://github.com/nuxt-modules/og-image /tmp/og-image
rm -f upstream/SKILL.md
cp /tmp/og-image/.claude/skills/satori-skilld/SKILL.md upstream/SKILL.md
git -C /tmp/og-image rev-parse HEAD > upstream/.vendor-commit
# Re-run the bundle smoke test.
```
