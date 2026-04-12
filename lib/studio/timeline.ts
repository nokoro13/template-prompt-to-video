import { FPS, INTRO_DURATION } from "@/src/lib/constants";
import type { Timeline } from "@/src/lib/types";

/** Frames for main content (excluding intro card). */
export function getLengthFramesFromTimeline(timeline: Timeline): number {
  const lengthMs =
    timeline.elements.length > 0
      ? timeline.elements[timeline.elements.length - 1].endMs / 1000
      : 0;
  return Math.floor(lengthMs * FPS);
}

/** Total composition duration including intro. */
export function getTotalDurationInFrames(timeline: Timeline): number {
  return getLengthFramesFromTimeline(timeline) + INTRO_DURATION;
}
