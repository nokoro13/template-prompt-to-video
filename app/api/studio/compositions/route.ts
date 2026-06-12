import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { listCompositionsForUser } from "@/lib/studio/compositions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const compositions = await listCompositionsForUser(user.id);
    return NextResponse.json({ compositions });
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e);
    }
    const message = e instanceof Error ? e.message : "Failed to list compositions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
