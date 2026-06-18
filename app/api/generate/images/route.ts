import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import {
  generateImagesPhase,
  loadDescriptorBySlug,
} from "@/lib/generate-simple-story";
import { parseGeminiImageSize } from "@/lib/generation/generate-with-gemini";
import { assertProjectAccess } from "@/lib/projects/access";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: {
      slug?: string;
      sceneIndex?: number | null;
      imageSize?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    await assertProjectAccess(user.id, slug);

    const geminiApiKey = process.env.NANO_BANANA_API_KEY?.trim() || "";

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Image generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    const sceneIndex =
      typeof body.sceneIndex === "number" && Number.isInteger(body.sceneIndex)
        ? body.sceneIndex
        : undefined;

    const imageSize =
      typeof body.imageSize === "string" && body.imageSize.trim()
        ? parseGeminiImageSize(body.imageSize.trim())
        : undefined;

    if (sceneIndex != null) {
      const d = await loadDescriptorBySlug(slug, user.id);
      if (sceneIndex < 0 || sceneIndex >= d.content.length) {
        return NextResponse.json(
          { error: "sceneIndex out of range" },
          { status: 400 },
        );
      }
    }

    await generateImagesPhase({
      slug,
      userId: user.id,
      geminiApiKey,
      sceneIndex: sceneIndex ?? null,
      imageSize,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    const status = msg === "Project not found" ? 404 : 500;
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
