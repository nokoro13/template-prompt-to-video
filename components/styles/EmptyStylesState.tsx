"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyStylesState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 sm:min-h-[400px] sm:p-12">
      <div className="text-center">
        <h3 className="text-lg font-semibold">No styles yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first channel style with style reference images and transcripts
        </p>
        <Link
          href="/styles/new"
          className={cn(buttonVariants(), "mt-4 inline-flex w-full sm:w-auto")}
        >
          + Create Style
        </Link>
      </div>
    </div>
  );
}
