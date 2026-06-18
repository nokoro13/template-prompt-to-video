import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { createChannelStyle } from "@/lib/channel-styles/create-style";
import {
  MAX_REFERENCE_IMAGES_PER_STYLE,
  tooManyReferenceImagesMessage,
} from "@/lib/channel-styles/image-limits";
import {
  MAX_REFERENCE_TRANSCRIPTS_PER_STYLE,
  tooManyReferenceTranscriptsMessage,
} from "@/lib/channel-styles/transcript-limits";
import { listStyles } from "@/lib/storage/styles";

export async function GET() {
  try {
    const user = await requireUser();
    const styles = await listStyles(user.id);
    return NextResponse.json({ styles });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

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

    if (transcripts.length < 1) {
      return NextResponse.json(
        { error: "A reference transcript with title and content is required" },
        { status: 400 },
      );
    }
    if (transcripts.length > MAX_REFERENCE_TRANSCRIPTS_PER_STYLE) {
      return NextResponse.json(
        { error: tooManyReferenceTranscriptsMessage() },
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

    if (imageBuffers.length < 1) {
      return NextResponse.json(
        { error: "At least one style reference image is required" },
        { status: 400 },
      );
    }
    if (imageBuffers.length > MAX_REFERENCE_IMAGES_PER_STYLE) {
      return NextResponse.json(
        { error: tooManyReferenceImagesMessage() },
        { status: 400 },
      );
    }

    const record = await createChannelStyle({
      userId: user.id,
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
    if (err instanceof Error && err.message) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handleAuthError(err);
  }
}
