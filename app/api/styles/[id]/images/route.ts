import { NextRequest, NextResponse } from "next/server";
import { appendStyleImages } from "@/lib/channel-styles/append-images";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const files = form.getAll("images");
  const imageBuffers: { filename: string; buffer: Buffer }[] = [];
  for (const f of files) {
    if (f instanceof File && f.size > 0) {
      const buf = Buffer.from(await f.arrayBuffer());
      imageBuffers.push({ filename: f.name || "image.png", buffer: buf });
    }
  }

  if (imageBuffers.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  try {
    const style = appendStyleImages(id, imageBuffers);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
