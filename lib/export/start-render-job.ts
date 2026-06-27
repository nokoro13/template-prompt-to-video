import { renderMediaOnLambda } from "@remotion/lambda/client";

import {
  getLatestCompleteRenderJob,
  insertRenderJob,
  updateRenderJob,
} from "@/lib/db/render-jobs";
import { getProjectForUser } from "@/lib/db/projects";
import { getTotalDurationInFrames } from "@/lib/studio/timeline";
import { isDatabaseStorageEnabled } from "@/lib/storage/constants";
import { readProjectJson } from "@/lib/storage/project-storage";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import type { Timeline } from "@/src/lib/types";

import {
  buildLambdaInputProps,
  buildSceneAssetPresignedUrls,
  sanitizeDownloadFileName,
} from "./build-lambda-input";
import { CLIPNG_EXPORT_COMPOSITION_ID, requireRemotionLambdaConfig } from "./lambda-config";
import { getValidCachedRenderJob } from "./purge-project-exports";
import { pollAndAdvanceRenderJob } from "./poll-render-job";

/** @see https://remotion.dev/docs/lambda/concurrency#too-many-functions */
const REMOTION_MAX_LAMBDA_FUNCTIONS = 200;
const REMOTION_MIN_FRAMES_PER_LAMBDA = 20;

function getFramesPerLambda(timeline: Timeline): number {
  const frameCount = getTotalDurationInFrames(timeline);
  return Math.max(
    REMOTION_MIN_FRAMES_PER_LAMBDA,
    Math.ceil(frameCount / REMOTION_MAX_LAMBDA_FUNCTIONS),
  );
}

export async function startProjectExport(options: {
  userId: string;
  projectSlug: string;
  aspectRatio: VideoAspectRatio;
  force?: boolean;
}): Promise<
  | { jobId: string; cached: true; downloadUrl: string; fileName: string }
  | { jobId: string; cached: false }
> {
  if (!isDatabaseStorageEnabled()) {
    throw new Error("Video export requires DATABASE_URL.");
  }

  const project = await getProjectForUser(options.userId, options.projectSlug);
  if (!project) {
    throw new Error("Project not found");
  }

  const timeline = await readProjectJson<Timeline>(
    options.userId,
    options.projectSlug,
    "timeline.json",
  );
  if (!timeline) {
    throw new Error("Timeline not found. Build the timeline before exporting.");
  }
  timeline.elements.sort((a, b) => a.startMs - b.startMs);

  if (!options.force) {
    const cachedRaw = await getLatestCompleteRenderJob(
      options.userId,
      options.projectSlug,
      options.aspectRatio,
      project.updatedAt,
    );
    const cached = await getValidCachedRenderJob(cachedRaw);
    if (cached?.outputStorageKey) {
      const polled = await pollAndAdvanceRenderJob(options.userId, cached.id);
      if (polled?.downloadUrl) {
        return {
          jobId: cached.id,
          cached: true,
          downloadUrl: polled.downloadUrl,
          fileName: polled.fileName ?? cached.outputFileName ?? "video.mp4",
        };
      }
    }
  }

  const fileName = sanitizeDownloadFileName(project.title, options.projectSlug);
  const job = await insertRenderJob({
    userId: options.userId,
    projectSlug: options.projectSlug,
    aspectRatio: options.aspectRatio,
    projectUpdatedAt: project.updatedAt,
    outputFileName: fileName,
  });

  const { functionName, region, serveUrl } = requireRemotionLambdaConfig();
  const sceneAssetUrls = await buildSceneAssetPresignedUrls(
    options.userId,
    options.projectSlug,
    timeline,
  );
  const inputProps = buildLambdaInputProps({
    timeline,
    aspectRatio: options.aspectRatio,
    projectSlug: options.projectSlug,
    sceneAssetUrls,
  });

  const framesPerLambda = getFramesPerLambda(timeline);

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: region as Parameters<typeof renderMediaOnLambda>[0]["region"],
      functionName,
      serveUrl,
      composition: CLIPNG_EXPORT_COMPOSITION_ID,
      inputProps,
      codec: "h264",
      imageFormat: "jpeg",
      maxRetries: 1,
      framesPerLambda,
      privacy: "public",
      outName: `renders/${job.id}.mp4`,
      downloadBehavior: {
        type: "download",
        fileName,
      },
    });

    await updateRenderJob(job.id, {
      status: "running",
      remotionRenderId: renderId,
      remotionBucketName: bucketName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to start Lambda render";
    await updateRenderJob(job.id, {
      status: "error",
      error: msg.slice(0, 2000),
      completedAt: new Date(),
    });
    throw new Error(msg);
  }

  return { jobId: job.id, cached: false };
}
