"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MonitorPlay } from "lucide-react";

import { ProjectPickerDialog } from "@/components/projects/ProjectPickerDialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { CompositionSummary } from "@/lib/studio/compositions";

/**
 * Opens the project picker, then navigates to Studio with the chosen project.
 */
export function StudioNavButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentProjectId = pathname.startsWith("/studio")
    ? searchParams.get("slug") ?? ""
    : "";

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<CompositionSummary[]>([]);

  useEffect(() => {
    fetch("/api/studio/compositions")
      .then((r) => r.json())
      .then((data: { compositions?: CompositionSummary[] }) => {
        setProjects(data.compositions ?? []);
      })
      .catch(() => setProjects([]));
  }, []);

  function handleConfirm(projectId: string) {
    setOpen(false);
    if (projectId.trim()) {
      router.push(`/studio?slug=${encodeURIComponent(projectId.trim())}`);
    }
  }

  return (
    <>
      <SidebarMenuButton
        type="button"
        isActive={pathname.startsWith("/studio")}
        onClick={() => setOpen(true)}
      >
        <MonitorPlay />
        <span>Studio</span>
      </SidebarMenuButton>

      <ProjectPickerDialog
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        initialProjectId={currentProjectId}
        onConfirm={handleConfirm}
        confirmLabel="Open in Studio"
      />
    </>
  );
}
