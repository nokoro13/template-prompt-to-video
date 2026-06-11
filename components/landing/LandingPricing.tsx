"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";

import { PRICING_TIERS } from "@/lib/landing/content";
import {
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/LandingMotion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingPricingProps = {
  signedIn: boolean;
  hasSubscription: boolean;
};

export function LandingPricing({
  signedIn,
  hasSubscription,
}: LandingPricingProps) {
  return (
    <LandingStagger className="mx-auto grid max-w-3xl gap-5 lg:max-w-none lg:grid-cols-2">
      {PRICING_TIERS.map((tier) => (
        <LandingStaggerItem key={tier.name}>
        <article
          className={cn(
            "flex h-full flex-col rounded-3xl p-8 sm:p-10",
            tier.highlighted
              ? "bg-slate-900 text-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.4)]"
              : "bg-slate-100/80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                tier.highlighted
                  ? "bg-white/10 text-white/70"
                  : "bg-white/80 text-slate-500",
              )}
            >
              {tier.badge}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-[-0.03em]">
              {tier.price}
            </span>
            <span
              className={cn(
                "text-sm",
                tier.highlighted ? "text-white/45" : "text-slate-500",
              )}
            >
              {tier.period}
            </span>
          </div>

          <p
            className={cn(
              "mt-3 text-[15px] leading-7",
              tier.highlighted ? "text-white/55" : "text-slate-500",
            )}
          >
            {tier.description}
          </p>

          <ul className="mt-8 flex-1 space-y-3">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className={cn(
                  "text-[15px] leading-6",
                  tier.highlighted ? "text-white/80" : "text-slate-600",
                )}
              >
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            {signedIn && hasSubscription ? (
              <Button
                nativeButton={false}
                render={<Link href="/dashboard" />}
                className={cn(
                  "h-11 w-full rounded-full",
                  tier.highlighted
                    ? "bg-white text-slate-900 hover:bg-white/90"
                    : "bg-slate-900 text-white hover:bg-slate-800",
                )}
              >
                Go to dashboard
                <ArrowRight className="size-4" />
              </Button>
            ) : signedIn ? (
              <Button
                nativeButton={false}
                render={<Link href="/pricing" />}
                className={cn(
                  "h-11 w-full rounded-full",
                  tier.highlighted
                    ? "bg-white text-slate-900 hover:bg-white/90"
                    : "bg-slate-900 text-white hover:bg-slate-800",
                )}
              >
                Subscribe to {tier.name}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/pricing">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition",
                    tier.highlighted
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-slate-900 text-white hover:bg-slate-800",
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="size-4" />
                </button>
              </SignUpButton>
            )}
          </div>
        </article>
        </LandingStaggerItem>
      ))}
    </LandingStagger>
  );
}
