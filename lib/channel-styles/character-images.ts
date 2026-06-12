import { randomUUID } from "crypto";
import type { ChannelStyleRecord, StyleCharacter } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle } from "../storage/styles";
import { deleteAsset } from "../storage/assets";
import { putStyleFile } from "../storage/style-storage";
import { parseStorageApiKey } from "../storage/assets";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function extFromName(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : ".png";
}

async function deleteStyleAssetUrl(
  userId: string,
  styleId: string,
  url: string | undefined,
): Promise<void> {
  if (!url?.trim()) return;
  const storageKey = parseStorageApiKey(url);
  const publicRel = url.startsWith("/") && !storageKey ? url.slice(1) : undefined;
  await deleteAsset({
    storageKey: storageKey ?? undefined,
    publicRelativePath: publicRel,
  });
}

export async function setStyleCharacterImage(
  userId: string,
  styleId: string,
  characterId: string,
  imageBuffer: Buffer,
  filename: string,
): Promise<ChannelStyleRecord> {
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large (max ${MAX_IMAGE_BYTES} bytes)`);
  }

  const style = await getStyle(styleId, userId);
  if (!style) {
    throw new Error(`Style not found: ${styleId}`);
  }

  const chars = style.characters ?? [];
  const idx = chars.findIndex((c) => c.id === characterId);
  if (idx === -1) {
    throw new Error(`Character not found: ${characterId}`);
  }

  await deleteStyleAssetUrl(userId, styleId, chars[idx]!.imageUrl);

  const ext = extFromName(filename) || ".png";
  const safe = `characters/char-${characterId.slice(0, 8)}-${randomUUID().slice(0, 8)}${ext}`;
  const url = await putStyleFile(userId, styleId, safe, imageBuffer);

  const next: StyleCharacter[] = [...chars];
  next[idx] = {
    ...next[idx]!,
    imageUrl: url,
  };

  const updated: ChannelStyleRecord = {
    ...style,
    characters: next,
    characterCount: next.length,
  };
  const parsed = ChannelStyleRecordSchema.parse(updated);
  await saveStyle(parsed, userId);
  return parsed;
}

export async function clearStyleCharacterImage(
  userId: string,
  styleId: string,
  characterId: string,
): Promise<ChannelStyleRecord> {
  const style = await getStyle(styleId, userId);
  if (!style) {
    throw new Error(`Style not found: ${styleId}`);
  }

  const chars = style.characters ?? [];
  const idx = chars.findIndex((c) => c.id === characterId);
  if (idx === -1) {
    throw new Error(`Character not found: ${characterId}`);
  }

  await deleteStyleAssetUrl(userId, styleId, chars[idx]!.imageUrl);

  const next: StyleCharacter[] = [...chars];
  next[idx] = { ...next[idx]!, imageUrl: undefined };

  const updated: ChannelStyleRecord = {
    ...style,
    characters: next,
    characterCount: next.length,
  };
  const parsed = ChannelStyleRecordSchema.parse(updated);
  await saveStyle(parsed, userId);
  return parsed;
}
