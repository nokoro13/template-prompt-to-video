"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { CreateVideoButton } from "@/components/layout/CreateVideoButton";
import {
  EmptyProjectsState,
  ProjectGrid,
} from "@/components/projects";
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<CompositionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CompositionSummary | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadProjects = useCallback(() => {
    fetch("/api/studio/compositions")
      .then((r) => r.json())
      .then((data: { compositions?: CompositionSummary[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
          setProjects([]);
          return;
        }
        setProjects(data.compositions ?? []);
      })
      .catch(() => setError("Failed to load projects"));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.shortTitle.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setConfirmingDelete(true);
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/compositions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setPendingDelete(null);
      loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setConfirmingDelete(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Your recent videos — preview in Studio or jump back into editing.
          </p>
        </div>
        <CreateVideoButton variant="button" />
      </div>

      {projects && projects.length > 0 ? (
        <div className="relative mt-6 max-w-md sm:mt-8">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
      ) : null}

      <section className="mt-6 sm:mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold sm:text-lg">Recent projects</h2>
          {projects && projects.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {filtered.length} project{filtered.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {projects === null && !error && (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        )}

        {projects && projects.length === 0 && !error && <EmptyProjectsState />}

        {projects && projects.length > 0 && filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            No projects match your search.
          </p>
        ) : null}

        {filtered.length > 0 ? (
          <div className="mt-6">
            <ProjectGrid
              projects={filtered}
              deletingId={deletingId}
              onDelete={setPendingDelete}
            />
          </div>
        ) : null}
      </section>

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
    </div>
  );
}
