import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { runSimpleGenerate } from "@/lib/generate-simple-story";
import { parseGeminiImageSize } from "@/lib/generation/generate-with-gemini";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: {
      title?: string;
      topic?: string;
      skipVoice?: boolean;
      voiceId?: string;
      styleId?: string;
      useWebSearch?: boolean;
      imageSize?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!title || !topic) {
      return NextResponse.json(
        { error: "title and topic are required" },
        { status: 400 },
      );
    }

    const skipVoice = body.skipVoice === true;
    const voiceId =
      typeof body.voiceId === "string" && body.voiceId.trim()
        ? body.voiceId.trim()
        : undefined;
    const styleId =
      typeof body.styleId === "string" && body.styleId.trim()
        ? body.styleId.trim()
        : undefined;

    const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
    const geminiApiKey = process.env.NANO_BANANA_API_KEY?.trim() || "";
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";

    if (!openaiApiKey) {
      return NextResponse.json(
        {
          error: "AI generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Image generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    const imageSize =
      typeof body.imageSize === "string" && body.imageSize.trim()
        ? parseGeminiImageSize(body.imageSize.trim())
        : undefined;

    if (!skipVoice && !elevenlabsApiKey) {
      return NextResponse.json(
        {
          error: "Voice generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    const result = await runSimpleGenerate({
      userId: user.id,
      title,
      topic,
      openaiApiKey,
      geminiApiKey,
      elevenlabsApiKey: skipVoice ? undefined : elevenlabsApiKey,
      skipVoice,
      elevenLabsVoiceId: skipVoice ? undefined : voiceId,
      styleId,
      useWebSearch: body.useWebSearch === true,
      imageSize,
    });
    return NextResponse.json({ ok: true, slug: result.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
