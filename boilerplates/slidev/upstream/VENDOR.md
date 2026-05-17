# Vendored from slidevjs/slidev

- **Upstream:** https://github.com/slidevjs/slidev
- **Subpath:** `skills/slidev/`
- **Vendored at commit:** `46bcec25364dd230afbd9e6639a9f6c88650df32` (see `.vendor-commit`)
- **License:** MIT — Copyright (c) 2020-PRESENT Anthony Fu and Slidev contributors.
  See upstream `LICENSE` (verified at vendoring time at
  `/tmp/skill-upstream/slidev/LICENSE`).

## What's in here

- `SKILL.md` — the canonical Slidev best-practices skill maintained by the
  slidevjs team. Short, tightly written, kept current with the framework.
- `references/` — 52 deep references on Slidev features (markdown syntax,
  headmatter, frontmatter, layouts, animations, code highlighting,
  magic-move, Monaco editor, LaTeX, Mermaid, PlantUML, draggable
  elements, presenter mode, recording, PDF/PPTX/PNG export, OG image, SEO,
  hosting, slide-lifecycle hooks, …). Loaded on demand per upstream's
  progressive-disclosure design.
- `README.md` — original upstream README (if present).

## Why vendor instead of fetch-at-runtime

- Skillpack's promise is offline-deterministic scaffolding. Runtime fetches
  break that.
- Eval harnesses need reproducible inputs.
- The agent in a scaffolded project benefits from progressive disclosure
  (each `references/*.md` loads only when relevant), which only works if
  the files are present locally.

## What skillpack does with this content

At scaffold time, the existing `scaffold.ts` pipeline copies a skill's aux
directories (anything in the skill dir that isn't `files/`, `manifest.json`,
or the SKILL.md itself) into the consuming project at:

- `.claude/skills/slidev-slidev-best-practices/upstream/` (Claude Code)
- `.pi/skills/slidev-slidev-best-practices/upstream/` (pi)

The skillpack-authored `SKILL.md` (one level up) wraps this with a
project-specific preamble (file layout, scripts already wired, Slidev
gotchas), then points the agent at the upstream content for everything else.

## Upgrade

```sh
git clone https://github.com/slidevjs/slidev /tmp/slidev-upstream
DEST=boilerplates/slidev/skills/slidev-best-practices/upstream
rm -rf "$DEST/references" "$DEST/SKILL.md" "$DEST/README.md"
cp /tmp/slidev-upstream/skills/slidev/SKILL.md      "$DEST/SKILL.md"
cp -R /tmp/slidev-upstream/skills/slidev/references "$DEST/references"
cp /tmp/slidev-upstream/skills/slidev/README.md     "$DEST/README.md"
git -C /tmp/slidev-upstream rev-parse HEAD > "$DEST/.vendor-commit"
# Re-run the bundle smoke test (pnpm scaffold + slidev build).
```

## License

MIT. Original copyright retained. Redistributing this upstream content
inside skillpack does not transfer authorship; the slidevjs team are the
authors. Skillpack only adds the wrapper `SKILL.md` one level up.
