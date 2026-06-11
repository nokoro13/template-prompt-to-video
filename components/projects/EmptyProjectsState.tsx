"use client";

import { CreateVideoButton } from "@/components/layout/CreateVideoButton";

export function EmptyProjectsState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 sm:min-h-[400px] sm:p-12">
      <div className="text-center">
        <h3 className="text-lg font-semibold">No projects yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Create your first video to generate scenes, narration, and a timeline
          you can preview in Studio.
        </p>
        <div className="mt-6 flex justify-center">
          <CreateVideoButton variant="card" />
        </div>
      </div>
    </div>
  );
}
