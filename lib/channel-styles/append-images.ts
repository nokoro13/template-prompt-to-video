import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { ChannelStyleRecord } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle, styleDir } from "../storage/styles";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_STYLE = 10;

function extFromName(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : ".png";
}

function syncThumbnailFromFirstImage(style: ChannelStyleRecord): void {
  if (style.references.images.length === 0) {
    return;
  }
  const first = style.references.images[0]!;
  const ext = path.extname(first) || ".png";
  const thumbRel = `channel-styles/${style.id}/thumbnail${ext}`;
  const thumbFs = path.join(process.cwd(), "public", thumbRel);
  const srcFs = path.join(
    process.cwd(),
    "public",
    first.startsWith("/") ? first.slice(1) : first,
  );
  if (fs.existsSync(srcFs)) {
    fs.copyFileSync(srcFs, thumbFs);
    style.thumbnailUrl = `/${thumbRel.replace(/\\/g, "/")}`;
  }
}

export function appendStyleImages(
  id: string,
  imageBuffers: { filename: string; buffer: Buffer }[],
): ChannelStyleRecord {
  const style = getStyle(id);
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

  const refDir = path.join(styleDir(id), "references");
  fs.mkdirSync(refDir, { recursive: true });

  imageBuffers.forEach((img) => {
    const ext = extFromName(img.filename) || ".png";
    const safe = `image-${randomUUID().slice(0, 10)}${ext}`;
    const rel = `channel-styles/${id}/references/${safe}`;
    const full = path.join(process.cwd(), "public", rel);
    fs.writeFileSync(full, img.buffer);
    style.references.images.push(`/${rel.replace(/\\/g, "/")}`);
  });

  syncThumbnailFromFirstImage(style);
  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  const parsed = ChannelStyleRecordSchema.parse(style);
  saveStyle(parsed);
  return parsed;
}
