import { Suspense } from "react";

import { StudioClient } from "./studio-client";

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
          Loading studio…
        </div>
      }
    >
      <StudioClient />
    </Suspense>
  );
}
