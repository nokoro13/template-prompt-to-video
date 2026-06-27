"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";

import { ProjectPickerDialog } from "@/components/projects/ProjectPickerDialog";
import { ExportVideoButton } from "@/components/export/ExportVideoButton";
import { PlaybackControls } from "@/components/studio/PlaybackControls";
import { PropsPanel } from "@/components/studio/PropsPanel";
import { TimelineScrubber } from "@/components/studio/TimelineScrubber";
import { VideoPlayer } from "@/components/studio/VideoPlayer";
import { Button } from "@/components/ui/button";
import type { CompositionSummary } from "@/lib/studio/compositions";
import { getTotalDurationInFrames } from "@/lib/studio/timeline";
import { FPS } from "@/src/lib/constants";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import { TimelineSchema, type Timeline } from "@/src/lib/types";
import type { PlayerRef } from "@remotion/player";

export function StudioClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugFromUrl = searchParams.get("slug")?.trim() ?? null;

  const playerRef = useRef<PlayerRef>(null);

  const [compositions, setCompositions] = useState<CompositionSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [assetBaseUrl, setAssetBaseUrl] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);

  const selectedComposition = useMemo(
    () => compositions.find((c) => c.id === selectedId) ?? null,
    [compositions, selectedId],
  );

  const durationInFrames = useMemo(
    () => (timeline ? getTotalDurationInFrames(timeline) : 0),
    [timeline],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio/compositions")
      .then((r) => r.json())
      .then((data: { compositions?: CompositionSummary[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setCompositions(data.compositions ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!slugFromUrl) {
      setSelectedId(null);
      return;
    }
    setSelectedId(slugFromUrl);
  }, [slugFromUrl]);

  useEffect(() => {
    if (selectedComposition?.aspectRatio) {
      setAspectRatio(selectedComposition.aspectRatio);
    }
  }, [selectedComposition?.aspectRatio, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setTimeline(null);
      setAssetBaseUrl(null);
      return;
    }
    let cancelled = false;
    setTimelineError(null);
    fetch(`/api/studio/projects/${encodeURIComponent(selectedId)}`)
      .then(async (r) => {
        const data = (await r.json()) as {
          timeline?: Timeline;
          assetBaseUrl?: string | null;
          error?: string;
        };
        if (!r.ok) {
          throw new Error(data.error ?? r.statusText);
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const parsed = TimelineSchema.safeParse(data.timeline);
        if (!parsed.success) {
          setTimelineError("Invalid timeline data");
          setTimeline(null);
          setAssetBaseUrl(null);
          return;
        }
        const tl = parsed.data;
        tl.elements.sort((a, b) => a.startMs - b.startMs);
        setTimeline(tl);
        setAssetBaseUrl(data.assetBaseUrl ?? null);
        setCurrentFrame(0);
        playerRef.current?.seekTo(0);
      })
      .catch((e) => {
        if (!cancelled) {
          setTimelineError(
            e instanceof Error ? e.message : "Failed to load timeline",
          );
          setTimeline(null);
          setAssetBaseUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const ready = Boolean(timeline && selectedId);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const tryAttach = (): boolean => {
      const p = playerRef.current;
      if (!p || cancelled) return false;
      const onFrame = (ev: { detail: { frame: number } }) => {
        setCurrentFrame(ev.detail.frame);
      };
      p.addEventListener("frameupdate", onFrame);
      p.addEventListener("seeked", onFrame);
      cleanup = () => {
        p.removeEventListener("frameupdate", onFrame);
        p.removeEventListener("seeked", onFrame);
      };
      return true;
    };

    if (tryAttach()) {
      return () => {
        cancelled = true;
        cleanup?.();
      };
    }

    const id = window.setInterval(() => {
      if (tryAttach()) {
        clearInterval(id);
      }
    }, 16);

    const timeout = window.setTimeout(() => {
      clearInterval(id);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(timeout);
      cleanup?.();
    };
  }, [ready, timeline, selectedId, aspectRatio, durationInFrames]);

  const seekTo = useCallback(
    (frame: number) => {
      const max = Math.max(0, durationInFrames - 1);
      const f = Math.max(0, Math.min(max, frame));
      playerRef.current?.seekTo(f);
      setCurrentFrame(f);
    },
    [durationInFrames],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const p = playerRef.current;
      if (!p || !timeline) return;
      if (e.code === "Space") {
        e.preventDefault();
        p.toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(currentFrame - (e.shiftKey ? FPS : 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(currentFrame + (e.shiftKey ? FPS : 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentFrame, seekTo, timeline]);

  const handleProjectConfirm = (projectId: string) => {
    setPickerOpen(false);
    router.push(`/studio?slug=${encodeURIComponent(projectId)}`);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Studio</h1>
          <p className="text-sm text-muted-foreground">
            {selectedComposition ? (
              <>
                Previewing{" "}
                <span className="font-medium text-foreground">
                  {selectedComposition.shortTitle}
                </span>
              </>
            ) : (
              "Preview in the browser and render MP4 when you are ready."
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="w-full shrink-0 sm:w-auto"
        >
          <FolderOpen className="mr-1.5 size-4" />
          {selectedId ? "Change project" : "Choose project"}
        </Button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      )}

      <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <PropsPanel
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            disabled={!ready}
          />
          <ExportVideoButton
            projectSlug={selectedId ?? ""}
            aspectRatio={aspectRatio}
            variant="secondary"
            disabled={!ready || !selectedId}
          />
        </div>

        {timelineError && (
          <p className="text-sm text-destructive">{timelineError}</p>
        )}

        <div className="relative flex min-h-[200px] min-w-0 flex-1 flex-col items-center justify-center sm:min-h-[280px]">
          {ready && timeline ? (
            <VideoPlayer
              ref={playerRef}
              compositionId={selectedId!}
              timeline={timeline}
              aspectRatio={aspectRatio}
              durationInFrames={durationInFrames}
              fps={FPS}
              playbackRate={playbackRate}
              assetBaseUrl={assetBaseUrl}
            />
          ) : (
            <div className="flex min-h-[280px] w-full flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              <p>
                {selectedId
                  ? "Loading timeline…"
                  : "Choose a project to preview and render."}
              </p>
              {!selectedId ? (
                <Button type="button" onClick={() => setPickerOpen(true)}>
                  Choose project
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {ready && timeline ? (
          <>
            <TimelineScrubber
              timeline={timeline}
              durationInFrames={durationInFrames}
              currentFrame={currentFrame}
              fps={FPS}
              onSeek={seekTo}
            />
            <PlaybackControls
              playerRef={playerRef}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
            />
          </>
        ) : null}
      </div>

      <ProjectPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={compositions}
        initialProjectId={selectedId ?? ""}
        onConfirm={handleProjectConfirm}
        confirmLabel="Open in Studio"
      />
    </div>
  );
}
