"use client";

import { useCallback, useMemo, useRef } from "react";

import { calculateFrameTiming } from "@/src/lib/utils";
import type { Timeline } from "@/src/lib/types";

import { cn } from "@/lib/utils";

function formatTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export type TimelineScrubberProps = {
  timeline: Timeline;
  durationInFrames: number;
  currentFrame: number;
  fps: number;
  onSeek: (frame: number) => void;
  disabled?: boolean;
  className?: string;
};

const ROW_H = "h-6";

export function TimelineScrubber({
  timeline,
  durationInFrames,
  currentFrame,
  fps,
  onSeek,
  disabled,
  className,
}: TimelineScrubberProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const { scene, subtitles, audio } = useMemo(() => {
    const sceneSegs: { start: number; end: number }[] = [];
    timeline.elements.forEach((el, index) => {
      const { startFrame, duration } = calculateFrameTiming(
        el.startMs,
        el.endMs,
        { includeIntro: index === 0 },
      );
      sceneSegs.push({ start: startFrame, end: startFrame + duration });
    });
    const textSegs: { start: number; end: number }[] = [];
    timeline.text.forEach((el) => {
      const { startFrame, duration } = calculateFrameTiming(
        el.startMs,
        el.endMs,
        { addIntroOffset: true },
      );
      textSegs.push({ start: startFrame, end: startFrame + duration });
    });
    const audioSegs: { start: number; end: number }[] = [];
    timeline.audio.forEach((el) => {
      const { startFrame, duration } = calculateFrameTiming(
        el.startMs,
        el.endMs,
        { addIntroOffset: true },
      );
      audioSegs.push({ start: startFrame, end: startFrame + duration });
    });
    return { scene: sceneSegs, subtitles: textSegs, audio: audioSegs };
  }, [timeline]);

  const max = Math.max(0, durationInFrames - 1);
  const denom = Math.max(1, durationInFrames);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = railRef.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const frame = Math.round(pct * max);
      onSeek(frame);
    },
    [disabled, max, onSeek],
  );

  const onPointerDownRail = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      seekFromClientX(e.clientX);
      const move = (ev: PointerEvent) => seekFromClientX(ev.clientX);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [disabled, seekFromClientX],
  );

  const onRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number.parseInt(e.target.value, 10);
      if (!Number.isNaN(v)) onSeek(v);
    },
    [onSeek],
  );

  const playheadPct = (Math.min(currentFrame, max) / denom) * 100;

  const renderSegments = (
    segments: { start: number; end: number }[],
    className: string,
  ) =>
    segments.map((m, i) => {
      const left = (m.start / denom) * 100;
      const width = ((m.end - m.start) / denom) * 100;
      return (
        <div
          key={i}
          className={cn("absolute top-0.5 bottom-0.5 rounded-sm", className)}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 0.15)}%`,
            minWidth: 2,
          }}
          title={`${m.start}–${m.end} f`}
        />
      );
    });

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-0 gap-2">
        <div className="flex w-16 shrink-0 flex-col justify-center gap-1 text-[10px] font-medium leading-none text-muted-foreground">
          <div className={cn("flex items-center", ROW_H)}>Scene</div>
          <div className={cn("flex items-center", ROW_H)}>Subtitles</div>
          <div className={cn("flex items-center", ROW_H)}>Audio</div>
        </div>

        <div className="min-w-0 flex-1 rounded-md border border-border bg-muted/30 p-1">
          {/* railRef width matches track rows exactly so % align with segments */}
          <div ref={railRef} className="relative flex flex-col gap-1">
            <div
              className={cn(
                "relative overflow-hidden rounded bg-background/80",
                ROW_H,
              )}
            >
              {renderSegments(scene, "bg-emerald-500/85")}
            </div>
            <div
              className={cn(
                "relative overflow-hidden rounded bg-background/80",
                ROW_H,
              )}
            >
              {renderSegments(subtitles, "bg-amber-400/80")}
            </div>
            <div
              className={cn(
                "relative overflow-hidden rounded bg-background/80",
                ROW_H,
              )}
            >
              {renderSegments(audio, "bg-sky-500/80")}
            </div>

            <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
              <div
                className="absolute bottom-0 top-0 w-px bg-primary shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
                style={{
                  left: `${playheadPct}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>

            <button
              type="button"
              disabled={disabled}
              className="absolute inset-0 z-20 cursor-ew-resize bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Seek along timeline"
              onPointerDown={onPointerDownRail}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center self-stretch">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatTime(Math.min(currentFrame, max), fps)}
            <span className="text-border"> / </span>
            {formatTime(max, fps)}
          </span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(currentFrame, max)}
        disabled={disabled}
        onChange={onRangeChange}
        className="h-1.5 w-full cursor-pointer accent-primary disabled:opacity-50"
        aria-label="Frame position"
      />
    </div>
  );
}
