---
"@skill-pack/cli": minor
"@skill-pack/pi": minor
"@skill-pack/claude-plugin": minor
---

Initial public release of skillpack.

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
