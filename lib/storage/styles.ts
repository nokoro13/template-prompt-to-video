import * as fs from "fs";
import * as path from "path";
import type { ChannelStyleRecord, StylesIndex } from "../channel-styles/types";
import { ChannelStyleRecordSchema, StylesIndexSchema } from "../channel-styles/types";

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

export function getStyle(id: string): ChannelStyleRecord | null {
  const index = readStylesIndex();
  return index.styles[id] ?? null;
}

export function listStyles(): ChannelStyleRecord[] {
  const index = readStylesIndex();
  return Object.values(index.styles).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveStyle(record: ChannelStyleRecord): void {
  const parsed = ChannelStyleRecordSchema.parse(record);
  const index = readStylesIndex();
  index.styles[parsed.id] = parsed;
  writeStylesIndex(index);
}

export function deleteStyle(id: string): void {
  const index = readStylesIndex();
  delete index.styles[id];
  writeStylesIndex(index);
  const dir = styleDir(id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function readTranscriptFile(publicPath: string): string {
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const full = path.join(process.cwd(), "public", rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Transcript not found: ${publicPath}`);
  }
  return fs.readFileSync(full, "utf-8");
}

/** Absolute filesystem paths for reference images (for generation). */
export function resolveStyleImagePaths(record: ChannelStyleRecord): string[] {
  return record.references.images.map((url) => {
    const rel = url.startsWith("/") ? url.slice(1) : url;
    return path.join(process.cwd(), "public", rel);
  });
}
