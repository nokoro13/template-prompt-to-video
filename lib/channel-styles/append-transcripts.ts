import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { ChannelStyleRecord, TranscriptEntry } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle, styleDir } from "../storage/styles";

const MAX_TRANSCRIPT_BYTES = 100 * 1024;
const MAX_TRANSCRIPTS_PER_STYLE = 5;

export function appendStyleTranscripts(
  id: string,
  transcripts: { title: string; content: string }[],
): ChannelStyleRecord {
  const style = getStyle(id);
  if (!style) {
    throw new Error(`Style not found: ${id}`);
  }
  if (
    style.references.transcripts.length + transcripts.length >
    MAX_TRANSCRIPTS_PER_STYLE
  ) {
    throw new Error(`Maximum ${MAX_TRANSCRIPTS_PER_STYLE} transcripts per style`);
  }
  for (const t of transcripts) {
    if (Buffer.byteLength(t.content, "utf8") > MAX_TRANSCRIPT_BYTES) {
      throw new Error("Transcript too large (max 100KB each)");
    }
  }

  const dir = path.join(styleDir(id), "transcripts");
  fs.mkdirSync(dir, { recursive: true });

  transcripts.forEach((t, i) => {
    const tid = randomUUID();
    const safeTitle =
      t.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || `transcript-${i}`;
    const fname = `${safeTitle}-${tid.slice(0, 8)}.txt`;
    const rel = `channel-styles/${id}/transcripts/${fname}`;
    const full = path.join(process.cwd(), "public", rel);
    fs.writeFileSync(full, t.content, "utf-8");
    const entry: TranscriptEntry = {
      id: tid,
      filename: fname,
      path: `/${rel.replace(/\\/g, "/")}`,
      title: t.title,
    };
    style.references.transcripts.push(entry);
  });

  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  const parsed = ChannelStyleRecordSchema.parse(style);
  saveStyle(parsed);
  return parsed;
}
