"use client";

import { Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AspectRatioToggleValue = "9:16" | "16:9";

export type AspectRatioToggleProps = {
  value: AspectRatioToggleValue;
  onChange: (v: AspectRatioToggleValue) => void;
  disabled?: boolean;
  /** Icons + short labels (Studio) vs longer labels (style forms). */
  labelStyle?: "compact" | "descriptive";
  className?: string;
};

/**
 * Segmented aspect control: outer corners stay rounded via overflow clipping
 * so the selected segment does not show square corners against the container.
 */
export function AspectRatioToggle({
  value,
  onChange,
  disabled,
  labelStyle = "compact",
  className,
}: AspectRatioToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 overflow-hidden rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5",
        labelStyle === "descriptive" && "w-full max-w-md",
        className,
      )}
      role="group"
      aria-label="Output aspect ratio"
    >
      <Button
        type="button"
        variant={value === "9:16" ? "secondary" : "ghost"}
        size="sm"
        disabled={disabled}
        className="h-7 flex-1 gap-1 rounded-md border-0 px-2 text-xs shadow-none"
        onClick={() => onChange("9:16")}
      >
        {labelStyle === "compact" ? (
          <>
            <Smartphone className="size-3" />
            9:16
          </>
        ) : (
          "9:16 portrait"
        )}
      </Button>
      <Button
        type="button"
        variant={value === "16:9" ? "secondary" : "ghost"}
        size="sm"
        disabled={disabled}
        className="h-7 flex-1 gap-1 rounded-md border-0 px-2 text-xs shadow-none"
        onClick={() => onChange("16:9")}
      >
        {labelStyle === "compact" ? (
          <>
            <Monitor className="size-3" />
            16:9
          </>
        ) : (
          "16:9 landscape"
        )}
      </Button>
    </div>
  );
}
