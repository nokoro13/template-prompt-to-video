import { NextRequest, NextResponse } from "next/server";

import { finalizeTimelinePhase } from "@/lib/generate-simple-story";

export async function POST(req: NextRequest) {
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

  try {
    finalizeTimelinePhase(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Finalize failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
