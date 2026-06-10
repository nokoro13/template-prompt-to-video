import { auth } from "@clerk/nextjs/server";

import { ensureUser, type DbUser } from "./ensure-user";
import { isDatabaseConfigured } from "@/lib/db";

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Require a signed-in Clerk session and sync the user to Postgres.
 * Use in API routes and server actions.
 */
export async function requireUser(): Promise<DbUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError("Unauthorized", 401);
  }

  if (!isDatabaseConfigured()) {
    throw new AuthError(
      "Database is not configured. Set DATABASE_URL in .env.local",
      503,
    );
  }

  return ensureUser(userId);
}

/** Returns null when unauthenticated (does not throw). */
export async function getOptionalUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId || !isDatabaseConfigured()) {
    return null;
  }
  try {
    return await ensureUser(userId);
  } catch {
    return null;
  }
}
