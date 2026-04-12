/** Output sizes for Remotion — driven by the `aspectRatio` default prop + calculateMetadata. */

export type VideoAspectRatio = "9:16" | "16:9";

export function getDimensionsForAspect(aspect: VideoAspectRatio): {
  width: number;
  height: number;
} {
  if (aspect === "16:9") {
    return { width: 1920, height: 1080 };
  }
  return { width: 1080, height: 1920 };
}

/**
 * Largest size that fits inside the container while matching the composition aspect ratio.
 * Use this for the Studio player so 16:9 / 9:16 fills the preview without letterboxing/pillarboxing.
 */
export function fitCompositionToContainer(
  containerW: number,
  containerH: number,
  compW: number,
  compH: number,
): { width: number; height: number } {
  if (containerW <= 0 || containerH <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = compW / compH;
  const containerRatio = containerW / containerH;
  let width: number;
  let height: number;
  if (containerRatio > ratio) {
    height = Math.floor(containerH);
    width = Math.floor(height * ratio);
  } else {
    width = Math.floor(containerW);
    height = Math.floor(width / ratio);
  }
  return { width, height };
}
