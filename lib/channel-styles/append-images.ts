import * as fs from "fs";
import { randomUUID } from "crypto";
import type { ChannelStyleRecord } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle } from "../storage/styles";
import { putStyleFile, resolveStyleImageToLocal } from "../storage/style-storage";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_STYLE = 10;

function extFromName(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : ".png";
}

export async function appendStyleImages(
  userId: string,
  id: string,
  imageBuffers: { filename: string; buffer: Buffer }[],
): Promise<ChannelStyleRecord> {
  const style = await getStyle(id, userId);
  if (!style) {
    throw new Error(`Style not found: ${id}`);
  }
  if (style.references.images.length + imageBuffers.length > MAX_IMAGES_PER_STYLE) {
    throw new Error(`Maximum ${MAX_IMAGES_PER_STYLE} reference images per style`);
  }
  for (const img of imageBuffers) {
    if (img.buffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_IMAGE_BYTES} bytes)`);
    }
  }

  for (const img of imageBuffers) {
    const ext = extFromName(img.filename) || ".png";
    const safe = `references/image-${randomUUID().slice(0, 10)}${ext}`;
    const url = await putStyleFile(userId, id, safe, img.buffer);
    style.references.images.push(url);
  }

  if (style.references.images.length > 0) {
    const firstUrl = style.references.images[0]!;
    const localFirst = await resolveStyleImageToLocal(userId, id, firstUrl);
    const thumbExt = extFromName(localFirst) || ".png";
    style.thumbnailUrl = await putStyleFile(
      userId,
      id,
      `thumbnail${thumbExt}`,
      fs.readFileSync(localFirst),
    );
  }

  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  const parsed = ChannelStyleRecordSchema.parse(style);
  await saveStyle(parsed, userId);
  return parsed;
}
