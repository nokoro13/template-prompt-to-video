import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { listCompositionsFromDisk } from "@/lib/studio/compositions";
import { createRenderJob } from "@/lib/studio/render-jobs";
import { startRemotionRenderJob } from "@/lib/studio/start-render";

const bodySchema = z.object({
  compositionId: z.string().min(1),
  aspectRatio: z.enum(["9:16", "16:9"]),
});

export const maxDuration = 300;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { compositionId, aspectRatio } = parsed.data;
  const exists = listCompositionsFromDisk().some((c) => c.id === compositionId);
  if (!exists) {
    return NextResponse.json(
      { error: "Unknown composition" },
      { status: 404 },
    );
  }

  const jobId = randomUUID();
  createRenderJob(jobId, compositionId, aspectRatio);

  const projectRoot = process.cwd();
  startRemotionRenderJob({
    jobId,
    compositionId,
    aspectRatio,
    projectRoot,
  });

  return NextResponse.json({ jobId });
}
