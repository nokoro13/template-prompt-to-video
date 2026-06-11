"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { cn } from "@/lib/utils";

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StyleCard({ style }: { style: ChannelStyleRecord }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-muted">
        <Image
          src={style.thumbnailUrl}
          alt={style.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold leading-tight sm:text-lg">{style.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {style.creatorName ?? "—"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{style.videoAspectRatio}</Badge>
          <Badge>{style.referenceCount} References</Badge>
          <Badge>{style.characterCount} Characters</Badge>
        </div>

        <Link
          href={`/styles/${style.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
        >
          Review →
        </Link>
      </div>
    </div>
  );
}
