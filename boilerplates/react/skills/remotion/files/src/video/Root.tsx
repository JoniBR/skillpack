import { Composition } from 'remotion';
import { MyVideo } from './MyVideo.js';

/**
 * Remotion registers compositions via this Root component. Each <Composition />
 * declares a renderable video: its id (used by `remotion render`), the
 * component to render, dimensions, framerate, and total duration in frames.
 *
 * The default `MyVideo` is a 15-second 1080x1080 square composition at 30fps
 * (matches the geometry used in the canonical remotion-best-practices skill).
 * Common preset swaps:
 *   - 1080p landscape:  width={1920} height={1080}
 *   - Vertical / Reels: width={1080} height={1920}
 *
 * Add new compositions here as siblings.
 */
export const RemotionRoot = (): JSX.Element => (
  <>
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ title: 'Hello from skillpack' }}
    />
  </>
);
