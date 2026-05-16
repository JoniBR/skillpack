import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Caption } from './Caption.js';

/**
 * Props are optional so the composition can be referenced from Root.tsx
 * without a zod schema. If you want type-safe defaultProps with validation,
 * add `@remotion/zod-types` and pass a `schema` to <Composition>.
 */
export interface MyVideoProps {
  title?: string;
}

/**
 * 15-second product-feature reel scaffold. The structure is:
 *   - Background fade-in (frames 0..30)
 *   - Title card with eased opacity (frames 10..150)
 *   - Three captions, one per ~3-second beat (sequenced via <Sequence />)
 *
 * Replace placeholders with your scenes. To add more scenes, append more
 * <Sequence /> children inside <AbsoluteFill /> below.
 */
export const MyVideo = ({ title = 'Hello from skillpack' }: MyVideoProps): JSX.Element => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(frame, [10, 40, 130, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0f17', color: '#fff', fontFamily: 'system-ui' }}>
      <AbsoluteFill style={{ opacity: bgOpacity, background: 'radial-gradient(circle at 30% 20%, #2563eb33, transparent 60%)' }} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: titleOpacity }}>
        <h1 style={{ fontSize: 96, margin: 0 }}>{title}</h1>
      </AbsoluteFill>

      <Sequence from={fps * 5} durationInFrames={fps * 3}>
        <Caption text="Built with skillpack" />
      </Sequence>
      <Sequence from={fps * 8} durationInFrames={fps * 3}>
        <Caption text="One command, ready to ship" />
      </Sequence>
      <Sequence from={fps * 11} durationInFrames={fps * 4}>
        <Caption text="Edit src/video/MyVideo.tsx" />
      </Sequence>
    </AbsoluteFill>
  );
};
