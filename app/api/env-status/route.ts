import { NextResponse } from "next/server";

import { isRemotionLambdaConfigured } from "@/lib/export/lambda-config";
import { isDatabaseStorageEnabled, isR2StorageEnabled } from "@/lib/storage/constants";

/**
 * Reports whether server-side env has API keys (no secrets exposed).
 * Used by the video editor so users know .env is enough.
 */
export function GET() {
  return NextResponse.json({
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    nanoBanana: Boolean(process.env.NANO_BANANA_API_KEY?.trim()),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    export:
      isRemotionLambdaConfigured() &&
      isR2StorageEnabled() &&
      isDatabaseStorageEnabled(),
  });
}
