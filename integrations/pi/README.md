# @skill-pack/pi

[pi](https://pi.dev) extension package for
[skill-pack](https://github.com/JoniBR/skillpack).

## What it contributes

- The `/skillpack` prompt template (`prompts/skillpack.md`), which shells
  out to `npx -y @skill-pack/cli@latest scaffold ...`.
- The meta-skills (`skill-creator` today; `skill-migrator` in v0.2;
  `boilerplate-creator` in v0.3), synced into `skills/` at build time from
  the monorepo's `meta-skills/` directory.
- The vendored Anthropic `skill-creator`, synced into
  `skills/anthropic-skill-creator/`.

## Install

```bash
pi install npm:@skill-pack/pi          # global
pi install -l npm:@skill-pack/pi       # project-local (.pi/settings.json)
```

Or try without installing:

```bash
pi -e npm:@skill-pack/pi
```

## CLI dependency

The slash command shells out to the `skill-pack` CLI on PATH, falling back
to `npx -y @skill-pack/cli@latest`. Install standalone with:

```bash
npm i -g @skill-pack/cli
```

## License

MIT (vendored Anthropic skill-creator remains Apache-2.0; see root LICENSE).
