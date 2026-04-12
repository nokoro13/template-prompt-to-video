import { NextResponse } from "next/server";

import { deleteCompositionFromDisk } from "@/lib/studio/compositions";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId);

  try {
    deleteCompositionFromDisk(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    const status =
      message === "Composition not found"
        ? 404
        : message === "Invalid composition id" ||
            message === "Invalid composition path"
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
