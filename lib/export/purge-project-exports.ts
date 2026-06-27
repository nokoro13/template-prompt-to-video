import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import type { DbRenderJob } from "@/lib/db/render-jobs";

import {
  clearRenderJobOutput,
  isRenderJobExpired,
  purgeExpiredRenderJob,
} from "./render-retention";

export async function listCompleteRenderJobsForProject(
  userId: string,
  projectSlug: string,
): Promise<DbRenderJob[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.renderJobs)
    .where(
      and(
        eq(schema.renderJobs.userId, userId),
        eq(schema.renderJobs.projectSlug, projectSlug),
        eq(schema.renderJobs.status, "complete"),
      ),
    )
    .orderBy(desc(schema.renderJobs.completedAt));
}

/**
 * Delete R2 exports for a project except an optional job id.
 * Used when a new export finishes or the project is edited.
 */
export async function purgeProjectExportFiles(
  userId: string,
  projectSlug: string,
  options?: { exceptJobId?: string },
): Promise<void> {
  const jobs = await listCompleteRenderJobsForProject(userId, projectSlug);
  await Promise.all(
    jobs
      .filter((job) => job.id !== options?.exceptJobId && job.outputStorageKey)
      .map((job) => clearRenderJobOutput(job)),
  );
}

/**
 * Invalidate exports tied to an older project revision (project was edited).
 */
export async function purgeExportsBeforeProjectRevision(
  userId: string,
  projectSlug: string,
  projectUpdatedAt: Date,
): Promise<void> {
  const jobs = await listCompleteRenderJobsForProject(userId, projectSlug);
  await Promise.all(
    jobs
      .filter(
        (job) =>
          job.outputStorageKey &&
          (!job.projectUpdatedAt ||
            job.projectUpdatedAt.getTime() !== projectUpdatedAt.getTime()),
      )
      .map((job) => clearRenderJobOutput(job)),
  );
}

/** Returns a usable cached job or null after enforcing TTL expiry. */
export async function getValidCachedRenderJob(
  job: DbRenderJob | null,
): Promise<DbRenderJob | null> {
  if (!job?.outputStorageKey) return null;
  if (await purgeExpiredRenderJob(job)) return null;
  if (isRenderJobExpired(job)) return null;
  return job;
}

/** Ensure job output exists and is within retention before download. */
export async function assertRenderJobDownloadable(
  job: DbRenderJob,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!job.outputStorageKey) {
    return { ok: false, reason: "Export file is no longer available." };
  }
  if (await purgeExpiredRenderJob(job)) {
    return {
      ok: false,
      reason: "This export has expired. Export the project again.",
    };
  }
  return { ok: true };
}
