import { NextResponse } from "next/server";

import { AuthError } from "./require-user";

export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: msg }, { status: 500 });
}
