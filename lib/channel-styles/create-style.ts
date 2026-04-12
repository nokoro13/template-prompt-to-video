import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type {
  ChannelStyleRecord,
  TranscriptEntry,
  VideoAspectRatio,
} from "./types";
import { analyzeReferenceTranscript } from "../generation/format-cloner";
import {
  ensureStylesRoot,
  readStylesIndex,
  saveStyle,
  slugifyStyleName,
  styleDir,
  uniqueStyleId,
} from "../storage/styles";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 100 * 1024;

export type CreateStyleInput = {
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
    throw new Error("At least one reference image is required");
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
      throw new Error("Transcript too large (max 100KB each)");
    }
  }

  ensureStylesRoot();
  const index = readStylesIndex();
  const existingIds = new Set(Object.keys(index.styles));
  const id = uniqueStyleId(slugifyStyleName(name), existingIds);
  const dir = styleDir(id);
  fs.mkdirSync(path.join(dir, "references"), { recursive: true });
  fs.mkdirSync(path.join(dir, "transcripts"), { recursive: true });

  const imagePublicPaths: string[] = [];
  input.imageBuffers.forEach((img, i) => {
    const ext = extFromName(img.filename) || ".png";
    const safe = `image-${i}${ext}`;
    const rel = `channel-styles/${id}/references/${safe}`;
    const full = path.join(process.cwd(), "public", rel);
    fs.writeFileSync(full, img.buffer);
    imagePublicPaths.push(`/${rel.replace(/\\/g, "/")}`);
  });

  const transcriptEntries: TranscriptEntry[] = [];
  input.transcripts.forEach((t, i) => {
    const tid = randomUUID();
    const safeTitle = t.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || `transcript-${i}`;
    const fname = `${safeTitle}-${tid.slice(0, 8)}.txt`;
    const rel = `channel-styles/${id}/transcripts/${fname}`;
    const full = path.join(process.cwd(), "public", rel);
    fs.writeFileSync(full, t.content, "utf-8");
    transcriptEntries.push({
      id: tid,
      filename: fname,
      path: `/${rel.replace(/\\/g, "/")}`,
      title: t.title,
    });
  });

  const thumbRel = `channel-styles/${id}/thumbnail${extFromName(input.imageBuffers[0]!.filename) || ".png"}`;
  const thumbFull = path.join(process.cwd(), "public", thumbRel);
  fs.copyFileSync(
    path.join(
      process.cwd(),
      "public",
      imagePublicPaths[0]!.replace(/^\//, ""),
    ),
    thumbFull,
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
    thumbnailUrl: `/${thumbRel.replace(/\\/g, "/")}`,
    referenceCount:
      imagePublicPaths.length + transcriptEntries.length,
    characterCount: 0,
    createdAt: new Date().toISOString(),
    references: {
      images: imagePublicPaths,
      transcripts: transcriptEntries,
    },
    extractedFormat,
    characters: [],
  };

  saveStyle(record);
  return record;
}
