"use client";

import { cn } from "@/lib/utils";

export const VIDEO_EDITOR_STEPS = [
  "Setup",
  "Script",
  "Voiceover",
  "Scene images",
  "Finish",
] as const;

type VideoEditorStepBarProps = {
  step: number;
  onStepChange?: (step: number) => void;
  /** `progress` mirrors the live editor; `tabs` only highlights the active step (landing demo). */
  mode?: "progress" | "tabs";
  className?: string;
};

export function VideoEditorStepBar({
  step,
  onStepChange,
  mode = "progress",
  className,
}: VideoEditorStepBarProps) {
  const interactive = Boolean(onStepChange);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-b border-slate-200 pb-4",
        className,
      )}
    >
      {VIDEO_EDITOR_STEPS.map((label, i) => {
        const stateClass =
          i === step
            ? "bg-brand-600 text-white"
            : mode === "progress" && i < step
              ? "bg-slate-200 text-slate-700"
              : "bg-slate-100 text-slate-500";

        if (interactive) {
          return (
            <button
              key={label}
              type="button"
              onClick={() => onStepChange?.(i)}
              className={cn(
                "min-w-[4.5rem] flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition hover:opacity-90 sm:text-sm",
                stateClass,
              )}
            >
              {i + 1}. {label}
            </button>
          );
        }

        return (
          <div
            key={label}
            className={cn(
              "min-w-[4.5rem] flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium sm:text-sm",
              stateClass,
            )}
          >
            {i + 1}. {label}
          </div>
        );
      })}
    </div>
  );
}
