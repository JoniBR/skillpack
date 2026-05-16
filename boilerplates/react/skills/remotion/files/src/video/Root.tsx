import { Composition } from 'remotion';
import { MyVideo } from './MyVideo.js';

/**
 * Remotion registers compositions via this Root component. Each <Composition />
 * declares a renderable video: its id (used by `remotion render`), the
 * component to render, dimensions, framerate, and total duration in frames.
 *
 * Add new compositions here as siblings. The default `MyVideo` is a 15s
 * (450 frames at 30fps) 1080p reel — adjust to taste.
 */
export const RemotionRoot = (): JSX.Element => (
  <>
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: 'Hello from skillpack' }}
    />
  </>
);
