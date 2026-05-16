import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Bottom-third caption with a spring-eased entrance. Use inside a <Sequence>
 * to time it to a specific beat.
 */
export const Caption = ({ text }: { text: string }): JSX.Element => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', paddingBottom: 120 }}>
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
