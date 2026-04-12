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
        "flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-2 py-1.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={disabled}
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
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
        size="icon-sm"
        disabled={disabled}
        onClick={frameBack}
        aria-label="Previous frame"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={frameForward}
        aria-label="Next frame"
      >
        <ChevronRight className="size-4" />
      </Button>

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Speed
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
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

      <div className="flex min-w-[120px] items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
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
          className="h-2 w-20 accent-brand-600"
          aria-label="Volume"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={fullscreen}
        className="gap-1"
      >
        <Maximize2 className="size-3.5" />
        Fullscreen
      </Button>
    </div>
  );
}
