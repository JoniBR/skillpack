import type React from 'react';
import {Composition} from 'remotion';
import {HelloVideo} from './HelloVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HelloVideo"
      component={HelloVideo}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
