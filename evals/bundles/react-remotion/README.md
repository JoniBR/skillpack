# Bundle eval: react + remotion

The headline scenario for v0.1 (DESIGN.md Q16).

## What's measured

For the eval prompt in `evals.json`, two parallel subagent runs:

- **Baseline** — empty `cwd`, no scaffold. Agent must set up everything
  from scratch (Vite + React + TS + Remotion + Player + render pipeline)
  before it can start building the requested reel.
- **With skillpack** — a fresh `cwd` after running
  `skillpack scaffold react remotion --no-install` (we run install in the
  measured phase so total wall-clock is comparable). Agent reads
  `AGENTS.md`, loads `react-remotion/SKILL.md` on demand, builds the reel.

Both runs are graded against the same assertions.

## Running

```bash
# Spawn both subagents in the same turn (don't serialise — see Anthropic's
# skill-creator instructions in vendor/anthropic-skill-creator/SKILL.md).
#
# Save outputs to:
#   <workspace>/iteration-N/eval-1/baseline/{outputs,timing.json,grading.json}
#   <workspace>/iteration-N/eval-1/with_skillpack/{outputs,timing.json,grading.json}

python -m vendor.anthropic_skill_creator.scripts.aggregate_benchmark \
  <workspace>/iteration-N --skill-name react-remotion
```

## Why this scenario

It exercises the full stack:

1. **Project setup** — without skillpack the agent must pick a bundler,
   wire TypeScript, install Remotion, configure the renderer, mount a
   `<Player />` somewhere, add npm scripts. With skillpack all of this is
   pre-done by the time the prompt starts.
2. **Skill content** — the prompt asks for specific timing (1.5s fade,
   3-second captions, spring-eased pop-in). The Remotion `SKILL.md`
   teaches exactly these patterns; without it the agent fishes around in
   docs.
3. **Verifiable output** — the headless render either produces an MP4 or
   it doesn't, and assertions are objective (file exists + non-trivial
   size + correct strings in source).

If skillpack works as designed, the with-skillpack run should use
**significantly fewer tokens** (no setup tokens, less doc-fishing) and
**finish faster wall-clock** (no install retry, fewer iteration cycles).
The delta is the number we put in the README.
