/**
 * Clerk Billing plan slugs — must match the slugs configured in the
 * Clerk Dashboard → Billing → Subscription plans → Plans for Users.
 *
 * Basic and Premium share the same app access. The only difference is the
 * monthly credit allowance (see PLAN_MONTHLY_CREDITS).
 *
 * @see https://clerk.com/docs/nextjs/guides/billing/for-b2c
 */
export const BILLING_PLANS = {
  basic: "basic",
  premium: "premium",
} as const;

export type BillingPlanSlug =
  (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

/** Monthly credits included with each plan. Adjust when your credit system is live. */
export const PLAN_MONTHLY_CREDITS: Record<BillingPlanSlug, number> = {
  basic: 25_000,
  premium: 65_000,
};

export const PLAN_LABELS: Record<BillingPlanSlug, string> = {
  basic: "Basic",
  premium: "Premium",
};

type SubscriptionHasCheck = (
  params: { plan: string } | { feature: string },
) => boolean;

/** True when the user has Basic or Premium — both unlock the dashboard. */
export function hasActiveSubscription(has: SubscriptionHasCheck): boolean {
  return Object.values(BILLING_PLANS).some((plan) => has({ plan }));
}

/** Returns the user's active plan slug, or null if unsubscribed. Premium wins if both are set. */
export function getActivePlan(
  has: (params: { plan: string }) => boolean,
): BillingPlanSlug | null {
  if (has({ plan: BILLING_PLANS.premium })) {
    return BILLING_PLANS.premium;
  }
  if (has({ plan: BILLING_PLANS.basic })) {
    return BILLING_PLANS.basic;
  }
  return null;
}

export function getPlanMonthlyCredits(plan: BillingPlanSlug): number {
  return PLAN_MONTHLY_CREDITS[plan];
}
