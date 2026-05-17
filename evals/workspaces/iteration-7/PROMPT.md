Build a Remotion video in this working directory that produces a 10-second,
1080×1080, 30fps video containing:

1. A title "Hello" that fades in over the first 30 frames on a dark
   background, and remains visible for the rest of the video.
2. Three captions appearing sequentially:
   - "one" from frame 120 to frame 180 (60-frame span)
   - "two" from frame 180 to frame 240
   - "three" from frame 240 to frame 300
     Each caption should pop in with some easing.

Verification — all three MUST succeed:

1. install dependencies (pnpm/npm/bun — your choice) — exits 0.
2. typecheck (pnpm typecheck / tsc --noEmit) — exits 0.
3. Render the video to `out/video.mp4`. The MP4 file MUST exist and be at
   least 50 KB.

Be efficient — one focused attempt. Print EVAL_DONE on its own line at the end.
