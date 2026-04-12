import { NextResponse } from "next/server";

import { getRenderJob } from "@/lib/studio/render-jobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getRenderJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    compositionId: job.compositionId,
    aspectRatio: job.aspectRatio,
    outputUrl: job.outputUrl,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}
