import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { ChannelStyleRecord, StyleCharacter } from "./types";
import { ChannelStyleRecordSchema } from "./types";
import { getStyle, saveStyle, styleDir } from "../storage/styles";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function extFromName(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : ".png";
}

function publicPathToFs(publicPath: string): string {
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(process.cwd(), "public", rel);
}

function deleteFileIfExists(publicUrl: string | undefined): void {
  if (!publicUrl?.trim()) return;
  const fsPath = publicPathToFs(publicUrl);
  if (fs.existsSync(fsPath)) {
    fs.unlinkSync(fsPath);
  }
}

/**
 * Save or replace a character reference image. Updates `characters[].imageUrl` for that id.
 */
export function setStyleCharacterImage(
  styleId: string,
  characterId: string,
  imageBuffer: Buffer,
  filename: string,
): ChannelStyleRecord {
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large (max ${MAX_IMAGE_BYTES} bytes)`);
  }

  const style = getStyle(styleId);
  if (!style) {
    throw new Error(`Style not found: ${styleId}`);
  }

  const chars = style.characters ?? [];
  const idx = chars.findIndex((c) => c.id === characterId);
  if (idx === -1) {
    throw new Error(`Character not found: ${characterId}`);
  }

  const charDir = path.join(styleDir(styleId), "characters");
  fs.mkdirSync(charDir, { recursive: true });

  const prevUrl = chars[idx]!.imageUrl;
  deleteFileIfExists(prevUrl);

  const ext = extFromName(filename) || ".png";
  const safe = `char-${characterId.slice(0, 8)}-${randomUUID().slice(0, 8)}${ext}`;
  const rel = `channel-styles/${styleId}/characters/${safe}`;
  const full = path.join(process.cwd(), "public", rel);
  fs.writeFileSync(full, imageBuffer);

  const next: StyleCharacter[] = [...chars];
  next[idx] = {
    ...next[idx]!,
    imageUrl: `/${rel.replace(/\\/g, "/")}`,
  };

  const updated: ChannelStyleRecord = {
    ...style,
    characters: next,
    characterCount: next.length,
  };
  const parsed = ChannelStyleRecordSchema.parse(updated);
  saveStyle(parsed);
  return parsed;
}

/** Remove character image file and clear `imageUrl` for that character. */
export function clearStyleCharacterImage(
  styleId: string,
  characterId: string,
): ChannelStyleRecord {
  const style = getStyle(styleId);
  if (!style) {
    throw new Error(`Style not found: ${styleId}`);
  }

  const chars = style.characters ?? [];
  const idx = chars.findIndex((c) => c.id === characterId);
  if (idx === -1) {
    throw new Error(`Character not found: ${characterId}`);
  }

  deleteFileIfExists(chars[idx]!.imageUrl);

  const next: StyleCharacter[] = [...chars];
  next[idx] = { ...next[idx]!, imageUrl: undefined };

  const updated: ChannelStyleRecord = {
    ...style,
    characters: next,
    characterCount: next.length,
  };
  const parsed = ChannelStyleRecordSchema.parse(updated);
  saveStyle(parsed);
  return parsed;
}
