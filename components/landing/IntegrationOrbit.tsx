"use client";

import type { ReactNode } from "react";

import { BrandId, BRAND_META } from "@/components/landing/BrandIcons";
import { cn } from "@/lib/utils";

/** SVG coordinate space — rings scale with the oversized container. */
const ORBIT_SIZE = 1400;
const ORBIT_CENTER = ORBIT_SIZE / 2;

const ORBIT_RINGS = [128, 260, 390, 520];

/** One-time intro — rings reveal inner → outer, then stay visible. */
const ORBIT_REVEAL_DURATION_S = 1.4;
const ORBIT_REVEAL_STEP_S = 0.45;
const ORBIT_REVEAL_TOTAL_S =
  (ORBIT_RINGS.length - 1) * ORBIT_REVEAL_STEP_S + ORBIT_REVEAL_DURATION_S;

/** Looping blink ripple — starts after intro, inner → outer. */
const ORBIT_RIPPLE_STEP_S = 0.5;

/** Icon fade-in — after its ring is partway visible. */
const ORBIT_ICON_REVEAL_DURATION_S = 0.8;
const ORBIT_ICON_REVEAL_OFFSET_S = 0.5;

function ringRevealDelay(ring: number): number {
  const index = ORBIT_RINGS.indexOf(ring);
  return index >= 0 ? index * ORBIT_REVEAL_STEP_S : 0;
}

/** Icons staggered across rings — upper arc and sides, clear of hero copy. */
const ORBIT_ICONS: {
  brand: BrandId;
  ring: number;
  angle: number;
  revealStagger: number;
  floatPhase: number;
}[] = [
  { brand: "openai", ring: 390, angle: 248, revealStagger: 0, floatPhase: 0 },
  { brand: "elevenlabs", ring: 520, angle: 302, revealStagger: 0, floatPhase: 0.8 },
  { brand: "gemini", ring: 520, angle: 58, revealStagger: 0.1, floatPhase: 1.6 },
  { brand: "youtube", ring: 390, angle: 112, revealStagger: 0.1, floatPhase: 2.4 },
];

const ORBIT_FRAME_CLASS =
  "pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[100vw] max-w-[100vw] -translate-x-1/2 -translate-y-1/2";

function orbitPositionPercent(ring: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const unit = (ring / ORBIT_CENTER) * 50;
  return {
    left: 50 + Math.cos(rad) * unit,
    top: 50 + Math.sin(rad) * unit,
  };
}

function OrbitIconBubble({
  brand,
  compact = false,
}: {
  brand: BrandId;
  compact?: boolean;
}) {
  const meta = BRAND_META[brand];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 backdrop-blur-sm",
        compact ? "size-10" : "size-11 sm:size-12",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          compact ? "size-6" : "size-7 sm:size-8",
          meta.tileClass,
        )}
      >
        <Icon className={meta.iconClass} color={meta.color} aria-hidden />
      </div>
    </div>
  );
}

function OrbitIconSlot({
  brand,
  revealDelay,
  floatDelay,
  compact = false,
}: {
  brand: BrandId;
  revealDelay: number;
  floatDelay: number;
  compact?: boolean;
}) {
  return (
    <div
      className="opacity-0 motion-safe:animate-orbit-icon-reveal motion-reduce:animate-none motion-reduce:opacity-100"
      style={{ animationDelay: `${revealDelay}s` }}
    >
      <div
        className="motion-safe:animate-orbit-float motion-reduce:animate-none"
        style={{ animationDelay: `${floatDelay}s` }}
      >
        <OrbitIconBubble brand={brand} compact={compact} />
      </div>
    </div>
  );
}

type IntegrationOrbitProps = {
  children: ReactNode;
  className?: string;
};

