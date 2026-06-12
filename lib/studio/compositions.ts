import fs from "node:fs";
import path from "node:path";

import { FPS } from "@/src/lib/constants";
import type { Timeline } from "@/src/lib/types";
import { TimelineSchema } from "@/src/lib/types";

import { listProjectsForUser } from "../db/projects";
import { isDatabaseStorageEnabled } from "../storage/constants";
import {
  projectFileExists,
  projectThumbnailUrl,
  readProjectJson,
  syncProjectToPublic,
} from "../storage/project-storage";
import { getTotalDurationInFrames } from "./timeline";

/** Slug-style id only (matches folders under `public/content/`). */
export function isValidCompositionId(id: string): boolean {
  if (!id || id.length > 240) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

/**
 * Remove `public/content/{id}/` and all assets inside.
 */
export function deleteCompositionFromDisk(id: string): void {
  if (!isValidCompositionId(id)) {
    throw new Error("Invalid composition id");
  }

  const contentRoot = path.resolve(path.join(process.cwd(), "public", "content"));
  const target = path.resolve(path.join(contentRoot, id));

  const relative = path.relative(contentRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid composition path");
  }

  if (!fs.existsSync(target)) {
    throw new Error("Composition not found");
  }

  fs.rmSync(target, { recursive: true, force: true });
}

export type CompositionSummary = {
  id: string;
  shortTitle: string;
  durationInFrames: number;
  fps: number;
  hasTimeline: true;
  thumbnailUrl: string | null;
  sceneCount: number;
  updatedAt: string;
};

function summaryFromTimeline(
  id: string,
  timeline: Timeline,
  thumbnailUrl: string | null,
  updatedAt: string,
): CompositionSummary {
  return {
    id,
    shortTitle: timeline.shortTitle,
    durationInFrames: getTotalDurationInFrames(timeline),
    fps: FPS,
    hasTimeline: true,
    thumbnailUrl,
    sceneCount: timeline.elements.length,
    updatedAt,
  };
}

/**
 * List project folders under `public/content/` that contain `timeline.json`.
 */
export function listCompositionsFromDisk(): CompositionSummary[] {
  const contentRoot = path.join(process.cwd(), "public", "content");
  if (!fs.existsSync(contentRoot)) {
    return [];
  }

  const entries = fs.readdirSync(contentRoot, { withFileTypes: true });
  const out: CompositionSummary[] = [];

  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    const id = dirent.name;
    const timelinePath = path.join(contentRoot, id, "timeline.json");
    if (!fs.existsSync(timelinePath)) continue;

    try {
      const raw = fs.readFileSync(timelinePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const timeline = TimelineSchema.parse(parsed) as Timeline;
      const firstImageUid = timeline.elements[0]?.imageUrl;
      const thumbnailUrl =
        firstImageUid &&
        fs.existsSync(
          path.join(contentRoot, id, "images", `${firstImageUid}.png`),
        )
          ? `/content/${id}/images/${firstImageUid}.png`
          : null;

      out.push(
        summaryFromTimeline(
          id,
          timeline,
          thumbnailUrl,
          fs.statSync(timelinePath).mtime.toISOString(),
        ),
      );
    } catch {
      continue;
    }
  }

  out.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return out;
}

export async function listCompositionsForUser(
  userId: string,
): Promise<CompositionSummary[]> {
  if (!isDatabaseStorageEnabled()) {
    return listCompositionsFromDisk();
  }

  const projects = await listProjectsForUser(userId);
  const out: CompositionSummary[] = [];

  for (const project of projects) {
    const timeline = await readProjectJson<Timeline>(
      userId,
      project.slug,
      "timeline.json",
    );
    if (!timeline) continue;

    const firstImageUid = timeline.elements[0]?.imageUrl;
    const hasThumb =
      firstImageUid &&
      (await projectFileExists(
        userId,
        project.slug,
        `images/${firstImageUid}.png`,
      ));
    const thumbnailUrl = hasThumb
      ? projectThumbnailUrl(project.slug, firstImageUid!, userId)
      : null;

    out.push(
      summaryFromTimeline(
        project.slug,
        timeline,
        thumbnailUrl,
        project.updatedAt.toISOString(),
      ),
    );
  }

  return out;
}

export async function ensureCompositionOnDisk(
  userId: string,
  compositionId: string,
): Promise<void> {
  if (!isDatabaseStorageEnabled()) return;
  await syncProjectToPublic(userId, compositionId);
}

export async function compositionExistsForUser(
  userId: string,
  compositionId: string,
): Promise<boolean> {
  if (!isDatabaseStorageEnabled()) {
    return listCompositionsFromDisk().some((c) => c.id === compositionId);
  }

  const timeline = await readProjectJson<Timeline>(
    userId,
    compositionId,
    "timeline.json",
  );
  return timeline !== null;
}
