Build a Remotion video composition in this working directory that produces a
10-second, 1080×1080, 30fps video containing:

1. A title "Hello" that fades in over the first 30 frames on a dark
   background, and remains visible for the rest of the video.
2. Three captions appearing sequentially:
   - "one" from frame 120 to frame 180 (60-frame span)
   - "two" from frame 180 to frame 240
   - "three" from frame 240 to frame 300
   Each caption should pop in with some easing.

Verify by running `pnpm install` then `pnpm typecheck` — both MUST pass.
Do not run the full headless render. Be efficient — one focused attempt.
