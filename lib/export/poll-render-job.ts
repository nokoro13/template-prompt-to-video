import { getRenderProgress } from "@remotion/lambda/client";

import {
  getRenderJobForUser,
  updateRenderJob,
} from "@/lib/db/render-jobs";
import { getR2SignedReadUrl } from "@/lib/storage/r2";

import { copyLambdaRenderToR2 } from "./copy-lambda-render-to-r2";
import {
  assertRenderJobDownloadable,
  purgeProjectExportFiles,
} from "./purge-project-exports";
import {
  cleanupLambdaRenderAfterR2Copy,
  purgeExpiredRenderJob,
} from "./render-retention";
import { requireRemotionLambdaConfig } from "./lambda-config";

export type ExportJobResponse = {
  id: string;
  status: string;
  progress: number;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
};

export async function pollAndAdvanceRenderJob(
  userId: string,
  jobId: string,
): Promise<ExportJobResponse | null> {
  const job = await getRenderJobForUser(userId, jobId);
  if (!job) return null;

  if (job.status === "complete" && job.outputStorageKey) {
    if (await purgeExpiredRenderJob(job)) {
      return {
        id: job.id,
        status: "error",
        progress: 1,
        error: "This export has expired. Export the project again.",
      };
    }
    const downloadable = await assertRenderJobDownloadable(job);
    if (!downloadable.ok) {
      return {
        id: job.id,
        status: "error",
        progress: 1,
        error: downloadable.reason,
      };
    }
    const downloadUrl = await getR2SignedReadUrl(job.outputStorageKey, 3600);
    return {
      id: job.id,
      status: "complete",
      progress: 1,
      downloadUrl,
      fileName: job.outputFileName ?? "video.mp4",
    };
  }

  if (job.status === "error") {
    return {
      id: job.id,
      status: "error",
      progress: job.progress ?? 0,
      error: job.error ?? "Render failed",
    };
  }

  if (!job.remotionRenderId || !job.remotionBucketName) {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
    };
  }

  const { functionName, region } = requireRemotionLambdaConfig();

  const progress = await getRenderProgress({
    renderId: job.remotionRenderId,
    bucketName: job.remotionBucketName,
    functionName,
    region: region as Parameters<typeof getRenderProgress>[0]["region"],
  });

  if (progress.fatalErrorEncountered) {
    const err =
      progress.errors[0]?.message ??
      progress.errors[0]?.name ??
      "Remotion Lambda render failed";
    await updateRenderJob(jobId, {
      status: "error",
      error: err.slice(0, 2000),
      completedAt: new Date(),
    });
    return {
      id: job.id,
      status: "error",
      progress: progress.overallProgress,
      error: err,
    };
  }

  if (progress.done) {
    const outKey = progress.outKey;
    if (!outKey) {
      await updateRenderJob(jobId, {
        status: "error",
        error: "Render finished but output key is missing.",
        completedAt: new Date(),
      });
      return {
        id: job.id,
        status: "error",
        progress: 1,
        error: "Render finished but output key is missing.",
      };
    }

    try {
      const storageKey = await copyLambdaRenderToR2({
        userId,
        jobId,
        bucketName: job.remotionBucketName,
        outKey,
      });
      await updateRenderJob(jobId, {
        status: "complete",
        outputStorageKey: storageKey,
        progress: 1,
        completedAt: new Date(),
      });
      const completedJob = await getRenderJobForUser(userId, jobId);
      if (completedJob) {
        await cleanupLambdaRenderAfterR2Copy(completedJob);
        await purgeProjectExportFiles(userId, job.projectSlug, {
          exceptJobId: jobId,
        });
      }
      const downloadUrl = await getR2SignedReadUrl(storageKey, 3600);
      return {
        id: job.id,
        status: "complete",
        progress: 1,
        downloadUrl,
        fileName: job.outputFileName ?? "video.mp4",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to store render output";
      await updateRenderJob(jobId, {
        status: "error",
        error: msg.slice(0, 2000),
        completedAt: new Date(),
      });
      return {
        id: job.id,
        status: "error",
        progress: 1,
        error: msg,
      };
    }
  }

  await updateRenderJob(jobId, {
    status: "running",
    progress: progress.overallProgress,
  });

  return {
    id: job.id,
    status: "running",
    progress: progress.overallProgress,
  };
}
