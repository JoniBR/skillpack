# @skill-pack/cli

The CLI for [`skill-pack`](https://github.com/JoniBR/skillpack) — scaffold a
project + a curated set of agent skills in one command, so the agent can
spend its tokens on logic instead of setup.

```bash
# One-shot via npx (no global install needed):
npx -y @skill-pack/cli scaffold react remotion

# Or install globally:
npm i -g @skill-pack/cli
skillpack scaffold react remotion
```

## Commands

| Command | What it does |
| --- | --- |
| `skillpack scaffold <boilerplate> [skills...]` | Copy a boilerplate into cwd (or `--into <path>`), apply each skill's manifest, install deps, write `.claude/skills/` + `.pi/skills/` + `AGENTS.md`, git-init + initial commit. |
| `skillpack prime --boilerplate <bp> --skills <a,b,c>` | Emit a clean-context primer string to stdout (project tree + per-skill `SKILL.md` contents) for piping into a sub-agent's first prompt. |
| `skillpack list boilerplates` | List bundled boilerplates. |
| `skillpack list skills <boilerplate>` | List skills available for a boilerplate. |
| `skillpack skill scaffold --boilerplate <bp> --name <skill>` | Create an empty skill skeleton at `~/.skill-pack/skills/<bp>/<name>/` for `skill-creator` to fill in. |

## Flags (scaffold)

| Flag | Default | Meaning |
| --- | --- | --- |
| `--into <path>` | cwd if empty | Target directory. |
| `--no-install` | install | Skip dependency install. |
| `--pm <pnpm\|npm\|yarn\|bun>` | auto-detected | Override PM. |
| `--host <claude\|pi\|both>` | both | Which agent host's skill directory to write. |
| `--force` | off | Scaffold into a non-empty directory. |

## What gets shipped

The published tarball includes:

- `dist/` — the compiled CLI
- `boilerplates/` — bundled boilerplates (currently `react`)
- `meta-skills/` — `skill-creator` (more to come)
- `vendor/` — Anthropic's `skill-creator` machinery (vendored, Apache-2.0)
  and the Remotion team's official skill (vendored, attribution preserved
  in `boilerplates/react/skills/remotion/upstream/VENDOR.md`)

See the [main README](https://github.com/JoniBR/skillpack) for the design
rationale, eval results, and roadmap.

## License

MIT. The vendored Anthropic skill-creator remains Apache-2.0; the vendored
Remotion-team skill is bundled with attribution pending an explicit
license clarification from upstream.
