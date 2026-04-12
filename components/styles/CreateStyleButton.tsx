"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CreateStyleButton() {
  return (
    <Link
      href="/styles/new"
      className={cn(buttonVariants(), "inline-flex gap-2")}
    >
      <Plus className="size-4" />
      Create Style
    </Link>
  );
}
