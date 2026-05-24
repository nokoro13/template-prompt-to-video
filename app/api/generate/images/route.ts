import { NextRequest, NextResponse } from "next/server";

import {
  generateImagesPhase,
  loadDescriptorBySlug,
} from "@/lib/generate-simple-story";
import { parseGeminiImageSize } from "@/lib/generation/generate-with-gemini";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    geminiApiKey?: string;
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

  const geminiApiKey =
    body.geminiApiKey?.trim() || process.env.NANO_BANANA_API_KEY || "";

  if (!geminiApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing Gemini key. Set NANO_BANANA_API_KEY in .env or pass geminiApiKey in the request.",
      },
      { status: 400 },
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

  try {
    if (sceneIndex != null) {
      const d = loadDescriptorBySlug(slug);
      if (sceneIndex < 0 || sceneIndex >= d.content.length) {
        return NextResponse.json(
          { error: "sceneIndex out of range" },
          { status: 400 },
        );
      }
    }
    await generateImagesPhase({
      slug,
      geminiApiKey,
      sceneIndex: sceneIndex ?? null,
      imageSize,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
