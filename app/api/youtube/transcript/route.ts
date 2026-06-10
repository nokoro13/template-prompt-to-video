import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubeTranscript } from "@/lib/youtube/fetch-transcript";

/**
 * POST body: `{ "url": string }` — YouTube watch/shorts/youtu.be URL or 11-char video id.
 * Returns `{ ok: true, videoId, title, content }`.
 */
export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Expected { url: string }" }, { status: 400 });
  }

  try {
    const result = await fetchYouTubeTranscript(url);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch transcript";
    const status =
      msg.includes("Invalid YouTube URL") ||
      msg.includes("empty") ||
      msg.includes("too large")
        ? 400
        : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
