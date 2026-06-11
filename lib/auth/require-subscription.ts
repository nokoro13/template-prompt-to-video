import { auth } from "@clerk/nextjs/server";

import { checkUserHasSubscription } from "@/lib/billing/check-subscription";

import { AuthError } from "./require-user";

/**
 * Require a signed-in user with an active Clerk subscription.
 * Use in API routes and server actions that should be paywalled.
 */
export async function requireSubscription(): Promise<void> {
  const { userId, has } = await auth();

  if (!userId) {
    throw new AuthError("Unauthorized", 401);
  }

  if (!(await checkUserHasSubscription(userId, has))) {
    throw new AuthError("Active subscription required", 403);
  }
}
