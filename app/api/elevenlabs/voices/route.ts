import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_ELEVENLABS_VOICE_ID } from "@/lib/elevenlabs/constants";
import { listElevenLabsVoices } from "@/lib/elevenlabs/list-voices";

/**
 * POST body: `{ "elevenlabsApiKey"?: string }` — uses server env when omitted.
 * Returns `{ voices: { voice_id, name, category? }[] }` for UI selects.
 */
export async function POST(req: NextRequest) {
  let body: { elevenlabsApiKey?: string };
  try {
    body = (await req.json()) as { elevenlabsApiKey?: string };
  } catch {
    body = {};
  }

  const apiKey =
    typeof body.elevenlabsApiKey === "string" && body.elevenlabsApiKey.trim()
      ? body.elevenlabsApiKey.trim()
      : process.env.ELEVENLABS_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ElevenLabs API key. Set ELEVENLABS_API_KEY or pass elevenlabsApiKey in the body.",
      },
      { status: 400 },
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
