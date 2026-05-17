---
"@skill-pack/cli": minor
"@skill-pack/pi": minor
"@skill-pack/claude-plugin": minor
---

v0.4.0 — community-authoring v1.

The missing meta-skills + the overlay registry: anyone can now author
their own boilerplates and skills locally without forking this repo.

**New meta-skills** (ship via both pi extension and Claude plugin):

- `skillpack-skill-migrator` — converts an existing general `SKILL.md`
  (anywhere on disk) into a skillpack skill under the right host
  boilerplate. LLM-driven inference of `manifest.json` shape (deps,
  files, jsonPatches, markers), smoke-tests before declaring done,
  default output to overlay (`~/.skill-pack/skills/<bp>/<name>/`),
  `--contribute` flag for upstream PRs. Auto-loads
  `boilerplate-creator` if the target boilerplate doesn't exist.

- `skillpack-boilerplate-creator` — authors a new boilerplate from
  scratch at `~/.skill-pack/boilerplates/<name>/`. Bakes in the
  acceptance criteria from DESIGN.md (install + build + test + dev-boot
  smoke check), the canonical `@skillpack:*` marker naming convention,
  and the optional `upstream/` vendoring pattern (with the
  slidev boilerplate as a worked example).

**New CLI surface:**

- `skillpack boilerplate scaffold --name <bp> [--into <path>]` creates
  the boilerplate skeleton at the overlay location.
- `skillpack list boilerplates` / `list skills <bp>` now show
  `(overlay)` next to user-authored entries.
- `skillpack skill scaffold` now verifies the parent boilerplate
  exists (bundled OR overlay) before creating; if missing, errors
  with a helpful pointer to `boilerplate scaffold`.
- Also fixed a latent ESM bug in `skill scaffold` that broke the
  command under the built dist (`require('node:fs')` → ESM import).

**Resolver — overlay registry:**

- New `packages/cli/src/overlay.ts` resolves `~/.skill-pack/` for
  user-authored boilerplates and skills. `resolveBoilerplate` /
  `resolveSkill` check overlay first; on shadow-with-bundled, returns
  overlay and emits a one-line `console.warn` (DESIGN.md Q10a → C
  with the "overlay wins with warning" semantics).
- Project manifest `InstalledSkill.source` now correctly reflects
  `overlay` vs `bundled` (was always recording `bundled` before).
- 13 new unit tests around the overlay logic; full suite now 28/28.

**Fixed slidev vendor doc:** `boilerplates/slidev/upstream/VENDOR.md`
still referenced the old Option-B destination path
(`.claude/skills/slidev-slidev-best-practices/upstream/`). Updated to
match the actual destination (`.claude/skills/slidev/upstream/`).

Smoke-tested end-to-end:
- `boilerplate scaffold` produces the skeleton, `list` shows the
  overlay marker, `scaffold react remotion` still works, `scaffold
  slidev` still auto-ships the 52-file upstream tree.

See [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) for what's deferred to
v0.5 (`skillpack publish` + remote registry resolver).
