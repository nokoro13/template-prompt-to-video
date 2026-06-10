"use client";

import { ChevronDown } from "lucide-react";

import {
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/LandingMotion";
import { FAQ_ITEMS } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

export function LandingFaq({ className }: { className?: string }) {
  return (
    <LandingStagger className={cn("mt-12 space-y-1", className)}>
      {FAQ_ITEMS.map((item) => (
        <LandingStaggerItem key={item.question}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[17px] font-medium tracking-tight text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="pb-5 pr-8 text-[15px] leading-7 text-slate-500">
              {item.answer}
            </p>
          </details>
        </LandingStaggerItem>
      ))}
    </LandingStagger>
  );
}
