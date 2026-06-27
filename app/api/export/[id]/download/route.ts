import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { getRenderJobForUser } from "@/lib/db/render-jobs";
import { assertRenderJobDownloadable } from "@/lib/export/purge-project-exports";
import { getR2ObjectStream } from "@/lib/storage/r2";

export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

function contentDispositionAttachment(fileName: string): string {
  const safe = fileName.replace(/[^\w\s.-]/g, "").trim() || "video.mp4";
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

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

    const job = await getRenderJobForUser(user.id, jobId);
    if (!job || job.status !== "complete") {
      return NextResponse.json({ error: "Export not ready" }, { status: 404 });
    }

    const downloadable = await assertRenderJobDownloadable(job);
    if (!downloadable.ok) {
      return NextResponse.json({ error: downloadable.reason }, { status: 410 });
    }

    if (!job.outputStorageKey) {
      return NextResponse.json({ error: "Export not ready" }, { status: 404 });
    }

    const object = await getR2ObjectStream(job.outputStorageKey);
    if (!object) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileName = job.outputFileName ?? "video.mp4";
    return new NextResponse(object.body, {
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": contentDispositionAttachment(fileName),
        ...(object.contentLength
          ? { "Content-Length": String(object.contentLength) }
          : {}),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
