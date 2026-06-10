"use client";

import type { IconType } from "react-icons";
import {
  SiElevenlabs,
  SiGooglegemini,
  SiOpenai,
  SiYoutube,  
} from "react-icons/si";

import { cn } from "@/lib/utils";

export type BrandId = "openai" | "gemini" | "elevenlabs" | "youtube";

type BrandMeta = {
  name: string;
  icon: IconType;
  color?: string;
  tileClass: string;
  iconClass: string;
};

const BRAND_META: Record<BrandId, BrandMeta> = {
  openai: {
    name: "OpenAI",
    icon: SiOpenai,
    color: "#000000",
    tileClass: "bg-white ring-1 ring-slate-200",
    iconClass: "size-5",
  },
  gemini: {
    name: "Gemini",
    icon: SiGooglegemini,
    tileClass: "bg-white ring-1 ring-slate-200",
    iconClass: "size-6",
  },
  elevenlabs: {
    name: "ElevenLabs",
    icon: SiElevenlabs,
    color: "#000000",
    tileClass: "bg-white ring-1 ring-slate-200",
    iconClass: "size-5",
  },
  youtube: {
    name: "YouTube",
    icon: SiYoutube,
    color: "#FF0000",
    tileClass: "bg-white ring-1 ring-slate-200",
    iconClass: "size-6",
  },
};

export function BrandTile({
  brand,
  size = "md",
  showLabel = true,
  className,
}: {
  brand: BrandId;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const meta = BRAND_META[brand];
  const Icon = meta.icon;
  const box = size === "sm" ? "size-9" : "size-11";

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl shadow-md ring-1 ring-black/5",
          box,
          meta.tileClass,
        )}
      >
        <Icon className={meta.iconClass} color={meta.color} aria-hidden />
      </div>
      {showLabel ? (
        <span className="text-[11px] font-medium text-slate-500">{meta.name}</span>
      ) : null}
    </div>
  );
}

export function BrandChip({
  brand,
  role,
}: {
  brand: BrandId;
  role: string;
}) {
  const meta = BRAND_META[brand];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-sm">
      <BrandTile brand={brand} size="sm" showLabel={false} />
      <div className="text-left">
        <p className="text-sm font-semibold text-slate-900">{meta.name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </div>
  );
}

export { BRAND_META };
