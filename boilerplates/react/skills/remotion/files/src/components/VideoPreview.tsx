import { Player } from '@remotion/player';
import { MyVideo } from '../video/MyVideo'; // no `.js` — Remotion's webpack bundler doesn't honour the TS .js convention

/**
 * In-app preview of the Remotion composition, embedded via @remotion/player.
 * For headless rendering use `npm run video:render` instead.
 *
 * Dimensions match the <Composition> registered in src/video/Root.tsx
 * (1080x1080 square at 30fps, 450 frames). If you change Root.tsx geometry,
 * mirror it here too.
 */
export function VideoPreview(): JSX.Element {
  return (
    <section style={{ marginTop: 24, maxWidth: 640 }}>
      <h2 style={{ marginBottom: 12 }}>Video preview</h2>
      <Player
        component={MyVideo}
        inputProps={{ title: 'Hello from skillpack' }}
        durationInFrames={450}
        compositionWidth={1080}
        compositionHeight={1080}
        fps={30}
        controls
        style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden' }}
      />
    </section>
  );
}
