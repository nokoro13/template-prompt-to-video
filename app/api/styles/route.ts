import { NextRequest, NextResponse } from "next/server";
import { createChannelStyle } from "@/lib/channel-styles/create-style";
import { listStyles } from "@/lib/storage/styles";

export async function GET() {
  return NextResponse.json({ styles: listStyles() });
}

export async function POST(req: NextRequest) {
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const creatorName = String(form.get("creatorName") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const videoAspectRatioRaw = String(form.get("videoAspectRatio") ?? "9:16").trim();
  const videoAspectRatio =
    videoAspectRatioRaw === "16:9" ? ("16:9" as const) : ("9:16" as const);
  const targetWordsRaw = String(form.get("targetTranscriptWordCount") ?? "").trim();
  let targetTranscriptWordCount: number | undefined;
  if (targetWordsRaw !== "") {
    const n = Number(targetWordsRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 4000) {
      return NextResponse.json(
        { error: "targetTranscriptWordCount must be an integer from 1 to 4000, or empty" },
        { status: 400 },
      );
    }
    targetTranscriptWordCount = n;
  }
  const transcriptsRaw = String(form.get("transcripts") ?? "[]");

  let transcripts: { title: string; content: string }[];
  try {
    const parsed = JSON.parse(transcriptsRaw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("not array");
    }
    transcripts = parsed.map((t) => ({
      title: String((t as { title?: string }).title ?? "").trim(),
      content: String((t as { content?: string }).content ?? ""),
    }));
  } catch {
    return NextResponse.json(
      { error: "Invalid transcripts JSON (expected [{ title, content }, ...])" },
      { status: 400 },
    );
  }

  const files = form.getAll("images");
  const imageBuffers: { filename: string; buffer: Buffer }[] = [];
  for (const f of files) {
    if (f instanceof File && f.size > 0) {
      const buf = Buffer.from(await f.arrayBuffer());
      imageBuffers.push({ filename: f.name || "image.png", buffer: buf });
    }
  }

  try {
    const record = await createChannelStyle({
      name,
      creatorName: creatorName || undefined,
      description: description || undefined,
      videoAspectRatio,
      targetTranscriptWordCount,
      imageBuffers,
      transcripts,
      openaiApiKey,
    });
    return NextResponse.json({ ok: true, style: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create style";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
