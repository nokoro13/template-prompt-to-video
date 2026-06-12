import { NextRequest, NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import {
  clearStyleCharacterImage,
  setStyleCharacterImage,
} from "@/lib/channel-styles/character-images";

type RouteContext = {
  params: Promise<{ id: string; characterId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser();
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

    const style = await setStyleCharacterImage(
      user.id,
      id,
      characterId,
      buffer,
      filename,
    );
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id, characterId } = await context.params;
    const style = await clearStyleCharacterImage(user.id, id, characterId);
    return NextResponse.json({ ok: true, style });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Remove failed";
    const status = msg.includes("not found") ? 404 : 400;
    if (status === 404 || (err instanceof Error && !("status" in err))) {
      return NextResponse.json({ error: msg }, { status });
    }
    return handleAuthError(err);
  }
}
