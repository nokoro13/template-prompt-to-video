import { randomUUID } from "crypto";
import type { ChannelStyleRecord, TranscriptEntry } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle } from "../storage/styles";
import { putStyleFile } from "../storage/style-storage";
import {
  MAX_TRANSCRIPT_BYTES,
  transcriptTooLargeMessage,
} from "./transcript-limits";

const MAX_TRANSCRIPTS_PER_STYLE = 5;

export async function appendStyleTranscripts(
  userId: string,
  id: string,
  transcripts: { title: string; content: string }[],
): Promise<ChannelStyleRecord> {
  const style = await getStyle(id, userId);
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
      throw new Error(transcriptTooLargeMessage());
    }
  }

  for (let i = 0; i < transcripts.length; i++) {
    const t = transcripts[i]!;
    const tid = randomUUID();
    const safeTitle =
      t.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || `transcript-${i}`;
    const fname = `${safeTitle}-${tid.slice(0, 8)}.txt`;
    const rel = `transcripts/${fname}`;
    const url = await putStyleFile(
      userId,
      id,
      rel,
      t.content,
      "text/plain; charset=utf-8",
    );
    const entry: TranscriptEntry = {
      id: tid,
      filename: fname,
      path: url,
      title: t.title,
    };
    style.references.transcripts.push(entry);
  }

  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  const parsed = ChannelStyleRecordSchema.parse(style);
  await saveStyle(parsed, userId);
  return parsed;
}
