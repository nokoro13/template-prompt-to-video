"use client";

import { Download, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  downloadExportVideo,
  isMobileDownloadContext,
  prefetchExportVideoBlob,
} from "@/lib/download/save-video-blob";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";

type ExportStatus = "idle" | "starting" | "polling" | "complete" | "error";

export type ExportVideoButtonProps = {
  projectSlug: string;
  aspectRatio?: VideoAspectRatio;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "secondary" | "outline";
  /** Full-width, minimal helper copy — for project cards. */
  compact?: boolean;
};

export function ExportVideoButton({
  projectSlug,
  aspectRatio = "9:16",
  disabled,
  className,
  variant = "outline",
  compact = false,
}: ExportVideoButtonProps) {
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("video.mp4");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const mobileBlobRef = useRef<Blob | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setJobId(null);
    setProgress(0);
    mobileBlobRef.current = null;
  }, []);

  useEffect(() => {
    reset();
  }, [projectSlug, aspectRatio, reset]);

  /** On mobile, prefetch in the background so the share sheet can open on tap. */
  useEffect(() => {
    if (status !== "complete" || !jobId) {
      mobileBlobRef.current = null;
      return;
    }

    if (typeof window === "undefined" || !isMobileDownloadContext()) {
      return;
    }

    let cancelled = false;
    mobileBlobRef.current = null;

    void prefetchExportVideoBlob(jobId)
      .then((blob) => {
        if (!cancelled) mobileBlobRef.current = blob;
      })
      .catch(() => {
        /* direct browser download still works without prefetch */
      });

    return () => {
      cancelled = true;
    };
  }, [status, jobId]);

  useEffect(() => {
    if (!jobId || status !== "polling") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/export/${encodeURIComponent(jobId)}`);
        const data = (await res.json()) as {
          status?: string;
          fileName?: string;
          error?: string;
          progress?: number;
        };
        if (!res.ok) {
          setStatus("error");
          setError(data.error || res.statusText);
          return false;
        }
        if (typeof data.progress === "number") {
          setProgress(data.progress);
        }
        if (data.status === "complete") {
          setStatus("complete");
          setFileName(data.fileName ?? "video.mp4");
          return false;
        }
        if (data.status === "error") {
          setStatus("error");
          setError(data.error || "Export failed");
          return false;
        }
        return true;
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to check export status");
        return false;
      }
    };

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const keepPolling = await poll();
      if (cancelled || !keepPolling) return;
      interval = setInterval(async () => {
        const continuePolling = await poll();
        if (!continuePolling && interval) {
          clearInterval(interval);
        }
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [jobId, status]);

  const startExport = async (force = false) => {
    setStatus("starting");
    setError(null);
    setJobId(null);
    setProgress(0);
    mobileBlobRef.current = null;
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectSlug)}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aspectRatio, force }),
        },
      );
      const data = (await res.json()) as {
        jobId?: string;
        cached?: boolean;
        status?: string;
        fileName?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      if (!data.jobId) throw new Error("No export job id returned");
      setJobId(data.jobId);
      setFileName(data.fileName ?? "video.mp4");
      if (data.cached && data.status === "complete") {
        setStatus("complete");
        setProgress(1);
        return;
      }
      setStatus("polling");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to start export");
    }
  };

  const handleDownload = async () => {
    if (!jobId) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadExportVideo(jobId, fileName, {
        cachedBlob: mobileBlobRef.current,
      });
    } catch {
      setError("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleClick = () => {
    if (status === "complete" && jobId) {
      void handleDownload();
      return;
    }
    void startExport(status === "error");
  };

  const exporting = status === "starting" || status === "polling";
  const busy = exporting || downloading;
  const readyToDownload = status === "complete" && Boolean(jobId);

  const buttonVariant = readyToDownload
    ? "default"
    : status === "error"
      ? "destructive"
      : variant;

  const label = downloading
    ? "Downloading…"
    : exporting
      ? status === "starting"
        ? "Starting export…"
        : progress > 0
          ? `Exporting… ${Math.round(progress * 100)}%`
          : "Exporting…"
      : readyToDownload
        ? "Download MP4"
        : status === "error"
          ? "Try again"
          : "Export MP4";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant={buttonVariant}
        size={compact ? "default" : "sm"}
        disabled={disabled || busy}
        onClick={handleClick}
        className={cn(compact && "w-full")}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : readyToDownload ? (
          <Download />
        ) : (
          <Video />
        )}
        {label}
      </Button>

      {!compact && readyToDownload && !busy ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-muted-foreground">Export complete.</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={() => void startExport(true)}
            >
              Export again
            </Button>
          </div>
          {isMobile ? (
            <p className="text-xs text-muted-foreground">
              On iPhone, tap Download — then pick Save to Files, Photos, or Share.
            </p>
          ) : null}
        </div>
      ) : null}

      {!compact && exporting ? (
        <p className="text-xs text-muted-foreground">
          Rendering on our servers. This can take several minutes for long videos.
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
