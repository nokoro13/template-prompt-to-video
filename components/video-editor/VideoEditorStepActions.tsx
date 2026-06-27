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

function ActionSlot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full sm:w-auto [&_button]:h-10 [&_button]:w-full sm:[&_button]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {options}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {back ? <ActionSlot>{back}</ActionSlot> : null}
        <div
          className={cn(
            "flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
            !back && "sm:ml-auto",
          )}
        >
          {children ? <ActionSlot>{children}</ActionSlot> : null}
          {continueAction ? (
            <ActionSlot>{continueAction}</ActionSlot>
          ) : null}
        </div>
      </div>
    </div>
  );
}
