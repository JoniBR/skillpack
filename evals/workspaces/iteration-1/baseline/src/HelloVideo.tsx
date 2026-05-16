import type React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <h1
      style={{
        color: 'white',
        fontSize: 160,
        fontFamily: 'sans-serif',
        opacity,
        margin: 0,
      }}
    >
      Hello
    </h1>
  );
};

const Caption: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 180, mass: 0.6},
  });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 180,
        width: '100%',
        textAlign: 'center',
        color: 'white',
        fontSize: 120,
        fontFamily: 'sans-serif',
        transform: `scale(${scale})`,
      }}
    >
      {text}
    </div>
  );
};

export const HelloVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0b0d12',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Title />
      <Sequence from={120} durationInFrames={60}>
        <Caption text="one" />
      </Sequence>
      <Sequence from={180} durationInFrames={60}>
        <Caption text="two" />
      </Sequence>
      <Sequence from={240} durationInFrames={60}>
        <Caption text="three" />
      </Sequence>
    </AbsoluteFill>
  );
};
