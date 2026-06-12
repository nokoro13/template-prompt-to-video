import * as fs from "fs";
import * as path from "path";

import { STORAGE_API_PREFIX } from "./constants";
import { getFromR2, isR2Configured, uploadToR2, deleteFromR2 } from "./r2";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

export function buildStyleStoragePrefix(userId: string, styleId: string): string {
  return `users/${userId}/styles/${styleId}`;
}

export function buildProjectStoragePrefix(userId: string, slug: string): string {
  return `users/${userId}/projects/${slug}`;
}

export function buildRenderStorageKey(userId: string, jobId: string): string {
  return `users/${userId}/renders/${jobId}.mp4`;
}

/** Public URL for an asset stored under a user prefix (served via authenticated API). */
export function storageApiUrl(storageKey: string): string {
  return `${STORAGE_API_PREFIX}/${storageKey.replace(/^\//, "")}`;
}

/** Legacy disk URL under `public/`, e.g. `/content/slug/images/x.png`. */
export function legacyPublicUrl(relativePublicPath: string): string {
  const rel = relativePublicPath.replace(/^\//, "");
  return `/${rel.replace(/\\/g, "/")}`;
}

function diskPathFromPublicRelative(relativePublicPath: string): string {
  const rel = relativePublicPath.replace(/^\//, "");
  return path.join(PUBLIC_ROOT, rel);
}

function contentTypeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".mp3":
      return "audio/mpeg";
    case ".mp4":
      return "video/mp4";
    case ".json":
      return "application/json";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function putAsset(options: {
  storageKey?: string;
  /** Relative path under `public/` when not using R2. */
  publicRelativePath: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}): Promise<{ url: string; storageKey?: string }> {
  const contentType =
    options.contentType ?? contentTypeFromExt(options.publicRelativePath);

  const diskPath = diskPathFromPublicRelative(options.publicRelativePath);
  fs.mkdirSync(path.dirname(diskPath), { recursive: true });
  fs.writeFileSync(diskPath, options.body);

  if (isR2Configured() && options.storageKey) {
    await uploadToR2({
      key: options.storageKey,
      body: options.body,
      contentType,
    });
    return { url: storageApiUrl(options.storageKey), storageKey: options.storageKey };
  }

  return { url: legacyPublicUrl(options.publicRelativePath) };
}

export async function getAsset(options: {
  storageKey?: string;
  publicRelativePath?: string;
}): Promise<Buffer | null> {
  if (isR2Configured() && options.storageKey) {
    const fromR2 = await getFromR2(options.storageKey);
    if (fromR2) return fromR2;
  }

  if (options.publicRelativePath) {
    const diskPath = diskPathFromPublicRelative(options.publicRelativePath);
    if (fs.existsSync(diskPath)) {
      return fs.readFileSync(diskPath);
    }
  }

  return null;
}

export async function deleteAsset(options: {
  storageKey?: string;
  publicRelativePath?: string;
}): Promise<void> {
  if (isR2Configured() && options.storageKey) {
    try {
      await deleteFromR2(options.storageKey);
    } catch {
      /* ignore */
    }
  }

  if (options.publicRelativePath) {
    const diskPath = diskPathFromPublicRelative(options.publicRelativePath);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  }
}

/** Resolve a stored URL or legacy public path to a local filesystem path (downloads from R2 if needed). */
export async function resolveToLocalPath(options: {
  url: string;
  storageKey?: string;
  publicRelativePath?: string;
}): Promise<string> {
  const rel =
    options.publicRelativePath ??
    (options.url.startsWith("/") ? options.url.slice(1) : options.url);
  const diskPath = diskPathFromPublicRelative(rel);

  if (fs.existsSync(diskPath)) {
    return diskPath;
  }

  const key = options.storageKey;
  if (key && isR2Configured()) {
    const buf = await getFromR2(key);
    if (buf) {
      fs.mkdirSync(path.dirname(diskPath), { recursive: true });
      fs.writeFileSync(diskPath, buf);
      return diskPath;
    }
  }

  throw new Error(`Asset not found: ${options.url}`);
}

export function parseStorageApiKey(urlOrPath: string): string | null {
  const normalized = urlOrPath.replace(/^\//, "");
  const prefix = STORAGE_API_PREFIX.replace(/^\//, "");
  if (!normalized.startsWith(`${prefix}/`)) return null;
  return normalized.slice(prefix.length + 1);
}
