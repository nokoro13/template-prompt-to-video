import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { assertProjectAccess } from "@/lib/projects/access";
import {
  projectAssetApiBase,
  readProjectJson,
} from "@/lib/storage/project-storage";
import type { Timeline } from "@/src/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

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

    const timeline = await readProjectJson<Timeline>(
      user.id,
      slug,
      "timeline.json",
    );
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    timeline.elements.sort((a, b) => a.startMs - b.startMs);

    return NextResponse.json({
      timeline,
      assetBaseUrl: projectAssetApiBase(user.id, slug),
    });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message =
      e instanceof Error ? e.message : "Failed to load project timeline";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
