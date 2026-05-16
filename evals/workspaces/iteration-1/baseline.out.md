# Baseline run output

Created files in `baseline/`:
- `package.json` (remotion 4.0.462, react 19, typescript 5.6)
- `tsconfig.json` (strict, jsx react-jsx, moduleResolution Bundler)
- `src/index.ts` — `registerRoot(RemotionRoot)`
- `src/Root.tsx` — `Composition` id `HelloVideo`, 300 frames, 30fps, 1080×1080
- `src/HelloVideo.tsx` — dark bg, "Hello" fade-in over 30 frames (interpolate), three Sequences ("one" 120–180, "two" 180–240, "three" 240–300) each popping with `spring` easing

Install: `pnpm install --ignore-workspace` (parent dir has a `pnpm-workspace.yaml` that excludes this dir, so a plain `pnpm install` was a no-op; used `--ignore-workspace`).

Typecheck: `pnpm typecheck` → PASS (tsc --noEmit, no output).

Blockers: only the pnpm workspace gotcha noted above; resolved with `--ignore-workspace`. Did not run `pnpm video:render` per instructions.
