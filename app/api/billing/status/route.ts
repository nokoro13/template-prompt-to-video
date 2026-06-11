import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { checkUserHasSubscription } from "@/lib/billing/check-subscription";
import { BILLING_PLANS, hasActiveSubscription } from "@/lib/billing/config";

/** Dev helper: inspect subscription state when dashboard gating fails. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId, has } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subscription: unknown = null;
  let subscriptionError: string | null = null;

  try {
    const client = await clerkClient();
    subscription = await client.billing.getUserBillingSubscription(userId);
  } catch (error) {
    subscriptionError =
      error instanceof Error ? error.message : "Failed to load subscription";
  }

  return NextResponse.json({
    userId,
    expectedPlanSlugs: Object.values(BILLING_PLANS),
    sessionHasPlan: {
      basic: has({ plan: BILLING_PLANS.basic }),
      premium: has({ plan: BILLING_PLANS.premium }),
    },
    sessionHasActiveSubscription: hasActiveSubscription(has),
    apiHasActiveSubscription: await checkUserHasSubscription(userId, has),
    subscription,
    subscriptionError,
  });
}
