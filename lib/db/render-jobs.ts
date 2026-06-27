import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "./index";

export type DbRenderJob = typeof schema.renderJobs.$inferSelect;

export async function insertRenderJob(options: {
  userId: string;
  projectSlug: string;
  aspectRatio: string;
  projectUpdatedAt?: Date | null;
  outputFileName: string;
}): Promise<DbRenderJob> {
  const db = getDb();
  const id = randomUUID();
  const [row] = await db
    .insert(schema.renderJobs)
    .values({
      id,
      userId: options.userId,
      projectSlug: options.projectSlug,
      aspectRatio: options.aspectRatio,
      status: "pending",
      outputFileName: options.outputFileName,
      projectUpdatedAt: options.projectUpdatedAt ?? null,
      progress: 0,
    })
    .returning();
  return row;
}

export async function getRenderJobForUser(
  userId: string,
  jobId: string,
): Promise<DbRenderJob | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.renderJobs)
    .where(
      and(
        eq(schema.renderJobs.id, jobId),
        eq(schema.renderJobs.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRenderJob(
  jobId: string,
  patch: Partial<{
    status: DbRenderJob["status"];
    remotionRenderId: string | null;
    remotionBucketName: string | null;
    outputStorageKey: string | null;
    error: string | null;
    progress: number;
    completedAt: Date | null;
  }>,
): Promise<DbRenderJob | null> {
  const db = getDb();
  const rows = await db
    .update(schema.renderJobs)
    .set(patch)
    .where(eq(schema.renderJobs.id, jobId))
    .returning();
  return rows[0] ?? null;
}

/** Latest completed export for a project + aspect ratio (for instant re-download). */
export async function getLatestCompleteRenderJob(
  userId: string,
  projectSlug: string,
  aspectRatio: string,
  projectUpdatedAt?: Date | null,
): Promise<DbRenderJob | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.renderJobs)
    .where(
      and(
        eq(schema.renderJobs.userId, userId),
        eq(schema.renderJobs.projectSlug, projectSlug),
        eq(schema.renderJobs.aspectRatio, aspectRatio),
        eq(schema.renderJobs.status, "complete"),
      ),
    )
    .orderBy(desc(schema.renderJobs.completedAt))
    .limit(5);

  if (!projectUpdatedAt) {
    return rows.find((r) => r.outputStorageKey) ?? null;
  }

  return (
    rows.find(
      (r) =>
        r.outputStorageKey &&
        r.projectUpdatedAt &&
        r.projectUpdatedAt.getTime() === projectUpdatedAt.getTime(),
    ) ?? null
  );
}

export async function getActiveRenderJob(
  userId: string,
  projectSlug: string,
): Promise<DbRenderJob | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.renderJobs)
    .where(
      and(
        eq(schema.renderJobs.userId, userId),
        eq(schema.renderJobs.projectSlug, projectSlug),
      ),
    )
    .orderBy(desc(schema.renderJobs.createdAt))
    .limit(1);
  const job = rows[0];
  if (!job) return null;
  if (job.status === "pending" || job.status === "running") return job;
  return null;
}
