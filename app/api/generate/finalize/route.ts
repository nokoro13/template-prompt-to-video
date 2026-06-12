import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { finalizeTimelinePhase } from "@/lib/generate-simple-story";
import { assertProjectAccess } from "@/lib/projects/access";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: { slug?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    await assertProjectAccess(user.id, slug);
    await finalizeTimelinePhase(slug, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Finalize failed";
    const status = msg === "Project not found" ? 404 : 500;
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
