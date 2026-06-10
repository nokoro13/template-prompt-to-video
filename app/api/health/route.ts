import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db";
import { isR2Configured } from "@/lib/storage/r2";

export async function GET() {
  return NextResponse.json({
    ok: true,
    database: isDatabaseConfigured(),
    r2: isR2Configured(),
  });
}