export function IntegrationOrbit({ children, className }: IntegrationOrbitProps) {
  return (
    <div
      className={cn(
        "relative isolate flex w-full flex-col items-center justify-center",
        className,
      )}
    >
      {/* Rings — centered so top/bottom overflow is equal */}
      <div className={cn(ORBIT_FRAME_CLASS, "z-0")} aria-hidden>
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {ORBIT_RINGS.map((r, index) => (
            <circle
              key={r}
              cx={ORBIT_CENTER}
              cy={ORBIT_CENTER}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className={cn(
                "opacity-0 motion-safe:animate-orbit-ring-reveal motion-reduce:animate-none motion-reduce:opacity-100",
                index === ORBIT_RINGS.length - 1
                  ? "text-slate-300/90"
                  : "text-slate-200/80",
              )}
              style={{
                animationDelay: `${index * ORBIT_REVEAL_STEP_S}s`,
              }}
            />
          ))}

          {/* Looping blink ripple — after intro, inner → outer */}
          {ORBIT_RINGS.map((r, index) => (
            <circle
              key={`ripple-${r}`}
              cx={ORBIT_CENTER}
              cy={ORBIT_CENTER}
              r={r}
              fill="none"
              stroke="url(#orbit-pulse)"
              strokeWidth="1.5"
              className="opacity-0 motion-safe:animate-orbit-ring-ripple motion-reduce:animate-none"
              style={{
                animationDelay: `${ORBIT_REVEAL_TOTAL_S + index * ORBIT_RIPPLE_STEP_S}s`,
              }}
            />
          ))}

          <circle
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER}
            r={ORBIT_RINGS[ORBIT_RINGS.length - 1]}
            fill="none"
            stroke="url(#orbit-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="100 3200"
            strokeDashoffset="40"
            className="orbit-accent-sweep opacity-0 motion-reduce:opacity-80"
            style={{
              animation: `orbit-accent-reveal ${ORBIT_REVEAL_DURATION_S}s cubic-bezier(0.45, 0.05, 0.55, 0.95) ${(ORBIT_RINGS.length - 1) * ORBIT_REVEAL_STEP_S}s forwards, orbit-sweep 48s linear ${ORBIT_REVEAL_TOTAL_S}s infinite`,
            }}
          />

          <circle
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER}
            r={3}
            fill="currentColor"
            className="text-brand-500/40 opacity-0 motion-safe:animate-orbit-ring-reveal motion-reduce:animate-none motion-reduce:opacity-100"
            style={{ animationDelay: "0s" }}
          />

          <defs>
            <linearGradient id="orbit-pulse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(37 99 235 / 0.1)" />
              <stop offset="50%" stopColor="rgb(37 99 235 / 0.5)" />
              <stop offset="100%" stopColor="rgb(37 99 235 / 0.1)" />
            </linearGradient>
            <linearGradient id="orbit-accent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(37 99 235 / 0)" />
              <stop offset="45%" stopColor="rgb(37 99 235 / 0.55)" />
              <stop offset="100%" stopColor="rgb(37 99 235 / 0)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-hub-pulse motion-reduce:animate-none rounded-full bg-brand-100/40 blur-3xl sm:size-44" />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-2xl" />
      </div>

      {/* Icons — fixed positions, fade in as each ring appears */}
      <div className={cn(ORBIT_FRAME_CLASS, "z-20")} aria-hidden>
        <div className="absolute inset-0">
          {ORBIT_ICONS.map(({ brand, ring, angle, revealStagger, floatPhase }) => {
            const { left, top } = orbitPositionPercent(ring, angle);
            const revealDelay =
              ringRevealDelay(ring) +
              ORBIT_ICON_REVEAL_OFFSET_S +
              revealStagger;
            const floatDelay =
              revealDelay + ORBIT_ICON_REVEAL_DURATION_S + floatPhase;
            return (
              <div
                key={brand}
                className="absolute hidden -translate-x-1/2 -translate-y-1/2 sm:block"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <OrbitIconSlot
                  brand={brand}
                  revealDelay={revealDelay}
                  floatDelay={floatDelay}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Center hero — vertically centered with the orbit hub */}
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-8 py-6 text-center">
        {children}
      </div>
    </div>
  );
}
