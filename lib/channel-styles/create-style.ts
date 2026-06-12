import { randomUUID } from "crypto";
import type {
  ChannelStyleRecord,
  TranscriptEntry,
  VideoAspectRatio,
} from "./types";
import { analyzeReferenceTranscript } from "../generation/format-cloner";
import { saveStyle, uniqueStyleIdForUser } from "../storage/styles";
import { putStyleFile } from "../storage/style-storage";
import {
  MAX_TRANSCRIPT_BYTES,
  transcriptTooLargeMessage,
} from "./transcript-limits";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type CreateStyleInput = {
  userId: string;
  name: string;
  creatorName?: string;
  description?: string;
  /** Default 9:16 (portrait). */
  videoAspectRatio?: VideoAspectRatio;
  /** Optional script length target (1–4000) for format-clone generation. */
  targetTranscriptWordCount?: number;
  imageBuffers: { filename: string; buffer: Buffer }[];
  transcripts: { title: string; content: string }[];
  openaiApiKey: string;
};

function extFromName(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : ".png";
}

export async function createChannelStyle(
  input: CreateStyleInput,
): Promise<ChannelStyleRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Style name is required");
  }
  if (input.imageBuffers.length < 1) {
    throw new Error("At least one style reference image is required");
  }
  if (input.transcripts.length < 1) {
    throw new Error("At least one reference transcript is required");
  }

  for (const img of input.imageBuffers) {
    if (img.buffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_IMAGE_BYTES} bytes)`);
    }
  }
  for (const t of input.transcripts) {
    if (Buffer.byteLength(t.content, "utf8") > MAX_TRANSCRIPT_BYTES) {
      throw new Error(transcriptTooLargeMessage());
    }
  }

  const id = await uniqueStyleIdForUser(input.userId, name);

  const imagePublicPaths: string[] = [];
  for (let i = 0; i < input.imageBuffers.length; i++) {
    const img = input.imageBuffers[i]!;
    const ext = extFromName(img.filename) || ".png";
    const safe = `references/image-${i}${ext}`;
    const url = await putStyleFile(
      input.userId,
      id,
      safe,
      img.buffer,
      `image/${ext.slice(1) === "jpg" ? "jpeg" : ext.slice(1)}`,
    );
    imagePublicPaths.push(url);
  }

  const transcriptEntries: TranscriptEntry[] = [];
  for (let i = 0; i < input.transcripts.length; i++) {
    const t = input.transcripts[i]!;
    const tid = randomUUID();
    const safeTitle =
      t.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || `transcript-${i}`;
    const fname = `${safeTitle}-${tid.slice(0, 8)}.txt`;
    const rel = `transcripts/${fname}`;
    const url = await putStyleFile(
      input.userId,
      id,
      rel,
      t.content,
      "text/plain; charset=utf-8",
    );
    transcriptEntries.push({
      id: tid,
      filename: fname,
      path: url,
      title: t.title,
    });
  }

  const thumbExt = extFromName(input.imageBuffers[0]!.filename) || ".png";
  const thumbUrl = await putStyleFile(
    input.userId,
    id,
    `thumbnail${thumbExt}`,
    input.imageBuffers[0]!.buffer,
  );

  const firstTranscriptText = input.transcripts[0]!.content;
  const extractedFormat = await analyzeReferenceTranscript(
    firstTranscriptText,
    input.openaiApiKey,
  );

  const record: ChannelStyleRecord = {
    id,
    name,
    creatorName: input.creatorName?.trim() || undefined,
    description: input.description?.trim() || undefined,
    videoAspectRatio: input.videoAspectRatio ?? "9:16",
    ...(input.targetTranscriptWordCount !== undefined
      ? {
          targetTranscriptWordCount: Math.max(
            1,
            Math.min(4000, Math.round(input.targetTranscriptWordCount)),
          ),
        }
      : {}),
    thumbnailUrl: thumbUrl,
    referenceCount: imagePublicPaths.length + transcriptEntries.length,
    characterCount: 0,
    createdAt: new Date().toISOString(),
    references: {
      images: imagePublicPaths,
      transcripts: transcriptEntries,
    },
    extractedFormat,
    characters: [],
  };

  await saveStyle(record, input.userId);
  return record;
}
