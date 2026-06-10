"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, MonitorPlay, Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { CompositionSummary } from "@/lib/studio/compositions";
import { formatDuration, formatRelativeDate } from "@/lib/studio/format";
import { cn } from "@/lib/utils";

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

type ProjectCardProps = {
  project: CompositionSummary;
  onDelete?: (project: CompositionSummary) => void;
  deleting?: boolean;
};

export function ProjectCard({ project, onDelete, deleting }: ProjectCardProps) {
  const seconds = Math.round(project.durationInFrames / project.fps);
  const studioHref = `/studio?slug=${encodeURIComponent(project.id)}`;
  const editHref = `/video-editor?slug=${encodeURIComponent(project.id)}&step=3`;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <Link href={studioHref} className="block">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="size-12 text-muted-foreground/50" aria-hidden />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
              {project.shortTitle}
            </p>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{formatDuration(seconds)}</Badge>
          <Badge>
            {project.sceneCount} scene{project.sceneCount === 1 ? "" : "s"}
          </Badge>
          <Badge>{formatRelativeDate(project.updatedAt)}</Badge>
        </div>

        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
          {project.id}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={studioHref}
            className={cn(buttonVariants({ variant: "default" }), "flex-1")}
          >
            <MonitorPlay className="mr-1.5 size-4" />
            Open in Studio
          </Link>
          <Link
            href={editHref}
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
          >
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Link>
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              aria-label={`Delete ${project.shortTitle}`}
              onClick={() => onDelete(project)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
