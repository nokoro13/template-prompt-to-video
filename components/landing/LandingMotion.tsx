"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Slow, ease-out curve — reads calm and premium on scroll. */
const EASE = [0.16, 1, 0.3, 1] as const;

const REVEAL_DURATION = 1.05;
const REVEAL_Y = 20;

const HERO_DURATION = 1;
const HERO_STAGGER = 0.15;

const STAGGER_GAP = 0.14;
const STAGGER_ITEM_DURATION = 0.95;

function useLandingViewport() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return { once: true as const, amount: 0 as const };
  }

  // Default browser viewport — nested landing scroll container breaks custom root IO.
  return {
    once: true as const,
    amount: 0.15 as const,
    margin: "-8% 0px -6% 0px" as const,
  };
}

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Fade + rise when scrolled into view. */
export function LandingReveal({
  children,
  className,
  delay = 0,
  y = REVEAL_Y,
}: LandingRevealProps) {
  const reduceMotion = useReducedMotion();
  const viewport = useLandingViewport();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: REVEAL_DURATION, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type LandingHeroRevealProps = {
  children: ReactNode;
  className?: string;
  /** Step index — each step staggers by HERO_STAGGER. */
  step?: number;
};

/** Hero entrance on page load. */
export function LandingHeroReveal({
  children,
  className,
  step = 0,
}: LandingHeroRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: HERO_DURATION,
        delay: step * HERO_STAGGER,
        ease: EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: STAGGER_GAP,
      delayChildren: 0.08,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: STAGGER_ITEM_DURATION, ease: EASE },
  },
};

export function LandingStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const viewport = useLandingViewport();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

export function LandingSectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <LandingReveal className={cn("mx-auto max-w-2xl text-center", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl sm:leading-[1.1]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[15px] leading-7 text-slate-500">{description}</p>
      ) : null}
    </LandingReveal>
  );
}
