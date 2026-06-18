import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { appendStyleTranscripts } from "@/lib/channel-styles/append-transcripts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const transcripts = (body as { transcripts?: unknown }).transcripts;
    if (!Array.isArray(transcripts)) {
      return NextResponse.json(
        { error: "Expected { transcripts: [{ title, content }] }" },
        { status: 400 },
      );
    }
    const normalized = transcripts.map((t) => ({
      title: String((t as { title?: string }).title ?? "").trim(),
      content: String((t as { content?: string }).content ?? ""),
    }));
    if (normalized.length !== 1) {
      return NextResponse.json(
        { error: "Expected exactly one transcript: { title, content }" },
        { status: 400 },
      );
    }

    const style = await appendStyleTranscripts(user.id, id, normalized);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg.includes("not found") ? 404 : 400;
    if (status === 404 || (err instanceof Error && !("status" in err))) {
      return NextResponse.json({ error: msg }, { status });
    }
    return handleAuthError(err);
  }
}
