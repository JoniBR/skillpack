# @skill-pack/claude-plugin

Claude Code plugin for [skill-pack](https://github.com/JoniBR/skillpack).

## What it contributes

- The `/skillpack` slash command (`commands/skillpack.md`), which shells out
  to `npx -y skill-pack@latest scaffold ...`.
- The meta-skills (`skill-creator`, `skill-migrator` (v0.2),
  `boilerplate-creator` (v0.3)) and the vendored Anthropic skill-creator,
  declared via the repo-root `.claude-plugin/marketplace.json`.

## Install

```bash
/plugin marketplace add github.com/JoniBR/skillpack
/plugin install skill-pack
```

## CLI dependency

The slash command shells out to the `skill-pack` CLI on PATH, falling back
to `npx -y skill-pack@latest`. Install standalone with:

```bash
npm i -g @skill-pack/cli     # or pnpm / yarn / bun add -g
```

## License

MIT (vendored Anthropic skill-creator remains Apache-2.0; see root LICENSE).
