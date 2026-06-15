"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import type { PlayerRef } from "@remotion/player";

import { AIVideo, aiVideoSchema } from "@/src/components/AIVideo";
import {
  fitCompositionToContainer,
  getDimensionsForAspect,
  type VideoAspectRatio,
} from "@/src/lib/aspect-compositions";
import type { Timeline } from "@/src/lib/types";

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false },
);

const AIVideoForPlayer = AIVideo as ComponentType<Record<string, unknown>>;

export type VideoPlayerProps = {
  compositionId: string;
  timeline: Timeline;
  aspectRatio: VideoAspectRatio;
  durationInFrames: number;
  fps: number;
  playbackRate?: number;
  assetBaseUrl?: string | null;
  className?: string;
  style?: CSSProperties;
};

export const VideoPlayer = forwardRef<PlayerRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      compositionId,
      timeline,
      aspectRatio,
      durationInFrames,
      fps,
      playbackRate = 1,
      assetBaseUrl,
      className,
      style,
    },
    ref,
  ) {
    const dims = getDimensionsForAspect(aspectRatio);
    const inputProps = useMemo(
      () => ({
        timeline,
        aspectRatio,
        projectSlug: compositionId,
        ...(assetBaseUrl ? { assetBaseUrl } : {}),
      }),
      [timeline, aspectRatio, compositionId, assetBaseUrl],
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<{ w: number; h: number } | null>(null);

    const applySize = useCallback(
      (containerWidth: number, containerHeight: number) => {
        const { width: cw, height: ch } = dims;
        const { width, height } = fitCompositionToContainer(
          containerWidth,
          containerHeight,
          cw,
          ch,
        );
        if (width <= 0 || height <= 0) return;
        setBox((prev) => {
          if (
            prev &&
            prev.w === width &&
            prev.h === height
          ) {
            return prev;
          }
          return { w: width, h: height };
        });
      },
      [dims],
    );

    const measure = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      applySize(width, height);
    }, [applySize]);

    useLayoutEffect(() => {
      measure();
      const id = requestAnimationFrame(() => measure());
      return () => cancelAnimationFrame(id);
    }, [measure, aspectRatio, dims]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (!cr) return;
        applySize(cr.width, cr.height);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [applySize, aspectRatio]);

    const playerStyle = useMemo((): CSSProperties => {
      if (box == null) {
        return {};
      }
      return {
        display: "block",
        margin: 0,
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        flexShrink: 0,
        ...style,
      };
    }, [box, style]);

    return (
      <div
        ref={containerRef}
        className="flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden"
      >
        {box != null ? (
          <div
            className="shrink-0 overflow-hidden rounded-xl bg-black/90 shadow-inner ring-1 ring-border"
            style={{
              width: box.w,
              height: box.h,
              lineHeight: 0,
            }}
          >
            <Player
              ref={ref}
              key={`${compositionId}-${aspectRatio}-${durationInFrames}`}
              acknowledgeRemotionLicense
              component={AIVideoForPlayer}
              schema={aiVideoSchema}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              compositionWidth={dims.width}
              compositionHeight={dims.height}
              fps={fps}
              playbackRate={playbackRate}
              controls={false}
              className={className}
              style={playerStyle}
            />
          </div>
        ) : null}
      </div>
    );
  },
);
