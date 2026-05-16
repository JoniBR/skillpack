---
description: Scaffold a project + agent skills via skill-pack. Usage `/skillpack <boilerplate> <skill1> <skill2> …` (e.g. `/skillpack react remotion`). Adds AGENTS.md, .claude/skills/, and runs install.
argument-hint: <boilerplate> [skills...]
allowed-tools: Bash(npx:*), Read, Write
---

# /skillpack

Scaffold a working project + agent skills in one command.

## What this does

Runs:

```bash
npx -y skill-pack@latest scaffold $ARGUMENTS
```

…in the current working directory. The CLI will:

1. Copy the `<boilerplate>` base files into cwd (errors if cwd is non-empty
   and `--into <path>` was not given).
2. Apply each skill's manifest: deps, file overlays, JSON patches, marker
   insertions into `App.tsx`.
3. Install dependencies with the detected package manager (pnpm > npm > yarn > bun).
4. Write `.claude/skills/<bp>/SKILL.md` and `.claude/skills/<bp>-<skill>/SKILL.md`
   for each installed skill (and `.pi/skills/...` mirrors).
5. `git init` and make an initial commit.
6. Emit `AGENTS.md` with a JSON manifest block that `skillpack add/remove/upgrade`
   read later.

After scaffolding, **the project now has progressive-disclosure skills the
session can load on demand.** You typically don't need to read every
`SKILL.md` proactively — Claude will load the relevant one(s) when a task
matches their `description` frontmatter.

## Examples

`/skillpack react remotion`
→ Vite + React + TS + Vitest, with Remotion 4 wired in, an in-app
   `<VideoPreview />`, `npm run video:render` to render headlessly, and a
   `react-remotion` SKILL.md explaining the conventions.

`/skillpack list boilerplates`
→ lists installed boilerplate names.

`/skillpack list skills react`
→ lists skills available for the `react` boilerplate.

## Tip

If you're starting work on a brand-new project and the user has described
what they want, **pick the smallest skillpack invocation that gets you to a
working starting point**, then let the loaded `SKILL.md` files guide your
implementation. Don't try to set up the project from scratch when a skill
exists.
