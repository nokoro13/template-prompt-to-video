"use client";

import type { PlayerRef } from "@remotion/player";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2] as const;

export type PlaybackControlsProps = {
  playerRef: React.RefObject<PlayerRef | null>;
  disabled?: boolean;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  className?: string;
};

export function PlaybackControls({
  playerRef,
  disabled,
  playbackRate,
  onPlaybackRateChange,
  className,
}: PlaybackControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const sync = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setPlaying(p.isPlaying());
    setMuted(p.isMuted());
    setVolume(p.getVolume());
  }, [playerRef]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMute = () => sync();
    const onVol = () => sync();
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("mutechange", onMute);
    p.addEventListener("volumechange", onVol);
    sync();
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("mutechange", onMute);
      p.removeEventListener("volumechange", onVol);
    };
  }, [playerRef, sync]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.toggle();
    sync();
  }, [playerRef, sync]);

  const frameBack = useCallback(() => {
    playerRef.current?.seekTo(
      Math.max(0, playerRef.current.getCurrentFrame() - 1),
    );
  }, [playerRef]);

  const frameForward = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(p.getCurrentFrame() + 1);
  }, [playerRef]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) p.unmute();
    else p.mute();
    sync();
  }, [playerRef, sync]);

  const onVolumeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number.parseFloat(e.target.value);
      playerRef.current?.setVolume(v);
      setVolume(v);
    },
    [playerRef],
  );

  const fullscreen = useCallback(() => {
    playerRef.current?.requestFullscreen();
  }, [playerRef]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-border bg-muted/20 px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:py-1.5",
        className,
      )}
    >
      <div className="flex items-center justify-center gap-1 sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="size-10 sm:size-8"
        >
          {playing ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={frameBack}
          aria-label="Previous frame"
          className="size-10 sm:size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={frameForward}
          aria-label="Next frame"
          className="size-10 sm:size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
        <label className="flex min-h-10 items-center gap-1 text-xs text-muted-foreground">
          Speed
          <select
            className="min-h-10 rounded-md border border-border bg-background px-2 py-1.5 text-xs sm:min-h-0 sm:py-1"
            value={playbackRate}
            disabled={disabled}
            onChange={(e) =>
              onPlaybackRateChange(Number.parseFloat(e.target.value))
            }
          >
            {PLAYBACK_RATES.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </label>

        <div className="flex min-w-0 flex-1 items-center gap-1 sm:min-w-[120px] sm:flex-none">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="size-10 shrink-0 sm:size-8"
          >
            {muted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={disabled}
            onChange={onVolumeInput}
            className="h-2 min-w-0 flex-1 accent-brand-600 sm:w-20 sm:flex-none"
            aria-label="Volume"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={fullscreen}
          className="h-10 w-full gap-1 sm:h-auto sm:w-auto"
        >
          <Maximize2 className="size-3.5" />
          Fullscreen
        </Button>
      </div>
    </div>
  );
}
