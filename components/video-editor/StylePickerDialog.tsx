"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { cn } from "@/lib/utils";

type StylePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styles: ChannelStyleRecord[];
  /** Current selection when dialog opens (`""` = no style). */
  initialStyleId: string;
  onConfirm: (styleId: string) => void;
  /** Primary action label (e.g. “Start generation” vs “Use this style”). */
  confirmLabel?: string;
  isSubmitting?: boolean;
};

function SelectableStyleCard({
  selected,
  onSelect,
  children,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-brand-500 ring-2 ring-brand-500/30 ring-offset-2"
          : "border-border hover:border-muted-foreground/25 hover:shadow-md",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StylePickerDialog({
  open,
  onOpenChange,
  styles,
  initialStyleId,
  onConfirm,
  confirmLabel = "Start generation",
  isSubmitting,
}: StylePickerDialogProps) {
  const [draftStyleId, setDraftStyleId] = useState(initialStyleId);

  useEffect(() => {
    if (open) {
      setDraftStyleId(initialStyleId);
    }
  }, [open, initialStyleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle>Choose a style</DialogTitle>
            <DialogDescription>
              Pick the channel style that should guide your script structure and
              scene visuals for this video.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-6 py-5">
          {styles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No saved styles yet. You can still generate with{" "}
              <strong>Basic</strong> below, or{" "}
              <Link
                href="/styles/new"
                className="font-medium text-brand-600 underline-offset-4 hover:underline"
              >
                create a style
              </Link>{" "}
              first.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectableStyleCard
              selected={draftStyleId === ""}
              onSelect={() => setDraftStyleId("")}
            >
              <div className="flex aspect-video items-center justify-center bg-muted">
                <Sparkles
                  className="size-12 text-muted-foreground/60"
                  aria-hidden
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">Basic</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No reference style — general storytelling and illustrations.
                </p>
              </div>
            </SelectableStyleCard>

            {styles.map((style) => (
              <SelectableStyleCard
                key={style.id}
                selected={draftStyleId === style.id}
                onSelect={() => setDraftStyleId(style.id)}
              >
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <Image
                    src={style.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 360px"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold leading-tight text-foreground">
                    {style.name}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {style.creatorName ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {style.referenceCount} references · {style.characterCount}{" "}
                    characters
                  </p>
                </div>
              </SelectableStyleCard>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(draftStyleId)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Starting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
