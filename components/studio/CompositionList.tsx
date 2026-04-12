"use client";

import { Film, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CompositionListItem = {
  id: string;
  shortTitle: string;
  durationInFrames: number;
  fps: number;
};

export type CompositionListProps = {
  compositions: CompositionListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When set, each row shows a delete control that calls this after confirmation. */
  onDelete?: (id: string) => Promise<void>;
  /** When matching a row id, that delete action is in progress. */
  deletingId?: string | null;
  disabled?: boolean;
  className?: string;
};

export function CompositionList({
  compositions,
  selectedId,
  onSelect,
  onDelete,
  deletingId,
  disabled,
  className,
}: CompositionListProps) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CompositionListItem | null>(
    null,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return compositions;
    return compositions.filter(
      (c) =>
        c.shortTitle.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [compositions, query]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete || !onDelete) return;
    const id = pendingDelete.id;
    setConfirmingDelete(true);
    try {
      await onDelete(id);
      setPendingDelete(null);
    } catch {
      /* parent shows error; keep dialog open */
    } finally {
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-col gap-2 rounded-xl border border-border bg-card",
          className,
        )}
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-brand-500/30 focus:ring-2"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No compositions match your search.
            </p>
          ) : (
            filtered.map((c) => {
              const selected = c.id === selectedId;
              const seconds = Math.round(c.durationInFrames / c.fps);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex w-full items-stretch gap-0.5 rounded-lg",
                    selected && "ring-2 ring-brand-500/30",
                  )}
                >
                  <Button
                    type="button"
                    variant={selected ? "secondary" : "ghost"}
                    className="h-auto min-w-0 flex-1 justify-start gap-2 px-3 py-2.5 text-left"
                    disabled={disabled}
                    onClick={() => onSelect(c.id)}
                  >
                    <Film className="size-4 shrink-0 text-brand-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {c.shortTitle}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {c.id} · ~{seconds}s
                      </span>
                    </span>
                  </Button>
                  {onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 self-stretch text-muted-foreground hover:text-destructive"
                      disabled={disabled || deletingId === c.id}
                      aria-label={`Delete ${c.shortTitle}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(c);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.shortTitle}
              </span>{" "}
              ({pendingDelete?.id}) and all images, audio, and timeline files
              from this project folder. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!pendingDelete || confirmingDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {confirmingDelete ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
