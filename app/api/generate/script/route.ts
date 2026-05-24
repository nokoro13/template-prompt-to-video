import { NextRequest, NextResponse } from "next/server";

import { generateScriptPhase } from "@/lib/generate-simple-story";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    topic?: string;
    openaiApiKey?: string;
    styleId?: string;
    useWebSearch?: boolean;
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

  const styleId =
    typeof body.styleId === "string" && body.styleId.trim()
      ? body.styleId.trim()
      : undefined;

  const openaiApiKey =
    body.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || "";

  if (!openaiApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OpenAI key. Set OPENAI_API_KEY in .env or pass openaiApiKey in the request.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await generateScriptPhase({
      title,
      topic,
      openaiApiKey,
      styleId,
      useWebSearch: body.useWebSearch === true,
    });
    return NextResponse.json({ ok: true, slug: result.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Script generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
