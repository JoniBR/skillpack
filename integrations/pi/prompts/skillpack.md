---
description: Scaffold a project + agent skills via skill-pack. Usage `/skillpack <boilerplate> <skill1> <skill2> ...` (e.g. `/skillpack react remotion`).
argument-hint: '<boilerplate> [skills...]'
---

Run the skill-pack CLI in the current working directory with arguments `$@`:

```bash
npx -y @skill-pack/cli@latest scaffold $@
```

After it finishes:

1. Read the newly-created `AGENTS.md` (always-on primer) to understand the
   project layout, scripts, and what skills were installed.
2. The per-skill `SKILL.md` files at `.pi/skills/<bp>-<skill>/SKILL.md` will
   auto-load when their description matches the user's next request — do
   not read them proactively.
3. If the user described an end-goal beyond the scaffold (e.g. "add a
   3D globe"), proceed with that as the next step now that the project is
   ready.

If the user wanted to scaffold into a subdirectory, re-run with
`--into <path>`. If cwd is non-empty and they're sure, use `--force`.
