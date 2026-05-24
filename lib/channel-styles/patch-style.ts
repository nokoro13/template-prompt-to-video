import * as fs from "fs";
import * as path from "path";
import type {
  ChannelStyleRecord,
  ExtractedFormat,
  StyleCharacter,
  VideoAspectRatio,
} from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle } from "../storage/styles";

function publicPathToFs(publicPath: string): string {
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(process.cwd(), "public", rel);
}

function syncThumbnailFromFirstImage(style: ChannelStyleRecord): void {
  if (style.references.images.length === 0) {
    return;
  }
  const first = style.references.images[0]!;
  const ext = path.extname(first) || ".png";
  const thumbRel = `channel-styles/${style.id}/thumbnail${ext}`;
  const thumbFs = path.join(process.cwd(), "public", thumbRel);
  const srcFs = publicPathToFs(first);
  if (fs.existsSync(srcFs)) {
    fs.copyFileSync(srcFs, thumbFs);
    style.thumbnailUrl = `/${thumbRel.replace(/\\/g, "/")}`;
  }
}

function recomputeCounts(style: ChannelStyleRecord): void {
  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  style.characterCount = style.characters?.length ?? 0;
}

export function patchStyleRecord(
  id: string,
  updates: {
    name?: string;
    creatorName?: string | null;
    description?: string | null;
    videoAspectRatio?: VideoAspectRatio;
    /** Set to null to clear and use reference-based length again. */
    targetTranscriptWordCount?: number | null;
    characters?: StyleCharacter[];
    extractedFormat?: ExtractedFormat | null;
    removeTranscriptIds?: string[];
    removeImagePaths?: string[];
  },
): ChannelStyleRecord {
  const existing = getStyle(id);
  if (!existing) {
    throw new Error(`Style not found: ${id}`);
  }
  const style: ChannelStyleRecord = structuredClone(existing);

  if (typeof updates.name === "string" && updates.name.trim()) {
    style.name = updates.name.trim();
  }
  if (updates.creatorName !== undefined) {
    style.creatorName = updates.creatorName?.trim() || undefined;
  }
  if (updates.description !== undefined) {
    style.description = updates.description?.trim() || undefined;
  }
  if (updates.videoAspectRatio !== undefined) {
    style.videoAspectRatio = updates.videoAspectRatio;
  }
  if (updates.targetTranscriptWordCount !== undefined) {
    if (updates.targetTranscriptWordCount === null) {
      delete style.targetTranscriptWordCount;
    } else {
      style.targetTranscriptWordCount = updates.targetTranscriptWordCount;
    }
  }
  if (updates.characters !== undefined) {
    const newIds = new Set(updates.characters.map((c) => c.id));
    for (const c of existing.characters ?? []) {
      if (!newIds.has(c.id) && c.imageUrl?.trim()) {
        const fsPath = publicPathToFs(c.imageUrl);
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    }
    style.characters = updates.characters;
  }
  if (updates.extractedFormat !== undefined) {
    style.extractedFormat = updates.extractedFormat ?? undefined;
  }

  if (updates.removeTranscriptIds?.length) {
    const remove = new Set(updates.removeTranscriptIds);
    for (const t of style.references.transcripts) {
      if (remove.has(t.id)) {
        const fsPath = publicPathToFs(t.path);
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    }
    style.references.transcripts = style.references.transcripts.filter(
      (t) => !remove.has(t.id),
    );
  }

  if (updates.removeImagePaths?.length) {
    const remove = new Set(updates.removeImagePaths);
    for (const img of style.references.images) {
      if (remove.has(img)) {
        const fsPath = publicPathToFs(img);
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    }
    style.references.images = style.references.images.filter(
      (img) => !remove.has(img),
    );
    syncThumbnailFromFirstImage(style);
  }

  recomputeCounts(style);
  const parsed = ChannelStyleRecordSchema.parse(style);
  saveStyle(parsed);
  return parsed;
}
