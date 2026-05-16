---
name: react-remotion
description: Programmatic video composition with Remotion 4 in this React project. Use whenever the user wants to create, edit, or render a video — animated reels, product feature trailers, motion-graphics captions, or anything composed as React components and rendered as MP4. This skill is wired specifically for the skillpack react boilerplate.
---

# Remotion (skillpack react skill)

[Remotion](https://www.remotion.dev) is React for video: you build
compositions out of React components, drive them with `useCurrentFrame()`
and `useVideoConfig()`, and either preview them in-app via `<Player />` or
render them headlessly to MP4 via the `remotion` CLI.

## File layout (this project's conventions)

| Path                              | Role                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `src/video/Root.tsx`              | Composition registry. Add new compositions here.      |
| `src/video/MyVideo.tsx`           | Default 15s composition. Edit this for your reel.     |
| `src/video/Caption.tsx`           | Bottom-third caption used by `MyVideo`.               |
| `src/components/VideoPreview.tsx` | `<Player />` mounted in `<App />` for live preview.   |
| `remotion.config.ts`              | `remotion render` CLI config.                         |

The Remotion **Studio** (interactive editor) and the Remotion **render**
CLI both target `src/video/Root.tsx` — never delete or move that file
without updating both `package.json` scripts.

## Scripts (added by this skill)

| Script             | Command                                                         |
| ------------------ | --------------------------------------------------------------- |
| `video:preview`    | `remotion studio src/video/Root.tsx`                            |
| `video:render`     | `remotion render src/video/Root.tsx MyVideo out/video.mp4`      |

Plus the in-app preview at `localhost:5173` via `<VideoPreview />`, which is
already mounted in `<App />` by this skill.

## Core API cheatsheet

**A composition** (`src/video/Root.tsx`):

```tsx
<Composition
  id="MyVideo"                // referenced by `remotion render <id>`
  component={MyVideo}
  durationInFrames={450}      // 15s @ 30fps
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{ title: 'Hello' }}
/>
```

**A scene component** uses `useCurrentFrame` + `useVideoConfig`:

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();
```

**Timing animations** — prefer `interpolate` for linear/clamped curves
and `spring` for physical eases:

```tsx
import { interpolate, spring } from 'remotion';

const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
const scale   = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
```

**Sequencing scenes** with `<Sequence from={…} durationInFrames={…}>`:

```tsx
<Sequence from={fps * 5} durationInFrames={fps * 3}>
  <Caption text="Built with skillpack" />
</Sequence>
```

**Layered fullscreen layout** — always use `<AbsoluteFill>` for backgrounds
and full-bleed layers, never raw `<div style={{ position:'absolute' … }}>`.

## Common tasks

**Add a new scene to the default reel** (`src/video/MyVideo.tsx`):
1. Compute a `from` frame relative to `fps` (e.g. `fps * 12`).
2. Wrap your scene in `<Sequence from={…} durationInFrames={…}>`.
3. If the scene needs new fonts, images, or audio, drop them under
   `public/` and reference with `staticFile('your-asset.png')` (import
   `staticFile` from `remotion`).
4. Adjust the parent `<Composition durationInFrames={…}>` in
   `src/video/Root.tsx` so total length covers your new scene.

**Add a second composition** (e.g. a 6-second social cut):
1. Create `src/video/Short.tsx` exporting a new component.
2. Add a sibling `<Composition id="Short" component={Short} … />` in
   `Root.tsx`.
3. Render with `npm run video:render -- src/video/Root.tsx Short out/short.mp4`
   (the existing `video:render` script is hardcoded to `MyVideo` — for a
   second comp either run `remotion render` directly or duplicate the
   script).

**Render headlessly** (CI / production):

```bash
npm run video:render
# → out/video.mp4
```

**Embed in the app**: the default `<VideoPreview />` is already mounted in
`<App />`. To render a different composition in-app, edit
`src/components/VideoPreview.tsx` and swap the `component=` and
`inputProps=` for the new composition.

## Pitfalls

- **Never call hooks (`useState`, `useEffect`) inside Remotion scene
  components if the value must be deterministic per frame.** Renders must
  be reproducible for headless rendering to work. Use `useCurrentFrame`
  + pure math instead.
- **Asset paths**: in dev the browser serves from `/`, but `remotion render`
  uses Node's file resolution. Always go through `staticFile('foo.png')`
  rather than hardcoded paths.
- **Audio**: use `<Audio src={staticFile('music.mp3')} />`. For per-scene
  audio inside a `<Sequence>`, the `from`/`durationInFrames` of the
  parent sequence clips it automatically.
- **Output codec**: `remotion render` defaults to H.264 MP4. For lossless
  ProRes pass `--codec=prores-4444`. For GIFs pass
  `--codec=gif --output=out.gif`.

## When to dig deeper

See `references/timing-and-easing.md` for a longer treatment of `spring`,
`interpolate`, frame math, and how to compose nested `<Sequence>`s
without drifting timestamps.
