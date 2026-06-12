import * as fs from "fs";
import * as path from "path";

import type { StoryMetadataWithDetails } from "@/src/lib/types";

import {
  buildProjectStoragePrefix,
  getAsset,
  legacyPublicUrl,
  putAsset,
  resolveToLocalPath,
  storageApiUrl,
} from "./assets";
import { useDatabaseStorage, useR2Storage } from "./constants";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

export function legacyProjectRelative(slug: string, rel: string): string {
  return `content/${slug}/${rel.replace(/^\//, "")}`;
}

export function projectPublicDir(slug: string): string {
  return path.join(PUBLIC_ROOT, "content", slug);
}

function projectStorageKey(
  userId: string,
  slug: string,
  rel: string,
): string {
  return `${buildProjectStoragePrefix(userId, slug)}/${rel.replace(/^\//, "")}`;
}

export async function putProjectFile(
  userId: string,
  slug: string,
  relativePath: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<string> {
  const publicRel = legacyProjectRelative(slug, relativePath);
  const { url } = await putAsset({
    storageKey: useR2Storage()
      ? projectStorageKey(userId, slug, relativePath)
      : undefined,
    publicRelativePath: publicRel,
    body,
    contentType,
  });
  return url;
}

export async function putProjectJson(
  userId: string,
  slug: string,
  relativePath: string,
  data: unknown,
): Promise<void> {
  await putProjectFile(
    userId,
    slug,
    relativePath,
    JSON.stringify(data, null, 2),
    "application/json",
  );
}

export async function readProjectJson<T>(
  userId: string,
  slug: string,
  relativePath: string,
): Promise<T | null> {
  const publicRel = legacyProjectRelative(slug, relativePath);
  const buf = await getAsset({
    storageKey: useR2Storage()
      ? projectStorageKey(userId, slug, relativePath)
      : undefined,
    publicRelativePath: publicRel,
  });
  if (!buf) return null;
  return JSON.parse(buf.toString("utf8")) as T;
}

export async function projectFileExists(
  userId: string,
  slug: string,
  relativePath: string,
): Promise<boolean> {
  const publicRel = legacyProjectRelative(slug, relativePath);
  const buf = await getAsset({
    storageKey: useR2Storage()
      ? projectStorageKey(userId, slug, relativePath)
      : undefined,
    publicRelativePath: publicRel,
  });
  return buf !== null;
}

export async function getProjectImagePath(
  userId: string,
  slug: string,
  uid: string,
): Promise<string> {
  const rel = `images/${uid}.png`;
  return resolveToLocalPath({
    url: legacyPublicUrl(legacyProjectRelative(slug, rel)),
    storageKey: useR2Storage()
      ? projectStorageKey(userId, slug, rel)
      : undefined,
    publicRelativePath: legacyProjectRelative(slug, rel),
  });
}

export async function getProjectAudioPath(
  userId: string,
  slug: string,
  uid: string,
): Promise<string> {
  const rel = `audio/${uid}.mp3`;
  return resolveToLocalPath({
    url: legacyPublicUrl(legacyProjectRelative(slug, rel)),
    storageKey: useR2Storage()
      ? projectStorageKey(userId, slug, rel)
      : undefined,
    publicRelativePath: legacyProjectRelative(slug, rel),
  });
}

/** Stage all project assets to `public/content/{slug}/` for Remotion `staticFile()`. */
export async function syncProjectToPublic(
  userId: string,
  slug: string,
): Promise<void> {
  if (!useDatabaseStorage()) return;

  const files = [
    "descriptor.json",
    "timeline.json",
  ];

  const descriptor = await readProjectJson<StoryMetadataWithDetails>(
    userId,
    slug,
    "descriptor.json",
  );
  if (!descriptor) return;

  for (const rel of files) {
    const buf = await getAsset({
      storageKey: useR2Storage()
        ? projectStorageKey(userId, slug, rel)
        : undefined,
      publicRelativePath: legacyProjectRelative(slug, rel),
    });
    if (buf) {
      const dest = path.join(projectPublicDir(slug), rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
    }
  }

  for (const scene of descriptor.content) {
    for (const sub of [`images/${scene.uid}.png`, `audio/${scene.uid}.mp3`]) {
      const buf = await getAsset({
        storageKey: useR2Storage()
          ? projectStorageKey(userId, slug, sub)
          : undefined,
        publicRelativePath: legacyProjectRelative(slug, sub),
      });
      if (buf) {
        const dest = path.join(projectPublicDir(slug), sub);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
      }
    }
  }
}

export function projectThumbnailUrl(
  slug: string,
  imageUid: string,
  userId?: string,
): string {
  const rel = `content/${slug}/images/${imageUid}.png`;
  if (useR2Storage() && userId) {
    return storageApiUrl(projectStorageKey(userId, slug, `images/${imageUid}.png`));
  }
  return legacyPublicUrl(rel);
}
