import { auth } from "@clerk/nextjs/server";

import { ensureUser } from "@/lib/auth/ensure-user";
import { isDatabaseConfigured } from "@/lib/db";

/** Upserts the signed-in Clerk user into Postgres on each app load. */
export async function SyncUser() {
  const { userId } = await auth();
  if (!userId || !isDatabaseConfigured()) {
    return null;
  }

  try {
    await ensureUser(userId);
  } catch {
    // Non-fatal while DATABASE_URL or Clerk is being configured locally.
  }

  return null;
}
