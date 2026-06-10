"use client";

import type { CompositionSummary } from "@/lib/studio/compositions";
import { ProjectCard } from "./ProjectCard";

export function ProjectGrid({
  projects,
  onDelete,
  deletingId,
}: {
  projects: CompositionSummary[];
  onDelete?: (project: CompositionSummary) => void;
  deletingId?: string | null;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDelete}
          deleting={deletingId === project.id}
        />
      ))}
    </div>
  );
}
