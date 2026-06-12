import type {
  ChannelStyleRecord,
  ExtractedFormat,
  StyleCharacter,
  VideoAspectRatio,
} from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle } from "../storage/styles";
import { deleteAsset, parseStorageApiKey } from "../storage/assets";
import { putStyleFile, resolveStyleImageToLocal } from "../storage/style-storage";
import * as fs from "fs";
import * as path from "path";

async function deletePublicAsset(publicPath: string): Promise<void> {
  const storageKey = parseStorageApiKey(publicPath);
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  await deleteAsset({
    storageKey: storageKey ?? undefined,
    publicRelativePath: storageKey ? undefined : rel,
  });
}

async function syncThumbnailFromFirstImage(
  userId: string,
  style: ChannelStyleRecord,
): Promise<void> {
  if (style.references.images.length === 0) return;
  const first = style.references.images[0]!;
  const local = await resolveStyleImageToLocal(userId, style.id, first);
  const ext = path.extname(local) || ".png";
  style.thumbnailUrl = await putStyleFile(
    userId,
    style.id,
    `thumbnail${ext}`,
    fs.readFileSync(local),
  );
}

function recomputeCounts(style: ChannelStyleRecord): void {
  style.referenceCount =
    style.references.images.length + style.references.transcripts.length;
  style.characterCount = style.characters?.length ?? 0;
}

export async function patchStyleRecord(
  userId: string,
  id: string,
  updates: {
    name?: string;
    creatorName?: string | null;
    description?: string | null;
    videoAspectRatio?: VideoAspectRatio;
    targetTranscriptWordCount?: number | null;
    characters?: StyleCharacter[];
    extractedFormat?: ExtractedFormat | null;
    removeTranscriptIds?: string[];
    removeImagePaths?: string[];
  },
): Promise<ChannelStyleRecord> {
  const existing = await getStyle(id, userId);
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
        await deletePublicAsset(c.imageUrl);
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
        await deletePublicAsset(t.path);
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
        await deletePublicAsset(img);
      }
    }
    style.references.images = style.references.images.filter(
      (img) => !remove.has(img),
    );
    await syncThumbnailFromFirstImage(userId, style);
  }

  recomputeCounts(style);
  const parsed = ChannelStyleRecordSchema.parse(style);
  await saveStyle(parsed, userId);
  return parsed;
}
