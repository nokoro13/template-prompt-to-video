"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SignUpButton, useAuth } from "@clerk/nextjs";

import { LandingAuthActions } from "@/components/landing/LandingAuthActions";

import { ClipngLogoMark } from "@/components/brand/ClipngLogoMark";

import { IntegrationOrbit } from "@/components/landing/IntegrationOrbit";
import { LandingMobileHero } from "@/components/landing/LandingMobileHero";
import {
  LandingHeroReveal,
  LandingReveal,
  LandingSectionHeader,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/LandingMotion";
import { LandingVideoEditorPreview } from "@/components/landing/LandingVideoEditorPreview";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { useLandingScrollTo } from "@/components/landing/LandingScrollContext";
import { Button } from "@/components/ui/button";
import { LANDING_NAV } from "@/lib/landing/content";

const WORKFLOW = [
  {
    step: "1",
    title: "Choose a channel style",
    body: "Set reference art, voice, and aspect ratio. Import a YouTube transcript to match an existing format.",
  },
  {
    step: "2",
    title: "Run the video editor",
    body: "Generate script (OpenAI), voiceover (ElevenLabs), and scene images (Gemini) step by step.",
  },
  {
    step: "3",
    title: "Build and export",
    body: "Build the timeline, preview in Studio, and export an upload-ready MP4.",
  },
];

function ClipngLogo({ className }: { className?: string }) {
  return (
    <span className={className}>
      cli<span className="text-brand-600">png</span>
    </span>
  );
}

function NavAnchor({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const scrollTo = useLandingScrollTo();
  const id = href.replace("#", "");

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollTo(id);
      }}
    >
      {children}
    </a>
  );
}

function PrimaryCta({
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
        className="h-11 rounded-full bg-slate-900 px-7 text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(15,23,42,0.35)] hover:bg-slate-800"
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
        className="h-11 rounded-full bg-slate-900 px-7 text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(15,23,42,0.35)] hover:bg-slate-800"
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
        className="group inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(15,23,42,0.35)] transition hover:bg-slate-800 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.4)]"
      >
        Get started
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </button>
    </SignUpButton>
  );
}

const HERO_BG_GRID =
  "pointer-events-none absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:32px_32px] bg-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_35%,black_12%,transparent_72%)]";

type LandingPageProps = {
  hasSubscription?: boolean;
};

