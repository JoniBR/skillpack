# Vendored from remotion-dev/skills

- **Upstream:** https://github.com/remotion-dev/skills
- **Subpath:** `skills/remotion/`
- **Vendored at commit:** `277510e78245ac0fa275d7cb6520d52e0ac2e212` (see `.vendor-commit`)
- **License at time of vendoring:** _none specified_ in the upstream repo. See
  `OPEN-QUESTIONS.md` in the skillpack root — we are seeking explicit
  permission from the Remotion team. If they decline, this directory will be
  removed and replaced with our own from-scratch content.

## What's in here

- `SKILL.md` — the canonical Remotion best-practices skill maintained by the
  Remotion team. Production-grade, kept current with the framework.
- `rules/` — 36 deep references on Remotion features (timing, transitions,
  fonts, audio, captions, FFmpeg, 3D, etc.), loaded on demand per upstream's
  progressive-disclosure design.
- `rules/assets/` — example components referenced by some rules.

## Why vendor instead of fetch-at-runtime

- Skillpack's promise is offline-deterministic scaffolding. Runtime fetches
  break that.
- Our eval harness needs reproducible inputs.
- The agent in a scaffolded project benefits from progressive disclosure
  (each `rules/*.md` loads only when relevant), which only works if the
  files are present locally.

## What skillpack does with this content

At scaffold time, `react/skills/remotion/manifest.json` copies the entire
upstream tree into the consuming project at:

- `.claude/skills/react-remotion/upstream/` (Claude Code)
- `.pi/skills/react-remotion/upstream/` (pi)

The skillpack-authored `SKILL.md` (one level up) wraps this with a
project-specific preamble (file layout, scripts already wired, how the
remotion skill is mounted in `<App />`), then points the agent at this
upstream content for everything else.

## Upgrade

```
git clone https://github.com/remotion-dev/skills /tmp/remotion-skills
rm -rf vendor-target
cp -r /tmp/remotion-skills/skills/remotion vendor-target
git -C /tmp/remotion-skills rev-parse HEAD > vendor-target/.vendor-commit
# Re-run the bundle smoke test.
```
