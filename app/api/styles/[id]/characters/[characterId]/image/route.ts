import { NextRequest, NextResponse } from "next/server";

import {
  clearStyleCharacterImage,
  setStyleCharacterImage,
} from "@/lib/channel-styles/character-images";

type RouteContext = {
  params: Promise<{ id: string; characterId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id, characterId } = await context.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const imageFields = form.getAll("image");
  if (imageFields.length > 1) {
    return NextResponse.json(
      { error: "Only one image per character is allowed" },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Expected a single non-empty image file" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || "character.png";

  try {
    const style = setStyleCharacterImage(id, characterId, buffer, filename);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id, characterId } = await context.params;
  try {
    const style = clearStyleCharacterImage(id, characterId);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Remove failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
