import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { getRenderJobForUser } from "@/lib/db/render-jobs";
import { assertRenderJobDownloadable } from "@/lib/export/purge-project-exports";
import { getR2ObjectStream } from "@/lib/storage/r2";

function contentDispositionAttachment(fileName: string): string {
  const safe = fileName.replace(/[^\w\s.-]/g, "").trim() || "video.mp4";
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

/**
 * Stream an exported MP4 through our origin (not raw R2/CDN URLs).
 * Required headers for mobile WebView fetch() + share sheet flows.
 */
export async function serveExportDownload(
  userId: string,
  jobId: string,
): Promise<NextResponse> {
  if (!jobId) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const job = await getRenderJobForUser(userId, jobId);
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
      "Content-Type": object.contentType || "video/mp4",
      "Content-Disposition": contentDispositionAttachment(fileName),
      ...(object.contentLength
        ? { "Content-Length": String(object.contentLength) }
        : {}),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function handleServeExportDownloadError(
  e: unknown,
): Promise<NextResponse> {
  if (e instanceof Error && "status" in e) {
    return handleAuthError(e);
  }
  const message = e instanceof Error ? e.message : "Download failed";
  return NextResponse.json({ error: message }, { status: 500 });
}
