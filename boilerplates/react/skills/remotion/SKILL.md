---
name: react-remotion
description: Programmatic video composition with Remotion 4 in this React project. Use whenever the user wants to create, edit, or render a video — product reels, animated trailers, motion graphics, social cuts, captioned tutorials, anything composed as React components and rendered as MP4. The scaffold is fully wired (composition registered, `<Player />` mounted, headless render script, `out/` git-ignored). Wraps the canonical Remotion team's `remotion-best-practices` skill (under `upstream/`) for deep API guidance. Use this skill instead of generic React advice whenever Remotion files are involved.
---

# Remotion (skillpack react skill)

[Remotion](https://www.remotion.dev) is React for video. This skill is the
**skillpack-react adapter** around the Remotion team's own canonical skill,
which lives under `upstream/SKILL.md` + `upstream/rules/*.md`. The upstream
material is the source of truth for Remotion API knowledge; this file is a
thin preamble explaining what skillpack already set up for you and where
things are.

## What's already done for you

skillpack scaffolded a working Remotion setup. You **do not** need to run
`npx create-video@latest` (the upstream skill mentions it under "New
project setup" — skip that step). Specifically, the scaffold has already:

- Installed `remotion`, `@remotion/cli`, `@remotion/player`, and
  `@remotion/media`.
- Registered `MyVideo` as a `<Composition />` in `src/video/Root.tsx`
  (1080×1080, 30 fps, 450 frames = 15 s).
- Mounted a live preview at the React app's home page via
  `src/components/VideoPreview.tsx` (using `@remotion/player`).
- Added `npm run video:preview` (opens Remotion Studio) and
  `npm run video:render` (renders headlessly to `out/video.mp4`).
- Created `out/` with a `.gitignore` that ignores all rendered files so
  large MP4s never get committed.
- Configured `remotion.config.ts` with sensible defaults
  (`setVideoImageFormat('jpeg')`, `setOverwriteOutput(true)`).
- Set `acknowledgeRemotionLicense` on the in-app `<Player />` so vitest
  and dev-server output isn't polluted with the license notice. **This
  prop only silences the warning** — if you ship the video commercially
  inside a company that needs a license, see https://remotion.dev/license.

So the typical first session looks like: edit `src/video/MyVideo.tsx`,
preview at `localhost:5173` (in-app `<Player />`) or
`npm run video:preview` (Remotion Studio), then `npm run video:render`
when ready.

## Pitfalls — read this BEFORE editing anything

These are footguns that bite cold agents on first contact. The scaffold
is already correct; the rules are about what NOT to break.

1. **Don't remove `registerRoot(RemotionRoot)` from `src/video/Root.tsx`.**
   Without it, `remotion render` fails with
   `"this file does not contain registerRoot"` and the CLI offers no
   workaround. The scaffold's `Root.tsx` already calls it at the bottom.

2. **Bare relative imports inside `src/video/` — no `.js` extension.**
   Remotion's webpack-based bundler ignores the TypeScript
   `.js`-for-TS-files convention. `import { MyVideo } from './MyVideo.js'`
   fails the headless render with `"MyVideo.js doesn't exist"`. The Vite
   dev server happily resolves either form, so the bug only surfaces at
   render time. The scaffold uses bare imports throughout `src/video/`
   and in `VideoPreview.tsx`'s import of `../video/MyVideo` — keep it
   that way. (The marker-inserted `App.tsx` import uses `.js` because
   that file is Vite-only and never goes through Remotion's bundler.)

3. **`npm run video:render` writes to `out/video.mp4` by default.**
   To override the path, **set the `OUT` env var** — do NOT try to
   append the path as a positional CLI arg:
   ```bash
   OUT=out/jetpack.mp4 npm run video:render
   ```
   The hardcoded positional path means `npm run video:render -- out/foo.mp4`
   is silently ignored (the extra arg goes past Remotion's positional
   parser and the file still lands at `out/video.mp4`). If you can't
   use env vars, bypass the script: `npx remotion render src/video/Root.tsx
   MyVideo out/foo.mp4`.

4. **CSS transitions / animations are FORBIDDEN.** Same for Tailwind
   animation class names. They will not render correctly. Drive every
   visual change from `useCurrentFrame()` + `interpolate()` or `spring()`.
   See `upstream/rules/timing.md` and `references/timing-and-easing.md`.

5. **Use `<Img>`, `<Video>`, `<Audio>` from `remotion` / `@remotion/media`,
   not bare `<img>` / `<video>` / `<audio>`.** The wrappers integrate with
   Remotion's frame clock and asset preloader; the raw tags don't.

6. **Reference public assets via `staticFile('foo.png')`, never with raw
   paths like `'/foo.png'`.** Raw paths break under `remotion render`.

7. **`useCurrentFrame()` and `useVideoConfig().durationInFrames` rebase
   inside `<Sequence>`.** Inside a `<Sequence from={150} durationInFrames={75}>`,
   `useCurrentFrame()` starts at 0 and `durationInFrames` is 75 — not the
   parent composition's 450. The scaffolded `Caption` relies on this to
   compute its tail fade-out. Don't pass timing as props; read it from
   `useVideoConfig()`.

8. **If you change `Root.tsx` composition geometry, mirror it in
   `VideoPreview.tsx`.** The `<Player />` props (`durationInFrames`,
   `compositionWidth`, `compositionHeight`, `fps`) duplicate what's in
   `Root.tsx`'s `<Composition />`. There's no single-source-of-truth
   helper; they drift if you forget.

## Rendering recipes

| Want                          | Command                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Default render → `out/video.mp4` | `npm run video:render`                                                                |
| Custom output path            | `OUT=out/jetpack.mp4 npm run video:render`                                               |
| Bypass the script entirely    | `npx remotion render src/video/Root.tsx MyVideo out/jetpack.mp4`                         |
| Render a *different* comp id  | `npx remotion render src/video/Root.tsx AnotherComp out/another.mp4`                     |
| Open the interactive studio   | `npm run video:preview`                                                                  |
| In-app preview (React app)    | `npm run dev`, then open `http://localhost:5173`                                         |

## File layout (this project's conventions)

| Path                              | Role                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `src/video/Root.tsx`              | Composition registry. Add new compositions here as siblings. |
| `src/video/MyVideo.tsx`           | Default composition. Edit this for your reel.                |
| `src/video/Caption.tsx`           | Bottom-third caption helper used by `MyVideo`.               |
| `src/components/VideoPreview.tsx` | `<Player />` mounted in `<App />` for live in-app preview.   |
| `remotion.config.ts`              | `remotion render` CLI config.                                |
| `public/`                         | Static assets — reference with `staticFile('foo.png')`.      |
| `out/`                            | Rendered MP4s land here; git-ignored except for `.gitignore`. |

The Remotion **Studio** (interactive editor) and the Remotion **render**
CLI both target `src/video/Root.tsx` — never delete or move that file
without updating both `package.json` scripts.

## Default composition geometry

`MyVideo` is registered at **1080×1080, 30 fps, 450 frames (15s)** in
`Root.tsx`. Adjust freely. Common preset swaps:

- 1080p landscape: `width={1920} height={1080}`
- Vertical / Reels / Shorts: `width={1080} height={1920}`
- Square (current default): `width={1080} height={1080}`

Remember pitfall #8: if you change these, mirror them in `VideoPreview.tsx`.

## How to use the upstream skill

For everything about the Remotion API itself — animations, timing,
sequencing, audio, captions, fonts, transitions, 3D, FFmpeg, etc. —
**load `upstream/SKILL.md`** (it's tightly written and short), then load
specific `upstream/rules/*.md` files as the task requires. The upstream
SKILL.md ends with a long table of "see `rules/X.md` for Y" pointers;
that's the routing index.

Concretely, common references the upstream skill points to:

- `upstream/rules/timing.md` — `interpolate`, `spring`, Easing, frame math.
- `upstream/rules/sequencing.md` — `<Sequence>` patterns, delay, trim.
- `upstream/rules/transitions.md` — scene transitions.
- `upstream/rules/audio.md` — advanced audio (trim, volume, speed, pitch).
- `upstream/rules/audio-visualization.md` — spectrum / waveform reactive.
- `upstream/rules/google-fonts.md`, `upstream/rules/local-fonts.md`.
- `upstream/rules/transparent-videos.md` — alpha output.
- `upstream/rules/parameters.md` — Zod-typed parametrised compositions.
- `upstream/rules/3d.md` — Three.js + React Three Fiber in Remotion.
- `upstream/rules/calculate-metadata.md` — dynamic duration/dimensions.
- `upstream/rules/voiceover.md` — ElevenLabs TTS.
- 26 more — see `upstream/SKILL.md` for the full catalogue.

## When in doubt

Read `upstream/SKILL.md` end-to-end (it's short — ~250 lines), then follow
its pointers into `upstream/rules/`. The Remotion team maintains those
files; they will be more current than anything we could write.
