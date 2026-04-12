"use client";

import { Download, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";

export type RenderPanelProps = {
  compositionId: string | null;
  aspectRatio: VideoAspectRatio;
  disabled?: boolean;
  className?: string;
};

type JobStatus = "idle" | "starting" | "polling" | "complete" | "error";

export function RenderPanel({
  compositionId,
  aspectRatio,
  disabled,
  className,
}: RenderPanelProps) {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setOutputUrl(null);
    setJobId(null);
  }, []);

  useEffect(() => {
    reset();
  }, [compositionId, aspectRatio, reset]);

  useEffect(() => {
    if (!jobId || status !== "polling") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/studio/render/${jobId}`);
        const data = (await res.json()) as {
          status?: string;
          outputUrl?: string;
          error?: string;
        };
        if (!res.ok) {
          setStatus("error");
          setError(data.error || res.statusText);
          clearInterval(interval);
          return;
        }
        if (data.status === "complete" && data.outputUrl) {
          setStatus("complete");
          setOutputUrl(data.outputUrl);
          clearInterval(interval);
          return;
        }
        if (data.status === "error") {
          setStatus("error");
          setError(data.error || "Render failed");
          clearInterval(interval);
        }
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Poll failed");
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const startRender = async () => {
    if (!compositionId) return;
    setStatus("starting");
    setError(null);
    setOutputUrl(null);
    try {
      const res = await fetch("/api/studio/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId, aspectRatio }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      if (!data.jobId) throw new Error("No job id returned");
      setJobId(data.jobId);
      setStatus("polling");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to start render");
    }
  };

  const busy = status === "starting" || status === "polling";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || !compositionId || busy}
        onClick={startRender}
        className="h-7 gap-1.5 px-2.5 text-xs"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Video className="size-3.5" />
        )}
        {busy ? "Rendering…" : "Render MP4"}
      </Button>
      {status === "complete" && outputUrl && (
        <a
          href={outputUrl}
          download
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
        >
          <Download className="size-3.5" />
          Download
        </a>
      )}
      {error && (
        <span className="max-w-[min(100%,280px)] truncate text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
