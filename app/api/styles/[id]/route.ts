import { NextRequest, NextResponse } from "next/server";
import { patchStyleRecord } from "@/lib/channel-styles/patch-style";
import { deleteStyle, getStyle } from "@/lib/storage/styles";
import type {
  ExtractedFormat,
  StyleCharacter,
  VideoAspectRatio,
} from "@/lib/channel-styles/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const style = getStyle(id);
  if (!style) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ style });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const removeTranscriptIds = Array.isArray(b.removeTranscriptIds)
    ? b.removeTranscriptIds.map((x) => String(x))
    : undefined;
  const removeImagePaths = Array.isArray(b.removeImagePaths)
    ? b.removeImagePaths.map((x) => String(x))
    : undefined;

  let characters: StyleCharacter[] | undefined;
  if (b.characters !== undefined) {
    if (!Array.isArray(b.characters)) {
      return NextResponse.json({ error: "characters must be an array" }, { status: 400 });
    }
    characters = b.characters as StyleCharacter[];
  }

  let videoAspectRatio: VideoAspectRatio | undefined;
  if (b.videoAspectRatio !== undefined) {
    if (b.videoAspectRatio !== "9:16" && b.videoAspectRatio !== "16:9") {
      return NextResponse.json(
        { error: "videoAspectRatio must be 9:16 or 16:9" },
        { status: 400 },
      );
    }
    videoAspectRatio = b.videoAspectRatio;
  }

  let targetTranscriptWordCount: number | null | undefined;
  if (b.targetTranscriptWordCount !== undefined) {
    if (b.targetTranscriptWordCount === null) {
      targetTranscriptWordCount = null;
    } else if (
      typeof b.targetTranscriptWordCount === "number" &&
      Number.isInteger(b.targetTranscriptWordCount)
    ) {
      if (b.targetTranscriptWordCount < 1 || b.targetTranscriptWordCount > 4000) {
        return NextResponse.json(
          { error: "targetTranscriptWordCount must be between 1 and 4000" },
          { status: 400 },
        );
      }
      targetTranscriptWordCount = b.targetTranscriptWordCount;
    } else {
      return NextResponse.json(
        { error: "targetTranscriptWordCount must be an integer, or null to clear" },
        { status: 400 },
      );
    }
  }

  let extractedFormat: ExtractedFormat | null | undefined;
  if (b.extractedFormat !== undefined) {
    if (b.extractedFormat === null) {
      extractedFormat = null;
    } else if (typeof b.extractedFormat === "object" && b.extractedFormat) {
      extractedFormat = b.extractedFormat as ExtractedFormat;
    } else {
      return NextResponse.json(
        { error: "extractedFormat must be an object or null" },
        { status: 400 },
      );
    }
  }

  try {
    const style = patchStyleRecord(id, {
      name: typeof b.name === "string" ? b.name : undefined,
      creatorName:
        b.creatorName === null
          ? null
          : typeof b.creatorName === "string"
            ? b.creatorName
            : undefined,
      description:
        b.description === null
          ? null
          : typeof b.description === "string"
            ? b.description
            : undefined,
      videoAspectRatio,
      targetTranscriptWordCount,
      characters,
      extractedFormat,
      removeTranscriptIds,
      removeImagePaths,
    });
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const existing = getStyle(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  deleteStyle(id);
  return NextResponse.json({ ok: true });
}
