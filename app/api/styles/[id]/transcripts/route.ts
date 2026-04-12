import { NextRequest, NextResponse } from "next/server";
import { appendStyleTranscripts } from "@/lib/channel-styles/append-transcripts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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
      { error: "Expected { transcripts: [{ title, content }, ...] }" },
      { status: 400 },
    );
  }
  const normalized = transcripts.map((t) => ({
    title: String((t as { title?: string }).title ?? "").trim(),
    content: String((t as { content?: string }).content ?? ""),
  }));

  try {
    const style = appendStyleTranscripts(id, normalized);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
