import * as fs from "fs";
import * as path from "path";

import type { ChannelStyleRecord, StylesIndex } from "../channel-styles/types";
import { ChannelStyleRecordSchema, StylesIndexSchema } from "../channel-styles/types";
import {
  deleteStyleForUser,
  getStyleForUser,
  insertStyle,
  listStyleIdsForUser,
  listStylesForUser,
  updateStyleData,
} from "../db/styles";
import { isDatabaseStorageEnabled, isR2StorageEnabled } from "./constants";
import { readStyleText, resolveStyleImageToLocal } from "./style-storage";

const ROOT = path.join(process.cwd(), "public", "channel-styles");
export const STYLES_INDEX_PATH = path.join(ROOT, "index.json");

export function ensureStylesRoot(): void {
  fs.mkdirSync(ROOT, { recursive: true });
}

export function styleDir(id: string): string {
  return path.join(ROOT, id);
}

export function readStylesIndex(): StylesIndex {
  ensureStylesRoot();
  if (!fs.existsSync(STYLES_INDEX_PATH)) {
    const empty: StylesIndex = { styles: {} };
    fs.writeFileSync(STYLES_INDEX_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  const raw = fs.readFileSync(STYLES_INDEX_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return StylesIndexSchema.parse(parsed);
}

export function writeStylesIndex(index: StylesIndex): void {
  ensureStylesRoot();
  fs.writeFileSync(STYLES_INDEX_PATH, JSON.stringify(index, null, 2));
}

export function slugifyStyleName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "style";
}

export function uniqueStyleId(name: string, existing: Set<string>): string {
  const base = slugifyStyleName(name);
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function uniqueStyleIdForUser(
  userId: string,
  name: string,
): Promise<string> {
  if (isDatabaseStorageEnabled()) {
    const existing = await listStyleIdsForUser(userId);
    return uniqueStyleId(name, existing);
  }
  const index = readStylesIndex();
  return uniqueStyleId(name, new Set(Object.keys(index.styles)));
}

export async function getStyle(
  id: string,
  userId?: string,
): Promise<ChannelStyleRecord | null> {
  if (isDatabaseStorageEnabled() && userId) {
    return getStyleForUser(userId, id);
  }
  const index = readStylesIndex();
  return index.styles[id] ?? null;
}

export async function listStyles(userId?: string): Promise<ChannelStyleRecord[]> {
  if (isDatabaseStorageEnabled() && userId) {
    return listStylesForUser(userId);
  }
  const index = readStylesIndex();
  return Object.values(index.styles).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function saveStyle(
  record: ChannelStyleRecord,
  userId?: string,
): Promise<ChannelStyleRecord> {
  const parsed = ChannelStyleRecordSchema.parse(record);
  if (isDatabaseStorageEnabled() && userId) {
    const existing = await getStyleForUser(userId, parsed.id);
    if (existing) {
      return updateStyleData(userId, parsed.id, parsed, isR2StorageEnabled());
    }
    return insertStyle(userId, parsed, isR2StorageEnabled());
  }

  const index = readStylesIndex();
  index.styles[parsed.id] = parsed;
  writeStylesIndex(index);
  return parsed;
}

export async function deleteStyle(id: string, userId?: string): Promise<void> {
  if (isDatabaseStorageEnabled() && userId) {
    await deleteStyleForUser(userId, id);
    const dir = styleDir(id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return;
  }

  const index = readStylesIndex();
  delete index.styles[id];
  writeStylesIndex(index);
  const dir = styleDir(id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function readTranscriptFile(
  publicPath: string,
  userId?: string,
  styleId?: string,
): Promise<string> {
  if (isDatabaseStorageEnabled() && userId && styleId) {
    const rel = publicPath.replace(/^\//, "");
    const prefix = `channel-styles/${styleId}/`;
    const idx = rel.indexOf(prefix);
    const relativePath =
      idx >= 0 ? rel.slice(idx + prefix.length) : path.basename(rel);
    return readStyleText(userId, styleId, relativePath, rel);
  }

  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const full = path.join(process.cwd(), "public", rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Transcript not found: ${publicPath}`);
  }
  return fs.readFileSync(full, "utf-8");
}

/** Absolute filesystem paths for reference images (for generation). */
export async function resolveStyleImagePaths(
  record: ChannelStyleRecord,
  userId?: string,
): Promise<string[]> {
  const out: string[] = [];
  for (const url of record.references.images) {
    if (isDatabaseStorageEnabled() && userId) {
      out.push(await resolveStyleImageToLocal(userId, record.id, url));
    } else {
      const rel = url.startsWith("/") ? url.slice(1) : url;
      out.push(path.join(process.cwd(), "public", rel));
    }
  }
  return out;
}
