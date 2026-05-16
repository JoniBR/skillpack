# Vendor: anthropic-skill-creator

This directory is a verbatim copy of
[`anthropics/skills/skills/skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator).

- **Upstream commit:** see `.vendor-commit`.
- **License:** see `LICENSE.txt` (per-skill) and `LICENSE.repo.txt`
  (whole-repo, if present). Both ship MIT/Apache-compatible terms; the
  exact text governs.

## Why vendored?

skillpack's eval loop is built on this skill's machinery: parallel
with-skill / baseline subagent runs, `total_tokens` + `duration_ms`
capture per run, grader subagents, `benchmark.json` aggregation,
HTML eval-viewer, description-optimisation via `run_loop.py`. We
adopt it wholesale rather than re-implement.

## Upgrade procedure

```
git clone https://github.com/anthropics/skills /tmp/anthropic-skills
cp -r /tmp/anthropic-skills/skills/skill-creator/* vendor/anthropic-skill-creator/
git -C /tmp/anthropic-skills rev-parse HEAD > vendor/anthropic-skill-creator/.vendor-commit
# Re-run our smoke tests; sanity-check our wrapper meta-skill
# (meta-skills/skill-creator/SKILL.md) still references the right paths.
```

## Phase 2 plan (DESIGN.md Q11a)

Port these Python scripts to TypeScript so skillpack has zero non-JS
dependencies, **without changing JSON schemas** (`evals.json`,
`benchmark.json`, `grading.json`, `feedback.json` stay identical so
existing workspaces remain readable). The eval-viewer (static HTML +
small JS) can likely ship as-is.

## Path mapping when used inside skillpack

| Anthropic concept                            | skillpack mapping                                                |
| -------------------------------------------- | ---------------------------------------------------------------- |
| "the skill" being authored                   | a skill under `boilerplates/<bp>/skills/<name>/`                 |
| "baseline" run (no skill)                    | same prompt, no skill — measures bare-agent token/time           |
| **Bundle baseline** (skillpack-specific)     | same prompt with **empty cwd**, vs. `skillpack scaffold <bp> <skill>` then prompt |
| Workspace directory                          | `<skill-path>/workspace/` or top-level `evals/workspaces/<run>/`  |
| `<skill>-workspace/iteration-N/eval-K/...`   | unchanged                                                        |
