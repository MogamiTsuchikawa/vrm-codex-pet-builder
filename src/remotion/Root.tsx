import { Composition } from 'remotion';
import { PromotionVideo } from './PromotionVideo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="Promotion"
      component={PromotionVideo}
      durationInFrames={360}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