export function LandingPage({ hasSubscription = false }: LandingPageProps) {
  const { isSignedIn: authSignedIn } = useAuth();
  const signedIn = authSignedIn === true;
  const canUseApp = signedIn && hasSubscription;

  return (
    <div className="text-slate-900">
      <header className="sticky top-0 z-50 pt-4 sm:pt-5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid h-12 w-full grid-cols-[1fr_auto_1fr] items-center rounded-full bg-white/80 px-4 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.06)] backdrop-blur-md sm:h-[3.25rem] sm:px-5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 justify-self-start font-semibold sm:gap-2.5"
          >
            <ClipngLogoMark />
            <ClipngLogo className="truncate text-[15px] sm:text-base" />
          </Link>

          <nav
            className="col-start-2 hidden items-center gap-8 justify-self-center md:flex"
            aria-label="Primary"
          >
            {LANDING_NAV.map((item) => (
              <NavAnchor
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {item.label}
              </NavAnchor>
            ))}
          </nav>

          <div className="col-start-3 flex min-w-0 items-center justify-self-end gap-1.5 sm:gap-2">
            <LandingAuthActions hasSubscription={hasSubscription} />
          </div>
          </div>
        </div>
      </header>

      {/* Header + hero — one shared ambient canvas */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-slate-50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_110%_90%_at_50%_-8%,rgba(255,255,255,0.92),rgba(248,250,252,0.55)_48%,rgba(248,250,252,0)_100%)]"
          aria-hidden
        />
        <div className={`${HERO_BG_GRID} hidden sm:block`} aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-white/60 to-white sm:h-44"
          aria-hidden
        />

        {/* Hero — dedicated mobile layout; orbit canvas on sm+ */}
        <section className="relative overflow-hidden sm:-mt-[4.5rem] sm:min-h-screen sm:flex sm:items-center">
          <LandingMobileHero
            signedIn={signedIn}
            hasSubscription={hasSubscription}
          />

          <div className="hidden w-full sm:block">
            <IntegrationOrbit className="min-h-screen w-full">
              <div className="w-full">
                <LandingHeroReveal step={0}>
                  <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-white/60 px-3 py-1.5 backdrop-blur-sm">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-40 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-brand-600" />
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Automated youtube production
                    </span>
                  </div>
                </LandingHeroReveal>

                <LandingHeroReveal step={1}>
                  <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-slate-900 lg:text-[3.25rem]">
                    <span className="block">AI tools in one place</span>
                    <span className="mt-1 block bg-gradient-to-r from-slate-900 via-brand-600 to-brand-700 bg-clip-text text-transparent">
                      to create story videos
                    </span>
                  </h1>
                </LandingHeroReveal>

                <LandingHeroReveal step={2}>
                  <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-500">
                    Clone a proven format. Generate scripts, voiceovers, scenes, and thumbnails.
                  </p>
                </LandingHeroReveal>

                <LandingHeroReveal step={3}>
                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <PrimaryCta
                      signedIn={signedIn}
                      hasSubscription={hasSubscription}
                    />
                    <NavAnchor
                      href="#workflow"
                      className="inline-flex h-11 items-center px-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      See the workflow
                      <ArrowRight className="ml-1 size-4" />
                    </NavAnchor>
                  </div>
                </LandingHeroReveal>
              </div>
            </IntegrationOrbit>
          </div>
        </section>
      </div>

      <section className="relative bg-white py-24 sm:py-32">
        <div id="workflow" className="mx-auto max-w-6xl px-6">
          <LandingSectionHeader
            eyebrow="Workflow"
            title="From scattered tools to one video pipeline"
            description="The video editor walks you through setup, script, voiceover, scene images, and finish — with channel styles for repeatable output."
          />
          <LandingStagger className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {WORKFLOW.map((item) => (
              <LandingStaggerItem key={item.step}>
                <article>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    0{item.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-slate-500">
                    {item.body}
                  </p>
                </article>
              </LandingStaggerItem>
            ))}
          </LandingStagger>
        </div>
      </section>

      <section className="bg-slate-50 py-24 sm:py-32">
        <div id="editor" className="mx-auto max-w-6xl px-6">
          <LandingSectionHeader
            eyebrow="Video editor"
            title="The same editor you'll use to create videos"
            description="Five guided steps — setup, script, voiceover, scene images, and finish. Tap through the preview below to see each step."
          />
          <LandingReveal className="mt-14" delay={0.12}>
            <LandingVideoEditorPreview />
          </LandingReveal>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div id="pricing" className="mx-auto max-w-6xl px-6">
          <LandingSectionHeader
            eyebrow="Pricing"
            title="Simple monthly plans."
            description="Basic at $49/mo for the full pipeline. Premium at $69/mo for teams and priority rendering. AI generation is included in both plans."
          />
          <div className="mt-14">
            <LandingPricing
              signedIn={signedIn}
              hasSubscription={hasSubscription}
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24 sm:py-32">
        <div id="faq" className="mx-auto max-w-2xl px-6">
          <LandingSectionHeader eyebrow="FAQ" title="Common questions" />
          <LandingFaq />
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <LandingReveal className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Start with clipng
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-500">
            Sign up to create story videos. Script, voice, and scene generation
            are built in — just pick a plan and start.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {canUseApp ? (
              <Button
                nativeButton={false}
                render={<Link href="/video-editor" />}
                className="h-11 rounded-full bg-slate-900 px-7 text-white hover:bg-slate-800"
              >
                Open video editor
              </Button>
            ) : (
              <PrimaryCta
                signedIn={signedIn}
                hasSubscription={hasSubscription}
              />
            )}
          </div>
        </LandingReveal>
      </section>

      <footer className="bg-white pb-12 pt-4">
        <LandingReveal
          className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between"
          y={14}
        >
          <div className="text-center sm:text-left">
            <ClipngLogo className="font-semibold text-slate-700" />
            <p className="mt-1 text-sm text-slate-500">
              Scripts, scenes, voice, and render in one app.
            </p>
          </div>
          <nav
            className="flex flex-wrap justify-center gap-8 text-sm text-slate-400"
            aria-label="Footer"
          >
            {LANDING_NAV.map((item) => (
              <NavAnchor
                key={item.href}
                href={item.href}
                className="transition hover:text-slate-900"
              >
                {item.label}
              </NavAnchor>
            ))}
          </nav>
        </LandingReveal>
        <LandingReveal className="mt-8 text-center" y={10}>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} clipng
          </p>
        </LandingReveal>
      </footer>
    </div>
  );
}
