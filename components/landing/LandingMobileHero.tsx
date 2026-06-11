"use client";

import { ArrowRight } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

import { BRAND_META, type BrandId } from "@/components/landing/BrandIcons";
import { LandingHeroReveal } from "@/components/landing/LandingMotion";
import { useLandingScrollTo } from "@/components/landing/LandingScrollContext";
import { Button } from "@/components/ui/button";

const MOBILE_INTEGRATIONS: BrandId[] = [
  "openai",
  "gemini",
  "elevenlabs",
  "youtube",
];

function MobilePrimaryCta({
  signedIn,
  hasSubscription,
}: {
  signedIn: boolean;
  hasSubscription: boolean;
}) {
  if (signedIn && hasSubscription) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/video-editor" />}
        className="h-12 w-full rounded-full bg-slate-900 text-base text-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.45)] hover:bg-slate-800"
      >
        Create a video
        <ArrowRight className="size-4" />
      </Button>
    );
  }

  if (signedIn) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/pricing" />}
        className="h-12 w-full rounded-full bg-slate-900 text-base text-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.45)] hover:bg-slate-800"
      >
        Choose a plan
        <ArrowRight className="size-4" />
      </Button>
    );
  }

  return (
    <SignUpButton mode="modal" forceRedirectUrl="/pricing">
      <button
        type="button"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-base font-medium text-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.45)]"
      >
        Get started
        <ArrowRight className="size-4" />
      </button>
    </SignUpButton>
  );
}

export function LandingMobileHero({
  signedIn,
  hasSubscription = false,
}: {
  signedIn: boolean;
  hasSubscription?: boolean;
}) {
  const scrollTo = useLandingScrollTo();

  return (
    <div className="relative flex min-h-[calc(100dvh-5.25rem)] flex-col justify-center px-6 pb-12 pt-6 sm:hidden">
      {/* Ambient — soft blobs, no orbit rings */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute bottom-8 -left-10 h-40 w-40 rounded-full bg-white blur-2xl" />
        <div className="absolute right-0 top-1/3 h-32 w-32 rounded-full bg-brand-50/80 blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <LandingHeroReveal step={0}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand-600" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              YouTube automation
            </span>
          </div>
        </LandingHeroReveal>

        <LandingHeroReveal step={1}>
          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">
            AI tools to create{" "}
            <span className="bg-gradient-to-r from-slate-900 via-brand-600 to-brand-700 bg-clip-text text-transparent">
              story videos
            </span>
          </h1>
        </LandingHeroReveal>

        <LandingHeroReveal step={2}>
          <p className="mt-4 text-[15px] leading-7 text-slate-500">
            Clone a proven format. Generate scripts, voiceovers, scenes, and
            thumbnails — all in one editor.
          </p>
        </LandingHeroReveal>

        <LandingHeroReveal step={3}>
          <div className="mt-8 flex flex-col gap-3">
            <MobilePrimaryCta
              signedIn={signedIn}
              hasSubscription={hasSubscription}
            />
            <button
              type="button"
              onClick={() => scrollTo("workflow")}
              className="inline-flex h-11 items-center justify-center gap-1 text-sm font-medium text-brand-600"
            >
              See how it works
              <ArrowRight className="size-4" />
            </button>
          </div>
        </LandingHeroReveal>

        <LandingHeroReveal step={4}>
          <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.15)] backdrop-blur-sm">
            <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Connected stack
            </p>
            <div className="flex items-center justify-between gap-1">
              {MOBILE_INTEGRATIONS.map((brand) => {
                const meta = BRAND_META[brand];
                const Icon = meta.icon;
                return (
                  <div
                    key={brand}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                      <Icon
                        className={meta.iconClass}
                        color={meta.color}
                        aria-hidden
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      {meta.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </LandingHeroReveal>
      </div>
    </div>
  );
}
