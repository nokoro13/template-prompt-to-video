"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Film, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CompositionSummary } from "@/lib/studio/compositions";
import { formatDuration, formatRelativeDate } from "@/lib/studio/format";
import { cn } from "@/lib/utils";

type ProjectPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: CompositionSummary[];
  /** Current selection when dialog opens. */
  initialProjectId: string;
  onConfirm: (projectId: string) => void;
  confirmLabel?: string;
  isSubmitting?: boolean;
};

function SelectableProjectCard({
  selected,
  onSelect,
  project,
}: {
  selected: boolean;
  onSelect: () => void;
  project: CompositionSummary;
}) {
  const seconds = Math.round(project.durationInFrames / project.fps);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-brand-500 ring-2 ring-brand-500/30 ring-offset-2"
          : "border-border hover:border-muted-foreground/25 hover:shadow-md",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 360px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="size-12 text-muted-foreground/50" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold leading-tight text-foreground">
          {project.shortTitle}
        </h3>
        <p className="mt-1 line-clamp-1 font-mono text-xs text-muted-foreground">
          {project.id}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDuration(seconds)} · {project.sceneCount} scenes ·{" "}
          {formatRelativeDate(project.updatedAt)}
        </p>
      </div>
    </button>
  );
}

export function ProjectPickerDialog({
  open,
  onOpenChange,
  projects,
  initialProjectId,
  onConfirm,
  confirmLabel = "Open in Studio",
  isSubmitting,
}: ProjectPickerDialogProps) {
  const [draftProjectId, setDraftProjectId] = useState(initialProjectId);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraftProjectId(initialProjectId || projects[0]?.id || "");
      setQuery("");
    }
  }, [open, initialProjectId, projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.shortTitle.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const canConfirm = Boolean(draftProjectId.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle>Choose a project</DialogTitle>
            <DialogDescription>
              Pick a recent video project to preview and render in Studio.
            </DialogDescription>
          </DialogHeader>
          {projects.length > 0 ? (
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="pl-9"
              />
            </div>
          ) : null}
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-6 py-5">
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No projects yet.{" "}
              <Link
                href="/video-editor"
                className="font-medium text-brand-600 underline-offset-4 hover:underline"
              >
                Create a video
              </Link>{" "}
              first, then come back to Studio.
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No projects match your search.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((project) => (
                <SelectableProjectCard
                  key={project.id}
                  project={project}
                  selected={draftProjectId === project.id}
                  onSelect={() => setDraftProjectId(project.id)}
                />
              ))}
            </div>
          )}
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
            onClick={() => onConfirm(draftProjectId)}
            disabled={isSubmitting || !canConfirm}
          >
            {isSubmitting ? "Opening…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
