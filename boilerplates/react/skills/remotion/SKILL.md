---
name: react-remotion
description: Programmatic video composition with Remotion 4 in this React project. Use whenever the user wants to create, edit, or render a video — product reels, animated trailers, motion graphics, social cuts, captioned tutorials, anything composed as React components and rendered as MP4. This skill wraps the canonical Remotion team's `remotion-best-practices` skill (under `upstream/`) and explains how it's wired into this specific skillpack-scaffolded project. Use this skill instead of generic React advice whenever Remotion files are involved.
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
- Registered `MyVideo` as a `<Composition />` in `src/video/Root.tsx`.
- Mounted a live preview at the React app's home page via
  `src/components/VideoPreview.tsx` (using `@remotion/player`).
- Added `npm run video:preview` (opens Remotion Studio) and
  `npm run video:render` (renders headlessly to `out/video.mp4`).
- Configured `remotion.config.ts` with sensible defaults
  (`setVideoImageFormat('jpeg')`, `setOverwriteOutput(true)`).

So the typical first session looks like: edit `src/video/MyVideo.tsx`,
preview at `localhost:5173` (in-app `<Player />`) or
`npm run video:preview` (Remotion Studio), then `npm run video:render`
when ready.

## File layout (this project's conventions)

| Path                              | Role                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `src/video/Root.tsx`              | Composition registry. Add new compositions here as siblings. |
| `src/video/MyVideo.tsx`           | Default composition. Edit this for your reel.                |
| `src/video/Caption.tsx`           | Bottom-third caption helper used by `MyVideo`.               |
| `src/components/VideoPreview.tsx` | `<Player />` mounted in `<App />` for live in-app preview.   |
| `remotion.config.ts`              | `remotion render` CLI config.                                |
| `public/`                         | Static assets — reference with `staticFile('foo.png')`.      |

The Remotion **Studio** (interactive editor) and the Remotion **render**
CLI both target `src/video/Root.tsx` — never delete or move that file
without updating both `package.json` scripts.

## Scripts added by this skill

| Script          | Command                                                    |
| --------------- | ---------------------------------------------------------- |
| `video:preview` | `remotion studio src/video/Root.tsx`                       |
| `video:render`  | `remotion render src/video/Root.tsx MyVideo out/video.mp4` |

In-app preview at `localhost:5173` via the existing `npm run dev` works too.

## Default composition geometry

`MyVideo` is registered at **1080×1080, 30 fps, 450 frames (15s)** in
`Root.tsx`. Adjust freely. Common preset swaps:

- 1080p landscape: `width={1920} height={1080}`
- Vertical / Reels / Shorts: `width={1080} height={1920}`
- Square (current default): `width={1080} height={1080}`

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

## skillpack-specific pitfalls (found in eval iteration 3)

Two Remotion 4 footguns that fresh agents tend to hit:

1. **`src/video/Root.tsx` must call `registerRoot(RemotionRoot)`.** Without
   it, `remotion render` fails with `"this file does not contain
   registerRoot"` (and the error cannot be suppressed from the CLI). Our
   scaffold already includes this call — don't remove it.
2. **Use bare relative imports inside `src/video/` (no `.js` extension).**
   Remotion's webpack-based bundler does NOT honour the TypeScript
   `.js`-extension-for-TS-files convention; `import { MyVideo } from
   './MyVideo.js'` fails the headless render with `"MyVideo.js doesn't
   exist"`. Our scaffold uses bare imports for this reason. Vite (used by
   the in-app `<Player />` preview) is happy with either form, so the dev
   server won't surface the bug — only the render does.

## Hard rules to remember (from upstream)

The upstream skill is explicit about a few non-negotiables:

- **CSS transitions and CSS animations are FORBIDDEN** in Remotion
  components — they don't render correctly. Drive every visual change
  from `useCurrentFrame()` + `interpolate()` or `spring()`.
- **Tailwind animation classes are FORBIDDEN** for the same reason.
  Tailwind for static styling is fine (`upstream/rules/tailwind.md`).
- Use `<Img>`, `<Video>`, `<Audio>` from `remotion` / `@remotion/media`,
  not bare `<img>` / `<video>` / `<audio>` — the wrappers integrate with
  Remotion's frame clock and asset preloader.
- Reference public assets via `staticFile('foo.png')`, never with raw
  paths like `'/foo.png'` — the latter breaks under `remotion render`.

## When in doubt

Read `upstream/SKILL.md` end-to-end (it's short — ~250 lines), then follow
its pointers into `upstream/rules/`. The Remotion team maintains those
files; they will be more current than anything we could write.
