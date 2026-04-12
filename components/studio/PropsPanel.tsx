"use client";

import type { VideoAspectRatio } from "@/src/lib/aspect-compositions";
import { AspectRatioToggle } from "@/components/styles/AspectRatioToggle";

export type PropsPanelProps = {
  aspectRatio: VideoAspectRatio;
  onAspectRatioChange: (a: VideoAspectRatio) => void;
  disabled?: boolean;
  className?: string;
};

export function PropsPanel({
  aspectRatio,
  onAspectRatioChange,
  disabled,
  className,
}: PropsPanelProps) {
  return (
    <AspectRatioToggle
      value={aspectRatio}
      onChange={onAspectRatioChange}
      disabled={disabled}
      labelStyle="compact"
      className={className}
    />
  );
}
