import { clerkClient } from "@clerk/nextjs/server";

import {
  BILLING_PLANS,
  hasActiveSubscription,
  type BillingPlanSlug,
} from "./config";

const PAID_PLAN_SLUGS = new Set<string>(Object.values(BILLING_PLANS));

const ACTIVE_ITEM_STATUSES = new Set(["active", "upcoming", "trialing"]);

type SubscriptionHasCheck = (
  params: { plan: string } | { feature: string },
) => boolean;

type SubscriptionItemRecord = {
  status?: string;
  plan?: {
    slug?: string;
    key?: string;
    id?: string;
    name?: string;
  };
};

type BillingSubscriptionRecord = {
  status?: string;
  subscriptionItems?: SubscriptionItemRecord[];
  items?: SubscriptionItemRecord[];
};

function normalizePlanSlug(slug: string | undefined): string | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  if (PAID_PLAN_SLUGS.has(slug) || PAID_PLAN_SLUGS.has(lower)) {
    return PAID_PLAN_SLUGS.has(slug) ? slug : lower;
  }
  return null;
}

function getSubscriptionItems(
  subscription: BillingSubscriptionRecord,
): SubscriptionItemRecord[] {
  return subscription.subscriptionItems ?? subscription.items ?? [];
}

function planFromName(name: string | undefined): BillingPlanSlug | null {
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("premium")) {
    return BILLING_PLANS.premium;
  }
  if (lower.includes("basic")) {
    return BILLING_PLANS.basic;
  }
  return null;
}

function getPaidPlanFromSubscription(
  subscription: BillingSubscriptionRecord,
): BillingPlanSlug | null {
  let basicMatch: BillingPlanSlug | null = null;

  for (const item of getSubscriptionItems(subscription)) {
    if (!ACTIVE_ITEM_STATUSES.has(item.status ?? "")) {
      continue;
    }

    const slug = normalizePlanSlug(item.plan?.slug ?? item.plan?.key);
    if (slug === BILLING_PLANS.premium) {
      return BILLING_PLANS.premium;
    }
    if (slug === BILLING_PLANS.basic) {
      basicMatch = BILLING_PLANS.basic;
      continue;
    }

    const fromName = planFromName(item.plan?.name);
    if (fromName === BILLING_PLANS.premium) {
      return BILLING_PLANS.premium;
    }
    if (fromName === BILLING_PLANS.basic) {
      basicMatch = BILLING_PLANS.basic;
    }
  }

  return basicMatch;
}

async function fetchUserSubscription(
  userId: string,
): Promise<BillingSubscriptionRecord | null> {
  try {
    const client = await clerkClient();
    return (await client.billing.getUserBillingSubscription(
      userId,
    )) as BillingSubscriptionRecord;
  } catch {
    return null;
  }
}

/**
 * Checks subscription via Clerk Billing API (source of truth after checkout).
 * Falls back to session `has()` when the API is unavailable.
 */
export async function checkUserHasSubscription(
  userId: string,
  has?: SubscriptionHasCheck,
): Promise<boolean> {
  const subscription = await fetchUserSubscription(userId);
  if (subscription && getPaidPlanFromSubscription(subscription)) {
    return true;
  }

  return has ? hasActiveSubscription(has) : false;
}

export async function getUserActivePlan(
  userId: string,
  has?: (params: { plan: string }) => boolean,
): Promise<BillingPlanSlug | null> {
  const subscription = await fetchUserSubscription(userId);
  const planFromApi = subscription
    ? getPaidPlanFromSubscription(subscription)
    : null;
  if (planFromApi) {
    return planFromApi;
  }

  if (!has) {
    return null;
  }

  if (has({ plan: BILLING_PLANS.premium })) {
    return BILLING_PLANS.premium;
  }
  if (has({ plan: BILLING_PLANS.basic })) {
    return BILLING_PLANS.basic;
  }

  return null;
}
