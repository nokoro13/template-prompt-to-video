import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import type { Timeline } from "@/src/lib/types";

import { buildProjectStoragePrefix } from "../storage/assets";
import { isR2StorageEnabled } from "../storage/constants";
import { getR2SignedReadUrl } from "../storage/r2";

const PRESIGNED_ASSET_TTL_SECONDS = 60 * 60 * 4; // 4 hours

export type SceneAssetUrls = Record<
  string,
  { image: string; audio: string }
>;

function projectAssetKey(
  userId: string,
  slug: string,
  relativePath: string,
): string {
  return `${buildProjectStoragePrefix(userId, slug)}/${relativePath.replace(/^\//, "")}`;
}

/** Collect scene UIDs from timeline elements and audio tracks. */
export function collectSceneUids(timeline: Timeline): string[] {
  const uids = new Set<string>();
  for (const el of timeline.elements) {
    if (el.imageUrl) uids.add(el.imageUrl);
  }
  for (const el of timeline.audio) {
    if (el.audioUrl) uids.add(el.audioUrl);
  }
  return [...uids];
}

export async function buildSceneAssetPresignedUrls(
  userId: string,
  slug: string,
  timeline: Timeline,
): Promise<SceneAssetUrls> {
  if (!isR2StorageEnabled()) {
    throw new Error(
      "Video export requires Cloudflare R2 storage (R2_* env vars).",
    );
  }

  const uids = collectSceneUids(timeline);
  const out: SceneAssetUrls = {};

  await Promise.all(
    uids.map(async (uid) => {
      const [image, audio] = await Promise.all([
        getR2SignedReadUrl(
          projectAssetKey(userId, slug, `images/${uid}.png`),
          PRESIGNED_ASSET_TTL_SECONDS,
        ),
        getR2SignedReadUrl(
          projectAssetKey(userId, slug, `audio/${uid}.mp3`),
          PRESIGNED_ASSET_TTL_SECONDS,
        ),
      ]);
      out[uid] = { image, audio };
    }),
  );

  return out;
}

export function buildLambdaInputProps(options: {
  timeline: Timeline;
  aspectRatio: VideoAspectRatio;
  projectSlug: string;
  sceneAssetUrls: SceneAssetUrls;
}) {
  return {
    timeline: options.timeline,
    aspectRatio: options.aspectRatio,
    projectSlug: options.projectSlug,
    sceneAssetUrls: options.sceneAssetUrls,
  };
}

export function sanitizeDownloadFileName(title: string, slug: string): string {
  const base =
    title
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || slug;
  return `${base}.mp4`;
}
