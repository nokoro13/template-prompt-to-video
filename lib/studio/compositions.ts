import fs from "node:fs";
import path from "node:path";

import { FPS } from "@/src/lib/constants";
import type { Timeline } from "@/src/lib/types";
import { TimelineSchema } from "@/src/lib/types";

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
};

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
      out.push({
        id,
        shortTitle: timeline.shortTitle,
        durationInFrames: getTotalDurationInFrames(timeline),
        fps: FPS,
        hasTimeline: true,
      });
    } catch {
      continue;
    }
  }

  out.sort((a, b) => a.shortTitle.localeCompare(b.shortTitle));
  return out;
}
