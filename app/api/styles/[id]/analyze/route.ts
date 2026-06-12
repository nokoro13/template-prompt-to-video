import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { patchStyleRecord } from "@/lib/channel-styles/patch-style";
import { analyzeReferenceTranscript } from "@/lib/generation/format-cloner";
import { getStyle, readTranscriptFile } from "@/lib/storage/styles";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 },
      );
    }

    const style = await getStyle(id, user.id);
    if (!style) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const first = style.references.transcripts[0];
    if (!first) {
      return NextResponse.json(
        { error: "No reference transcript to analyze" },
        { status: 400 },
      );
    }

    const text = await readTranscriptFile(first.path, user.id, id);
    const extractedFormat = await analyzeReferenceTranscript(text, openaiApiKey);
    const updated = await patchStyleRecord(user.id, id, { extractedFormat });
    return NextResponse.json({ ok: true, extractedFormat: updated.extractedFormat });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
