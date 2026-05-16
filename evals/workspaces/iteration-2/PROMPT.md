# Eval prompt — shared by both runs

You are in a project directory. Your task:

**Build a Remotion video composition** (in this current working directory)
that produces a 10-second, 1080×1080, 30fps video containing:

1. A title "Hello" that fades in over the first 30 frames on a dark
   background, and remains visible for the rest of the video.
2. Three captions appearing sequentially:
   - "one" from frame 120 to frame 180 (60-frame span)
   - "two" from frame 180 to frame 240
   - "three" from frame 240 to frame 300
     Each caption should pop in with some easing.

Verify your work by running `pnpm install` and then `pnpm typecheck` —
both MUST succeed. **Do not** run the full headless render (`pnpm
video:render`) — typecheck is sufficient verification for this eval.

When done, print "EVAL_DONE" on its own line and stop.

You may use any libraries you need. The composition file path is your
choice but should be runnable via `npx remotion render <root> <id>`.

You have a hard time budget — finish in one focused attempt rather than
iterating endlessly.
