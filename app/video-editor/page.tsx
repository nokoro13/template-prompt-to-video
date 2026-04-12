import { Suspense } from "react";

import { VideoEditorClient } from "./video-editor-client";

export default function VideoEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-surface-border bg-white p-8 text-slate-500">
          Loading editor…
        </div>
      }
    >
      <VideoEditorClient />
    </Suspense>
  );
}
