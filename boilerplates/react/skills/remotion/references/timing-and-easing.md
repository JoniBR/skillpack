# Remotion timing & easing — deeper reference

Load this when the basic `interpolate` / `spring` snippets in `SKILL.md`
aren't enough — i.e. when designing multi-stage animations, nesting
sequences, syncing to audio, or chasing reproducibility bugs.

## Frame math: the only clock that matters

Remotion's universe is frame-indexed, not time-indexed. **`useCurrentFrame()`
returns an integer in `[0, durationInFrames)`**, where frame 0 is the first
visible frame. To go from time to frames, multiply by `fps`:

```ts
const { fps } = useVideoConfig();
const oneSecond  = fps;          // e.g. 30
const halfSecond = fps / 2;
```

For sub-frame precision (rare), use `useCurrentFrame` plus the fractional
offset returned by `useVideoConfig().fps` — but in practice, snap your
choreography to whole frames. It's easier to debug and renders identically.

## `interpolate(frame, input[], output[], opts)`

Linear by default. Common opts:

- `extrapolateLeft: 'clamp' | 'extend'` — what happens before `input[0]`.
- `extrapolateRight: 'clamp' | 'extend'` — what happens after the last input.
- `easing: Easing.bezier(.4, 0, .2, 1)` — pass a custom cubic-bezier easing.

```ts
import { interpolate, Easing } from 'remotion';

// Fade in 0..30, hold, fade out 120..150.
const opacity = interpolate(
  frame,
  [0, 30, 120, 150],
  [0, 1, 1, 0],
  { easing: Easing.bezier(.4, 0, .2, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
);
```

The input array MUST be strictly increasing — duplicate frames will throw
at runtime.

## `spring({ frame, fps, config, from?, to? })`

Physics-based, framerate-aware. Defaults: `damping=10, mass=1, stiffness=100`.
Returns a number in `[from, to]` (defaults `[0, 1]`).

```ts
import { spring } from 'remotion';

// Pop in starting at frame 0, with snappier physics than the default.
const scale = spring({
  frame,
  fps,
  config: { damping: 12, stiffness: 160, mass: 0.8 },
});
```

**Delaying a spring**: don't add a constant to `frame` — instead, gate the
spring on the local-to-sequence frame. Two patterns:

1. Wrap in a `<Sequence from={delay}>`: inside, `useCurrentFrame()` returns
   `0` at the start of the sequence. The spring naturally starts there.
2. Manual clamp: `spring({ frame: Math.max(0, frame - delay), … })`.

Pattern 1 is preferred — it composes, it keeps the spring's identity, and
it auto-clips off-screen frames.

## Nesting `<Sequence>` without drift

`<Sequence from={X} durationInFrames={Y}>` does two things:

1. Renders its children only when `X ≤ globalFrame < X+Y`.
2. Inside, `useCurrentFrame()` returns `globalFrame - X`.

Nesting works as you'd expect — a `<Sequence from={5}>` inside a parent
`<Sequence from={100}>` starts rendering at global frame 105, and child
hooks see local frame 0 there.

Common drift bug: **passing `from={globalStart}` to a child that's already
inside a parent sequence.** Use a local offset instead, and let parents
compose.

## Syncing to audio

Use `<Audio src={staticFile('voice.mp3')} />` inside a `<Sequence>` to clip
it to a beat. For frame-accurate sync, design your timing in seconds
first (`fps * 3.2`) — easier to reason about than raw frames.

For waveform-driven animation (e.g. caption pops with the kick drum), use
`@remotion/media-utils`:

```ts
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const audioData = useAudioData(staticFile('voice.mp3'));
if (audioData) {
  const samples = visualizeAudio({ fps, frame, audioData, numberOfSamples: 16 });
  // samples[] is the normalized amplitude per band at this frame.
}
```

`useAudioData` is async — guard with `if (audioData)` and return a
fallback frame otherwise.

## Reproducibility checklist

Headless rendering re-evaluates every frame independently. Anything that
varies between calls breaks renders. Avoid:

- `Math.random()` without a seed. Use a seeded PRNG keyed on `frame`.
- `Date.now()` / `new Date()`. Compute from `frame / fps` instead.
- `useState` / `useEffect` for animation values. Use frame math.
- Network fetches inside scene components. Preload to `public/` and use
  `staticFile()`.

If a render produces different output than the studio preview, 95% of the
time the cause is in the list above.

## Performance & rendering

- `remotion render` uses Chrome Headless under the hood; the dev box needs
  enough RAM (≥ 2 GB per concurrent renderer).
- Default concurrency = number of CPU cores. Override with `--concurrency=4`
  for lower memory pressure.
- For 1080p H.264, expect ~2-5 frames/sec on a laptop. Plan for ~3 minutes
  to render a 15-second clip end-to-end.
- For drafts, drop to 720p in `Root.tsx` (`width={1280} height={720}`) —
  that's roughly a 2-3× speedup.
