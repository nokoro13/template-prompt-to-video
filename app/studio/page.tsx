"use client";

import type { PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CompositionList } from "@/components/studio/CompositionList";
import { PlaybackControls } from "@/components/studio/PlaybackControls";
import { PropsPanel } from "@/components/studio/PropsPanel";
import { RenderPanel } from "@/components/studio/RenderPanel";
import { TimelineScrubber } from "@/components/studio/TimelineScrubber";
import { VideoPlayer } from "@/components/studio/VideoPlayer";
import { getTotalDurationInFrames } from "@/lib/studio/timeline";
import { FPS } from "@/src/lib/constants";
import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import { TimelineSchema, type Timeline } from "@/src/lib/types";

type CompositionSummary = {
  id: string;
  shortTitle: string;
  durationInFrames: number;
  fps: number;
};

export default function StudioPage() {
  const playerRef = useRef<PlayerRef>(null);

  const [compositions, setCompositions] = useState<CompositionSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);

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
        const list = data.compositions ?? [];
        setCompositions(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev ?? list[0].id);
        }
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
    if (!selectedId) {
      setTimeline(null);
      return;
    }
    let cancelled = false;
    setTimelineError(null);
    fetch(`/content/${selectedId}/timeline.json`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const parsed = TimelineSchema.safeParse(json);
        if (!parsed.success) {
          setTimelineError("Invalid timeline data");
          setTimeline(null);
          return;
        }
        const tl = parsed.data;
        tl.elements.sort((a, b) => a.startMs - b.startMs);
        setTimeline(tl);
        setCurrentFrame(0);
        playerRef.current?.seekTo(0);
      })
      .catch((e) => {
        if (!cancelled) {
          setTimelineError(
            e instanceof Error ? e.message : "Failed to load timeline",
          );
          setTimeline(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const ready = Boolean(timeline && selectedId);

  // Player is loaded with next/dynamic — ref is often null on the first effect run.
  // Retry until the ref exists so frameupdate always drives the playhead (aspect toggle
  // used to “fix” this by remounting after the player had hydrated).
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

  const handleDeleteProject = useCallback(async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/studio/compositions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setCompositions((prev) => {
        const next = prev.filter((c) => c.id !== id);
        setSelectedId((sel) => (sel === id ? next[0]?.id ?? null : sel));
        return next;
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to delete project";
      setDeleteError(msg);
      throw e;
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Studio
        </h1>
        <p className="text-sm text-slate-600">
          Preview in the browser and render MP4 when you are ready.
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      )}

      {deleteError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      )}

      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <CompositionList
          compositions={compositions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={handleDeleteProject}
          deletingId={deletingId}
          getEditHref={(c) =>
            `/video-editor?slug=${encodeURIComponent(c.id)}&step=3`
          }
          className="max-h-[320px] lg:max-h-none"
        />

        <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <PropsPanel
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              disabled={!ready}
            />
            <RenderPanel
              compositionId={selectedId}
              aspectRatio={aspectRatio}
              disabled={!ready}
            />
          </div>

          {timelineError && (
            <p className="text-sm text-destructive">{timelineError}</p>
          )}

          <div className="relative flex min-h-[280px] min-w-0 flex-1 flex-col items-center justify-center">
            {ready && timeline ? (
              <VideoPlayer
                ref={playerRef}
                compositionId={selectedId!}
                timeline={timeline}
                aspectRatio={aspectRatio}
                durationInFrames={durationInFrames}
                fps={FPS}
                playbackRate={playbackRate}
              />
            ) : (
              <div className="flex min-h-[280px] w-full flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {selectedId ? "Loading timeline…" : "Select a composition"}
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
      </div>
    </div>
  );
}
