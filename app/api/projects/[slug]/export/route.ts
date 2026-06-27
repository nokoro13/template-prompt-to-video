import { NextResponse } from "next/server";
import { z } from "zod";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { isRemotionLambdaConfigured } from "@/lib/export/lambda-config";
import { pollAndAdvanceRenderJob } from "@/lib/export/poll-render-job";
import { startProjectExport } from "@/lib/export/start-render-job";
import { getProjectVideoAspectRatio } from "@/lib/project/video-aspect-ratio";
import { assertProjectAccess } from "@/lib/projects/access";
import { isR2StorageEnabled } from "@/lib/storage/constants";

export const maxDuration = 60;

const bodySchema = z.object({
  aspectRatio: z.enum(["9:16", "16:9"]).default("9:16"),
  force: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    if (!isRemotionLambdaConfigured()) {
      return NextResponse.json(
        {
          error:
            "Video export is not configured. Set REMOTION_AWS_* and REMOTION_FUNCTION_NAME / REMOTION_SERVE_URL on the server.",
        },
        { status: 503 },
      );
    }

    if (!isR2StorageEnabled()) {
      return NextResponse.json(
        { error: "Video export requires Cloudflare R2 storage." },
        { status: 503 },
      );
    }

    await assertProjectAccess(user.id, slug);

    let json: unknown = {};
    try {
      json = await request.json();
    } catch {
      /* empty body ok */
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const aspectRatio = await getProjectVideoAspectRatio(user.id, slug);

    const result = await startProjectExport({
      userId: user.id,
      projectSlug: slug,
      aspectRatio,
      force: parsed.data.force,
    });

    if (result.cached) {
      return NextResponse.json({
        jobId: result.jobId,
        cached: true,
        status: "complete",
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
      });
    }

    return NextResponse.json({ jobId: result.jobId, cached: false, status: "running" });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Export failed";
    const status =
      message === "Project not found" || message.includes("Timeline not found")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    await assertProjectAccess(user.id, slug);

    const { getLatestCompleteRenderJob } = await import("@/lib/db/render-jobs");
    const { getProjectForUser } = await import("@/lib/db/projects");
    const project = await getProjectForUser(user.id, slug);
    const aspectRatio = await getProjectVideoAspectRatio(user.id, slug);
    const latest = await getLatestCompleteRenderJob(
      user.id,
      slug,
      aspectRatio,
      project?.updatedAt ?? null,
    );

    if (!latest) {
      return NextResponse.json({ export: null });
    }

    const polled = await pollAndAdvanceRenderJob(user.id, latest.id);
    return NextResponse.json({ export: polled });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Failed to load export";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
