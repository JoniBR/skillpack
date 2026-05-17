import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

/**
 * Bottom-third caption with a spring-eased entrance AND a short opacity
 * fade-out at the tail of its <Sequence>. Use inside a <Sequence> to time
 * it to a specific beat:
 *
 *   <Sequence from={150} durationInFrames={75}>
 *     <Caption text="Type-safe by default" />
 *   </Sequence>
 *
 * NOTE: `useCurrentFrame()` rebases to 0 inside a <Sequence>, and
 * `useVideoConfig().durationInFrames` also reflects the sequence's
 * duration (not the parent composition's). That's how this component
 * knows when to fade out — no need to pass timing as props.
 */
export const Caption = ({ text }: { text: string }): JSX.Element => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  // Last ~12 frames (~0.4s at 30fps) fade out.
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 12), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  // Entrance opacity: snap on in the first 4 frames (springs scale, not opacity).
  const enter = interpolate(frame, [0, 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = enter * exit;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', paddingBottom: 120, opacity }}>
      <div style={{ textAlign: 'center', transform: `scale(${scale})` }}>
        <span
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            fontSize: 40,
            backdropFilter: 'blur(8px)',
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
