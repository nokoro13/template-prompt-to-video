import { loadFont } from "@remotion/google-fonts/BreeSerif";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  useRemotionEnvironment,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { FPS, INTRO_DURATION } from "../lib/constants";
import { TimelineSchema } from "../lib/types";
import {
  calculateFrameTiming,
  getProjectSlugFromCompositionId,
  resolveAudioSrc,
} from "../lib/utils";
import { Background } from "./Background";
import Subtitle from "./Subtitle";

export const aiVideoSchema = z.object({
  timeline: TimelineSchema.nullable(),
  /** Set in Remotion Studio → Props to switch preview & render size. */
  aspectRatio: z.enum(["9:16", "16:9"]),
  /** When using @remotion/player, pass the content slug so asset paths resolve. */
  projectSlug: z.string().optional(),
  /** When set, image/audio load from `/api/storage/...` instead of `staticFile`. */
  assetBaseUrl: z.string().optional(),
  /** Presigned URLs for Lambda export (uid → image/audio). */
  sceneAssetUrls: z
    .record(
      z.string(),
      z.object({
        image: z.string(),
        audio: z.string(),
      }),
    )
    .optional(),
});

const { fontFamily } = loadFont();

export const AIVideo: React.FC<z.infer<typeof aiVideoSchema>> = ({
  timeline,
  projectSlug,
  assetBaseUrl,
  sceneAssetUrls,
}) => {
  const { isRendering } = useRemotionEnvironment();
  const { id, width: frameWidth } = useVideoConfig();

  if (!timeline) {
    throw new Error("Expected timeline to be fetched");
  }
  const project =
    projectSlug ?? getProjectSlugFromCompositionId(id);
  const titleFontSize = Math.min(120, Math.round(frameWidth * 0.11));

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <Sequence durationInFrames={INTRO_DURATION}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            display: "flex",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: titleFontSize,
              lineHeight: `${titleFontSize + 2}px`,
              width: "87%",
              color: "black",
              fontFamily,
              textTransform: "uppercase",
              backgroundColor: "yellow",
              paddingTop: 20,
              paddingBottom: 20,
              border: "10px solid black",
            }}
          >
            {timeline.shortTitle}
          </div>
        </AbsoluteFill>
      </Sequence>

      {timeline.elements.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { includeIntro: index === 0 },
        );

        return (
          <Sequence
            key={`bg-${project}-${element.imageUrl}`}
            from={startFrame}
            durationInFrames={duration}
            premountFor={3 * FPS}
          >
            <Background
              project={project}
              item={element}
              assetBaseUrl={assetBaseUrl}
              sceneAssetUrls={sceneAssetUrls}
            />
          </Sequence>
        );
      })}

      {timeline.text.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { addIntroOffset: true },
        );

        return (
          <Sequence
            key={`sub-${project}-${element.startMs}-${element.endMs}`}
            from={startFrame}
            durationInFrames={duration}
          >
            <Subtitle key={index} text={element.text} />
          </Sequence>
        );
      })}

      {timeline.audio.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { addIntroOffset: true },
        );
        const audioSrc = resolveAudioSrc(
          project,
          element.audioUrl,
          assetBaseUrl,
          sceneAssetUrls,
        );

        return (
          <Sequence
            key={`audio-${project}-${element.audioUrl}`}
            from={startFrame}
            durationInFrames={duration}
            premountFor={isRendering ? undefined : FPS}
          >
            {isRendering ? (
              <Audio name={`Scene ${index + 1}`} src={audioSrc} />
            ) : (
              <Html5Audio
                name={`Scene ${index + 1}`}
                src={audioSrc}
                pauseWhenBuffering
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
