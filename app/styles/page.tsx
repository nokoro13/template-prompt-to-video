"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreateStyleButton,
  EmptyStylesState,
  StyleGrid,
} from "@/components/styles";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function StylesPage() {
  const [styles, setStyles] = useState<ChannelStyleRecord[] | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/styles")
      .then((r) => r.json())
      .then((d: { styles?: ChannelStyleRecord[] }) => {
        setStyles(d.styles ?? []);
      })
      .catch(() => setError("Failed to load styles"));
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil((styles?.length ?? 0) / PAGE_SIZE),
  );
  const slice = useMemo(() => {
    if (!styles) return [];
    const start = (page - 1) * PAGE_SIZE;
    return styles.slice(start, start + PAGE_SIZE);
  }, [styles, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Styles</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your video styles and voice clones
          </p>
        </div>
        <CreateStyleButton />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your Styles</h2>
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
        {styles === null && !error && (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {styles && styles.length === 0 && <EmptyStylesState />}
        {styles && styles.length > 0 && (
          <>
            <div className="mt-6">
              <StyleGrid styles={slice} />
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cn(
                        "min-w-9 rounded-lg border px-3 py-1 text-sm",
                        p === page
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-lg font-semibold">Custom Avatars</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming soon — manage voice clones and avatars for your channel.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Placeholder
        </div>
      </section>
    </div>
  );
}
