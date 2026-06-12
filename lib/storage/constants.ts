import { isDatabaseConfigured } from "@/lib/db";

import { isR2Configured } from "./r2";

/** When set, blobs are stored in R2; otherwise written under `public/`. */
export function useR2Storage(): boolean {
  return isR2Configured();
}

export function useDatabaseStorage(): boolean {
  return isDatabaseConfigured();
}

/** Authenticated URL prefix for user-owned assets served via `/api/storage/`. */
export const STORAGE_API_PREFIX = "/api/storage";
