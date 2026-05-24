import * as fs from "fs";
import * as path from "path";
import { NextResponse } from "next/server";

import {
  getContentProjectDir,
  loadDescriptorBySlug,
} from "@/lib/generate-simple-story";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { slug: raw } = await context.params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const base = getContentProjectDir(slug);
  if (!fs.existsSync(path.join(base, "descriptor.json"))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const descriptor = loadDescriptorBySlug(slug);
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
      hasTimeline,
      scenes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
