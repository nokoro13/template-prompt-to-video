import * as fs from "fs";
import { MAX_GEMINI_REFERENCE_IMAGES } from "./generate-with-gemini";
import type { GeminiReferenceMeta } from "./generate-with-gemini";

/**
 * Appends the previous scene's rendered PNG as the last reference image so Gemini
 * can match character art, proportions, and environment across consecutive shots.
 * Trims trailing **character** reference slots first (never style refs) to stay under the limit.
 */
export function mergeReferencePathsWithPreviousScene(
  basePaths: string[] | undefined,
  baseMeta: GeminiReferenceMeta | undefined,
  previousScenePath: string | undefined,
): { paths: string[]; referenceMeta: GeminiReferenceMeta | undefined } {
  const pathsIn = [...(basePaths ?? [])];
  const cappedBase = pathsIn.slice(0, MAX_GEMINI_REFERENCE_IMAGES);

  if (!previousScenePath?.trim() || !fs.existsSync(previousScenePath)) {
    return { paths: cappedBase, referenceMeta: baseMeta };
  }

  const sc = baseMeta?.styleImageCount ?? 0;
  const names = [...(baseMeta?.characterNames ?? [])];

  if (cappedBase.length === 0) {
    return {
      paths: [previousScenePath],
      referenceMeta: {
        styleImageCount: 0,
        characterNames: [],
        continuityImageCount: 1,
      },
    };
  }

  const paths = [...cappedBase];
  while (paths.length >= MAX_GEMINI_REFERENCE_IMAGES && paths.length > sc) {
    paths.pop();
    if (names.length > 0) names.pop();
  }

  if (paths.length >= MAX_GEMINI_REFERENCE_IMAGES) {
    return { paths: cappedBase, referenceMeta: baseMeta };
  }

  paths.push(previousScenePath);
  return {
    paths,
    referenceMeta: {
      styleImageCount: sc,
      characterNames: names,
      continuityImageCount: 1,
    },
  };
}
