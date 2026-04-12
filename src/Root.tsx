import { Composition, getStaticFiles } from "remotion";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { getDimensionsForAspect } from "./lib/aspect-compositions";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
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
