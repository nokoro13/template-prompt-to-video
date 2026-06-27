import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { pollAndAdvanceRenderJob } from "@/lib/export/poll-render-job";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const jobId = id?.trim();
    if (!jobId) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const result = await pollAndAdvanceRenderJob(user.id, jobId);
    if (!result) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Failed to get export status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
