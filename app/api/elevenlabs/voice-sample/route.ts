import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies GET /v1/voices/{voice_id}/samples/{sample_id}/audio so the API key
 * stays server-side.
 * @see https://elevenlabs.io/docs/api-reference/voices/samples/get
 */
export async function POST(req: NextRequest) {
  let body: {
    voiceId?: string;
    sampleId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const sampleId = typeof body.sampleId === "string" ? body.sampleId.trim() : "";
  if (!voiceId || !sampleId) {
    return NextResponse.json(
      { error: "voiceId and sampleId are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Voice previews are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const url = `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}/samples/${encodeURIComponent(sampleId)}/audio`;
  const upstream = await fetch(url, {
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/*,*/*",
    },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: text.slice(0, 500) || upstream.statusText },
      { status: upstream.status },
    );
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const contentType =
    upstream.headers.get("content-type") ?? "audio/mpeg";

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
