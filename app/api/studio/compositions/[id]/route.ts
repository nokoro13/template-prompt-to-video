import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { deleteProjectForUser } from "@/lib/db/projects";
import {
  compositionExistsForUser,
  deleteCompositionFromDisk,
  isValidCompositionId,
} from "@/lib/studio/compositions";
import { useDatabaseStorage } from "@/lib/storage/constants";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId);

    if (!isValidCompositionId(id)) {
      return NextResponse.json({ error: "Invalid composition id" }, { status: 400 });
    }

    if (useDatabaseStorage()) {
      const exists = await compositionExistsForUser(user.id, id);
      if (!exists) {
        return NextResponse.json({ error: "Composition not found" }, { status: 404 });
      }
      await deleteProjectForUser(user.id, id);
    }

    try {
      deleteCompositionFromDisk(id);
    } catch (e) {
      if (!useDatabaseStorage()) {
        const message = e instanceof Error ? e.message : "Failed to delete";
        const status =
          message === "Composition not found"
            ? 404
            : message === "Invalid composition path"
              ? 400
              : 500;
        return NextResponse.json({ error: message }, { status });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
