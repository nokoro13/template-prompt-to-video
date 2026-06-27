import { Composition, getStaticFiles } from "remotion";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { getDimensionsForAspect } from "./lib/aspect-compositions";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTotalDurationInFrames } from "../lib/studio/timeline";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";

export const CLIPNG_EXPORT_COMPOSITION_ID = "ClipngExport";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      <Composition
        id={CLIPNG_EXPORT_COMPOSITION_ID}
        component={AIVideo}
        fps={FPS}
        width={1080}
        height={1920}
        schema={aiVideoSchema}
        defaultProps={{
          timeline: null,
          aspectRatio: "9:16" as const,
        }}
        calculateMetadata={async ({ props }) => {
          const aspect = props.aspectRatio ?? "9:16";
          const dims = getDimensionsForAspect(aspect);
          const timeline = props.timeline;
          if (!timeline) {
            throw new Error(
              `${CLIPNG_EXPORT_COMPOSITION_ID} requires timeline in inputProps`,
            );
          }
          return {
            durationInFrames: getTotalDurationInFrames(timeline),
            width: dims.width,
            height: dims.height,
            props,
          };
        }}
      />

      {timelines.map((storyName) => {
        const { width, height } = getDimensionsForAspect("9:16");
        return (
          <Composition
            key={storyName}
            id={storyName}
            component={AIVideo}
            fps={FPS}
            width={width}
            height={height}
            schema={aiVideoSchema}
            defaultProps={{
              timeline: null,
              aspectRatio: "9:16",
            }}
            calculateMetadata={async ({ props }) => {
              const aspect = props.aspectRatio ?? "9:16";
              const dims = getDimensionsForAspect(aspect);
              const { lengthFrames, timeline } = await loadTimelineFromFile(
                getTimelinePath(storyName),
              );

              return {
                durationInFrames: lengthFrames + INTRO_DURATION,
                width: dims.width,
                height: dims.height,
                props: {
                  ...props,
                  timeline,
                },
              };
            }}
          />
        );
      })}
    </>
  );
};
