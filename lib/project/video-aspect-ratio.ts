import fs from "node:fs";
import path from "node:path";

import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { getProjectForUser } from "@/lib/db/projects";
import { getContentProjectDir } from "@/lib/generate-simple-story";
import { getAsset } from "@/lib/storage/assets";
import { isDatabaseStorageEnabled, isR2StorageEnabled } from "@/lib/storage/constants";
import {
  legacyProjectRelative,
  readProjectJson,
} from "@/lib/storage/project-storage";
import { getStyle } from "@/lib/storage/styles";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import type { StoryMetadataWithDetails } from "@/src/lib/types";

import { getPngDimensions } from "./png-dimensions";

function projectStorageKey(
  userId: string,
  slug: string,
  relativePath: string,
): string {
  return `users/${userId}/projects/${slug}/${relativePath.replace(/^\//, "")}`;
}

export function aspectRatioFromPixelDimensions(
  width: number,
  height: number,
): VideoAspectRatio {
  return width > height ? "16:9" : "9:16";
}

export function resolveAspectRatioFromStyle(
  style: ChannelStyleRecord | null | undefined,
): VideoAspectRatio {
  return style?.videoAspectRatio ?? "9:16";
}

async function readFirstSceneImageBuffer(
  userId: string,
  slug: string,
  descriptor: StoryMetadataWithDetails,
): Promise<Buffer | null> {
  const firstUid = descriptor.content[0]?.uid;
  if (!firstUid) return null;
  const relativePath = `images/${firstUid}.png`;

  if (isDatabaseStorageEnabled() && userId) {
    return getAsset({
      storageKey: isR2StorageEnabled()
        ? projectStorageKey(userId, slug, relativePath)
        : undefined,
      publicRelativePath: legacyProjectRelative(slug, relativePath),
    });
  }

  const diskPath = path.join(getContentProjectDir(slug), relativePath);
  if (!fs.existsSync(diskPath)) return null;
  return fs.readFileSync(diskPath);
}

async function inferAspectRatioFromSceneImages(
  userId: string,
  slug: string,
  descriptor: StoryMetadataWithDetails,
): Promise<VideoAspectRatio | null> {
  const buffer = await readFirstSceneImageBuffer(userId, slug, descriptor);
  if (!buffer) return null;
  const dims = getPngDimensions(buffer);
  if (!dims) return null;
  return aspectRatioFromPixelDimensions(dims.width, dims.height);
}

async function loadProjectDescriptor(
  userId: string,
  projectSlug: string,
): Promise<StoryMetadataWithDetails | null> {
  if (isDatabaseStorageEnabled()) {
    return readProjectJson<StoryMetadataWithDetails>(
      userId,
      projectSlug,
      "descriptor.json",
    );
  }

  const diskPath = path.join(getContentProjectDir(projectSlug), "descriptor.json");
  if (!fs.existsSync(diskPath)) return null;
  const raw = fs.readFileSync(diskPath, "utf8");
  return JSON.parse(raw) as StoryMetadataWithDetails;
}

/** Locked at generation time in descriptor.json; survives style deletion. */
export async function getProjectVideoAspectRatio(
  userId: string,
  projectSlug: string,
): Promise<VideoAspectRatio> {
  const descriptor = await loadProjectDescriptor(userId, projectSlug);
  if (descriptor?.videoAspectRatio) {
    return descriptor.videoAspectRatio;
  }

  const project = await getProjectForUser(userId, projectSlug);
  if (project?.styleId) {
    const style = await getStyle(project.styleId, userId);
    if (style?.videoAspectRatio) {
      return style.videoAspectRatio;
    }
  }

  if (descriptor) {
    const inferred = await inferAspectRatioFromSceneImages(
      userId,
      projectSlug,
      descriptor,
    );
    if (inferred) return inferred;
  }

  return "9:16";
}
