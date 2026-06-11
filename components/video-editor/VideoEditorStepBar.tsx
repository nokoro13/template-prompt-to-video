"use client";

import { cn } from "@/lib/utils";

export const VIDEO_EDITOR_STEPS = [
  "Setup",
  "Script",
  "Voiceover",
  "Scene images",
  "Finish",
] as const;

const MOBILE_STEP_LABELS = ["Setup", "Script", "Voice", "Images", "Done"] as const;

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

  const stepClass = (i: number) =>
    i === step
      ? "bg-brand-600 text-white"
      : mode === "progress" && i < step
        ? "bg-slate-200 text-slate-700"
        : "bg-slate-100 text-slate-500";

  return (
    <div
      className={cn(
        "-mx-4 border-b border-slate-200 px-4 pb-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      <div className="scrollbar-none flex w-full snap-x snap-mandatory gap-2 overflow-x-auto sm:gap-3 sm:overflow-visible">
        {VIDEO_EDITOR_STEPS.map((label, i) => {
          const sharedClass = cn(
            "flex min-h-11 min-w-[4.75rem] shrink-0 snap-start items-center justify-center rounded-lg px-2.5 text-xs font-medium leading-none",
            "sm:min-h-10 sm:min-w-0 sm:flex-1 sm:px-3 sm:text-sm",
            stepClass(i),
          );

          const stepLabel = (
            <span className="whitespace-nowrap">
              <span className="sm:hidden">
                {i + 1}. {MOBILE_STEP_LABELS[i]}
              </span>
              <span className="hidden sm:inline">
                {i + 1}. {label}
              </span>
            </span>
          );

          if (interactive) {
            return (
              <button
                key={label}
                type="button"
                onClick={() => onStepChange?.(i)}
                className={cn(sharedClass, "transition hover:opacity-90")}
              >
                {stepLabel}
              </button>
            );
          }

          return (
            <div key={label} className={sharedClass}>
              {stepLabel}
            </div>
          );
        })}
      </div>
    </div>
  );
}
