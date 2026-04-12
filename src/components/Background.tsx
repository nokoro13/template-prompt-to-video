import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { FPS } from "../lib/constants";
import { BackgroundElement } from "../lib/types";
import { calculateBlur, getImagePath } from "../lib/utils";

const EXTRA_SCALE = 0.2;

export const Background: React.FC<{
  item: BackgroundElement;
  project: string;
}> = ({ item, project }) => {
  const frame = useCurrentFrame();
  const localMs = (frame / FPS) * 1000;

  let animScale = 1;

  const currentScaleAnim = item.animations?.find(
    (anim) =>
      anim.type === "scale" && anim.startMs <= localMs && anim.endMs >= localMs,
  );

  if (currentScaleAnim) {
    const progress =
      (localMs - currentScaleAnim.startMs) /
      (currentScaleAnim.endMs - currentScaleAnim.startMs);
    animScale =
      EXTRA_SCALE +
      progress * (currentScaleAnim.to - currentScaleAnim.from) +
      currentScaleAnim.from;
  }

  const blur = calculateBlur({ item, localMs });
  const maxBlur = 25;

  const currentBlur = maxBlur * blur;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(getImagePath(project, item.imageUrl))}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          // Tailwind preflight sets img { max-width: 100%; height: auto } — breaks cover.
          maxWidth: "none",
          maxHeight: "none",
          transform: `scale(${animScale})`,
          transformOrigin: "center center",
          filter: `blur(${currentBlur}px)`,
          WebkitFilter: `blur(${currentBlur}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
