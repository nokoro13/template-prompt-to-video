import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { suggestTopicFromStyle } from "@/lib/generation/suggest-topic";
import { getStyle } from "@/lib/storage/styles";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: {
      title?: string;
      styleId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const styleId = typeof body.styleId === "string" ? body.styleId.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }
    if (!styleId) {
      return NextResponse.json(
        { error: "styleId is required — topic suggestions use a channel style" },
        { status: 400 },
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
    if (!openaiApiKey) {
      return NextResponse.json(
        {
          error: "AI generation is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    const style = await getStyle(styleId, user.id);
    if (!style) {
      return NextResponse.json({ error: "Style not found" }, { status: 404 });
    }

    if (!style.extractedFormat) {
      return NextResponse.json(
        {
          error:
            "This style has no format analysis yet. Open the style in Styles, run Re-analyze on the Format tab (or save format), then try again.",
        },
        { status: 400 },
      );
    }

    const topic = await suggestTopicFromStyle(openaiApiKey, {
      title,
      styleName: style.name,
      styleDescription: style.description,
      extractedFormat: style.extractedFormat,
    });
    return NextResponse.json({ ok: true, topic });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not suggest a topic";
    if (err instanceof Error && "status" in err) {
      return handleAuthError(err);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
