import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { generateVoicePhase } from "@/lib/generate-simple-story";
import { assertProjectAccess } from "@/lib/projects/access";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: {
      slug?: string;
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

    await assertProjectAccess(user.id, slug);

    const skipVoice = body.skipVoice === true;
    const voiceId =
      typeof body.voiceId === "string" && body.voiceId.trim()
        ? body.voiceId.trim()
        : undefined;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";

    if (!skipVoice && !elevenlabsApiKey) {
      return NextResponse.json(
        {
          error: "Voice generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    await generateVoicePhase({
      slug,
      userId: user.id,
      elevenlabsApiKey: skipVoice ? undefined : elevenlabsApiKey,
      skipVoice,
      voiceId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice generation failed";
    const status = msg === "Project not found" ? 404 : 500;
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
