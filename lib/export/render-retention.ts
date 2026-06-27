import { deleteRender } from "@remotion/lambda/client";

import type { DbRenderJob } from "@/lib/db/render-jobs";
import { updateRenderJob } from "@/lib/db/render-jobs";
import { deleteFromR2 } from "@/lib/storage/r2";

import { getRemotionLambdaRegion } from "./lambda-config";

/** Days to keep finished MP4 exports in R2 (default 7). */
export function getExportRetentionDays(): number {
  const raw = process.env.EXPORT_RETENTION_DAYS?.trim();
  if (!raw) return 7;
  const days = Number.parseInt(raw, 10);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export function isRenderJobExpired(job: DbRenderJob): boolean {
  if (!job.completedAt || !job.outputStorageKey) return false;
  const ttlMs = getExportRetentionDays() * 24 * 60 * 60 * 1000;
  return Date.now() > job.completedAt.getTime() + ttlMs;
}

export async function deleteR2ExportFile(
  storageKey: string | null | undefined,
): Promise<void> {
  if (!storageKey) return;
  try {
    await deleteFromR2(storageKey);
  } catch {
    /* best effort */
  }
}

export async function deleteRemotionLambdaRender(
  job: Pick<DbRenderJob, "remotionRenderId" | "remotionBucketName">,
): Promise<void> {
  if (!job.remotionRenderId || !job.remotionBucketName) return;
  try {
    await deleteRender({
      region: getRemotionLambdaRegion() as Parameters<
        typeof deleteRender
      >[0]["region"],
      bucketName: job.remotionBucketName,
      renderId: job.remotionRenderId,
    });
  } catch {
    /* best effort — render may already be removed */
  }
}

/** Remove R2 object and clear DB pointer; keeps job row for history. */
export async function clearRenderJobOutput(job: DbRenderJob): Promise<void> {
  await deleteR2ExportFile(job.outputStorageKey);
  if (job.outputStorageKey) {
    await updateRenderJob(job.id, { outputStorageKey: null });
  }
}

/** Drop expired export; returns true if the job was purged. */
export async function purgeExpiredRenderJob(job: DbRenderJob): Promise<boolean> {
  if (!isRenderJobExpired(job)) return false;
  await clearRenderJobOutput(job);
  return true;
}

/** After a successful export, remove Lambda S3 artifacts (copied to R2). */
export async function cleanupLambdaRenderAfterR2Copy(
  job: DbRenderJob,
): Promise<void> {
  await deleteRemotionLambdaRender(job);
}
