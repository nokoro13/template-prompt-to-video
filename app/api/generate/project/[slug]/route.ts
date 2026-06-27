import * as fs from "fs";
import * as path from "path";
import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import {
  getContentProjectDir,
  loadDescriptorBySlug,
} from "@/lib/generate-simple-story";
import { getProjectVideoAspectRatio } from "@/lib/project/video-aspect-ratio";
import { assertProjectAccess } from "@/lib/projects/access";
import { projectFileExists } from "@/lib/storage/project-storage";
import { isDatabaseStorageEnabled } from "@/lib/storage/constants";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    await assertProjectAccess(user.id, slug);

    if (isDatabaseStorageEnabled()) {
      const descriptor = await loadDescriptorBySlug(slug, user.id);
      const videoAspectRatio = await getProjectVideoAspectRatio(user.id, slug);
      const scenes = await Promise.all(
        descriptor.content.map(async (c, index) => {
          const ends = c.audioTimestamps.characterEndTimesSeconds;
          const durationMs =
            ends?.length > 0
              ? Math.round(ends[ends.length - 1]! * 1000)
              : null;
          return {
            index,
            text: c.text,
            imageDescription: c.imageDescription,
            uid: c.uid,
            hasImage: await projectFileExists(
              user.id,
              slug,
              `images/${c.uid}.png`,
            ),
            hasAudio: await projectFileExists(
              user.id,
              slug,
              `audio/${c.uid}.mp3`,
            ),
            durationMs,
          };
        }),
      );

      const hasTimeline = await projectFileExists(
        user.id,
        slug,
        "timeline.json",
      );

      return NextResponse.json({
        ok: true,
        shortTitle: descriptor.shortTitle,
        channelStyleId: descriptor.channelStyleId ?? null,
        videoAspectRatio,
        hasTimeline,
        scenes,
      });
    }

    const base = getContentProjectDir(slug);
    if (!fs.existsSync(path.join(base, "descriptor.json"))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const descriptor = await loadDescriptorBySlug(slug);
    const videoAspectRatio = await getProjectVideoAspectRatio(user.id, slug);
    const scenes = descriptor.content.map((c, index) => {
      const imgPath = path.join(base, "images", `${c.uid}.png`);
      const audioPath = path.join(base, "audio", `${c.uid}.mp3`);
      const ends = c.audioTimestamps.characterEndTimesSeconds;
      const durationMs =
        ends?.length > 0
          ? Math.round(ends[ends.length - 1]! * 1000)
          : null;
      return {
        index,
        text: c.text,
        imageDescription: c.imageDescription,
        uid: c.uid,
        hasImage: fs.existsSync(imgPath),
        hasAudio: fs.existsSync(audioPath),
        durationMs,
      };
    });

    const hasTimeline = fs.existsSync(path.join(base, "timeline.json"));

    return NextResponse.json({
      ok: true,
      shortTitle: descriptor.shortTitle,
      channelStyleId: descriptor.channelStyleId ?? null,
      videoAspectRatio,
      hasTimeline,
      scenes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load project";
    const status = msg === "Project not found" ? 404 : 500;
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
