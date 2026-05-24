import { NextRequest, NextResponse } from "next/server";
import { runSimpleGenerate } from "@/lib/generate-simple-story";
import { parseGeminiImageSize } from "@/lib/generation/generate-with-gemini";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    topic?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    elevenlabsApiKey?: string;
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

  const openaiApiKey =
    body.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || "";
  const geminiApiKey =
    body.geminiApiKey?.trim() || process.env.NANO_BANANA_API_KEY || "";
  const elevenlabsApiKey =
    body.elevenlabsApiKey?.trim() || process.env.ELEVENLABS_API_KEY || "";

  if (!openaiApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OpenAI key. Set OPENAI_API_KEY in .env or pass openaiApiKey in the request.",
      },
      { status: 400 },
    );
  }

  if (!geminiApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing Gemini key. Set NANO_BANANA_API_KEY in .env or pass geminiApiKey in the request.",
      },
      { status: 400 },
    );
  }

  const imageSize =
    typeof body.imageSize === "string" && body.imageSize.trim()
      ? parseGeminiImageSize(body.imageSize.trim())
      : undefined;

  if (!skipVoice && !elevenlabsApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ElevenLabs key. Set ELEVENLABS_API_KEY in .env or pass elevenlabsApiKey in the request (unless skipVoice is true).",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runSimpleGenerate({
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
