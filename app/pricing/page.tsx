import Link from "next/link";
import { PricingTable } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { BillingSessionRefresh } from "@/components/billing/BillingSessionRefresh";
import { clerkAuthAppearance } from "@/components/auth/clerk-appearance";
import { checkUserHasSubscription } from "@/lib/billing/check-subscription";
import { BILLING_PLANS } from "@/lib/billing/config";

export default async function PricingPage() {
  const { userId, has } = await auth();
  const subscribed = userId
    ? await checkUserHasSubscription(userId, has)
    : false;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col px-4 py-10 sm:px-6 sm:py-14">
      {userId ? <BillingSessionRefresh /> : null}
      <div className="mb-8">
        {subscribed ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        ) : userId ? (
          <p className="text-sm font-medium text-brand-600">
            Choose a plan to unlock the dashboard
          </p>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        )}

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Plans &amp; pricing
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
          Subscribe to create channel styles, generate scripts and scenes, and
          export videos from Studio. Cancel anytime from your account.
        </p>
      </div>

      <PricingTable
        for="user"
        highlightedPlan={BILLING_PLANS.basic}
        newSubscriptionRedirectUrl="/dashboard"
        appearance={clerkAuthAppearance}
      />
    </div>
  );
}
