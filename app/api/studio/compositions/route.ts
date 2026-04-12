import { NextResponse } from "next/server";

import { listCompositionsFromDisk } from "@/lib/studio/compositions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const compositions = listCompositionsFromDisk();
    return NextResponse.json({ compositions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list compositions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
