import { staticFile } from "remotion";
import { FPS, INTRO_DURATION } from "./constants";
import { BackgroundElement, Timeline } from "./types";

export const loadTimelineFromFile = async (filename: string) => {
  const res = await fetch(staticFile(filename));
  const json = await res.json();
  const timeline = json as Timeline;
  timeline.elements.sort((a, b) => a.startMs - b.startMs);

  const lengthMs =
    timeline.elements.length > 0
      ? timeline.elements[timeline.elements.length - 1].endMs / 1000
      : 0;
  const lengthFrames = Math.floor(lengthMs * FPS);

  return { timeline, lengthFrames };
};

export const calculateFrameTiming = (
  startMs: number,
  endMs: number,
  options: { includeIntro?: boolean; addIntroOffset?: boolean } = {},
) => {
  const { includeIntro = false, addIntroOffset = false } = options;

  const startFrame =
    (startMs * FPS) / 1000 + (addIntroOffset ? INTRO_DURATION : 0);
  const duration =
    ((endMs - startMs) * FPS) / 1000 + (includeIntro ? INTRO_DURATION : 0);

  return { startFrame, duration };
};

export const calculateBlur = ({
  item,
  localMs,
}: {
  item: BackgroundElement;
  localMs: number;
}) => {
  const maxBlur = 1;
  const fadeMs = 1000;

  const startMs = item.startMs;
  const endMs = item.endMs;

  const { enterTransition } = item;
  const { exitTransition } = item;

  if (enterTransition === "blur" && localMs < fadeMs) {
    return (1 - localMs / fadeMs) * maxBlur;
  }

  if (exitTransition === "blur" && localMs > endMs - startMs - fadeMs) {
    return (1 - (endMs - startMs - localMs) / fadeMs) * maxBlur;
  }

  return 0;
};

const ASPECT_SUFFIXES = new Set(["9-16", "16-9"]);

/**
 * Composition id is the project slug (e.g. `my-story`). Assets live under `content/my-story/`.
 * Legacy ids with `--9-16` / `--16-9` or `__` suffixes are still normalized to the slug.
 */
export function getProjectSlugFromCompositionId(compositionId: string): string {
  const legacySep = "__";
  const legacyIdx = compositionId.indexOf(legacySep);
  if (legacyIdx !== -1) {
    return compositionId.slice(0, legacyIdx);
  }

  const parts = compositionId.split("--");
  if (parts.length >= 2) {
    const aspect = parts[parts.length - 1] ?? "";
    if (ASPECT_SUFFIXES.has(aspect)) {
      return parts.slice(0, -1).join("--");
    }
  }
  return compositionId;
}

export const getTimelinePath = (proj: string) =>
  `content/${proj}/timeline.json`;

export const getImagePath = (proj: string, uid: string) =>
  `content/${proj}/images/${uid}.png`;

export const getAudioPath = (proj: string, uid: string) =>
  `content/${proj}/audio/${uid}.mp3`;

export type SceneAssetUrls = Record<
  string,
  { image: string; audio: string }
>;

/** Resolve image src for Remotion: presigned URL, remote storage API, or local `staticFile`. */
export function resolveImageSrc(
  project: string,
  uid: string,
  assetBaseUrl?: string,
  sceneAssetUrls?: SceneAssetUrls,
): string {
  if (sceneAssetUrls?.[uid]?.image) {
    return sceneAssetUrls[uid].image;
  }
  if (assetBaseUrl) {
    return `${assetBaseUrl.replace(/\/$/, "")}/images/${uid}.png`;
  }
  return staticFile(getImagePath(project, uid));
}

/** Resolve audio src for Remotion: presigned URL, remote storage API, or local `staticFile`. */
export function resolveAudioSrc(
  project: string,
  uid: string,
  assetBaseUrl?: string,
  sceneAssetUrls?: SceneAssetUrls,
): string {
  if (sceneAssetUrls?.[uid]?.audio) {
    return sceneAssetUrls[uid].audio;
  }
  if (assetBaseUrl) {
    return `${assetBaseUrl.replace(/\/$/, "")}/audio/${uid}.mp3`;
  }
  return staticFile(getAudioPath(project, uid));
}
