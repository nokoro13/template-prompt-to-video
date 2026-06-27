import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import {
  handleServeExportDownloadError,
  serveExportDownload,
} from "@/lib/export/serve-export-download";

export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const jobId = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    return serveExportDownload(user.id, jobId);
  } catch (e) {
    return handleServeExportDownloadError(e);
  }
}
