import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { appendStyleImages } from "@/lib/channel-styles/append-images";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser();
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

    const style = await appendStyleImages(user.id, id, imageBuffers);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg.includes("not found") ? 404 : 400;
    if (status === 404 || (err instanceof Error && !("status" in err))) {
      return NextResponse.json({ error: msg }, { status });
    }
    return handleAuthError(err);
  }
}
