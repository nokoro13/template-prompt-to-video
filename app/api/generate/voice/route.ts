import { NextRequest, NextResponse } from "next/server";

import { generateVoicePhase } from "@/lib/generate-simple-story";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    elevenlabsApiKey?: string;
    skipVoice?: boolean;
    voiceId?: string;
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

  const skipVoice = body.skipVoice === true;
  const voiceId =
    typeof body.voiceId === "string" && body.voiceId.trim()
      ? body.voiceId.trim()
      : undefined;
  const elevenlabsApiKey =
    body.elevenlabsApiKey?.trim() || process.env.ELEVENLABS_API_KEY || "";

  if (!skipVoice && !elevenlabsApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ElevenLabs key. Set ELEVENLABS_API_KEY in .env, pass elevenlabsApiKey, or set skipVoice: true.",
      },
      { status: 400 },
    );
  }

  try {
    await generateVoicePhase({
      slug,
      elevenlabsApiKey: skipVoice ? undefined : elevenlabsApiKey,
      skipVoice,
      voiceId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
