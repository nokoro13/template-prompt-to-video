import { cn } from "@/lib/utils";

type VideoEditorStepActionsProps = {
  className?: string;
  /** Optional row above actions (e.g. web search toggle). */
  options?: React.ReactNode;
  /** Back navigation — left on larger screens. */
  back?: React.ReactNode;
  /** Secondary actions — left of the continue button. */
  children?: React.ReactNode;
  /** Primary forward action — always last, bottom-right. */
  continue?: React.ReactNode;
};

export function VideoEditorStepActions({
  className,
  options,
  back,
  children,
  continue: continueAction,
}: VideoEditorStepActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t border-slate-200 pt-6",
        className,
      )}
    >
      {options ? (
        <div className="flex flex-wrap items-center gap-3">{options}</div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {back ? <div className="flex shrink-0">{back}</div> : null}
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2",
            back ? "sm:ml-auto" : "ml-auto w-full sm:w-auto",
          )}
        >
          {children}
          {continueAction}
        </div>
      </div>
    </div>
  );
}
