import { NextResponse } from "next/server";

import { DEFAULT_ELEVENLABS_VOICE_ID } from "@/lib/elevenlabs/constants";
import { listElevenLabsVoices } from "@/lib/elevenlabs/list-voices";

/** Returns `{ voices: { voice_id, name, category? }[] }` using server-side keys. */
export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Voice previews are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  try {
    const voices = await listElevenLabsVoices(apiKey);
    return NextResponse.json({
      ok: true,
      voices,
      defaultVoiceId: DEFAULT_ELEVENLABS_VOICE_ID,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list voices";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
