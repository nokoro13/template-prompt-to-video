export type RenderJobStatus = "pending" | "running" | "complete" | "error";

export type RenderJob = {
  id: string;
  status: RenderJobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  compositionId: string;
  aspectRatio: string;
  /** Public URL path to download (e.g. /renders/uuid.mp4) */
  outputUrl?: string;
  error?: string;
};

const jobs = new Map<string, RenderJob>();

export function createRenderJob(
  id: string,
  compositionId: string,
  aspectRatio: string,
): RenderJob {
  const job: RenderJob = {
    id,
    status: "pending",
    createdAt: Date.now(),
    compositionId,
    aspectRatio,
  };
  jobs.set(id, job);
  return job;
}

export function getRenderJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

export function patchRenderJob(
  id: string,
  patch: Partial<Omit<RenderJob, "id" | "createdAt">>,
): RenderJob | undefined {
  const prev = jobs.get(id);
  if (!prev) return undefined;
  const next = { ...prev, ...patch };
  jobs.set(id, next);
  return next;
}
