import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  const track =
    size === "default"
      ? "h-5 min-h-5 w-9 min-w-9"
      : "h-4 min-h-4 w-7 min-w-7";
  const thumb = size === "default" ? "size-4 min-h-4 min-w-4" : "size-3 min-h-3 min-w-3";
  /** Root gets `data-checked`; thumb often does not — use `group` + `left` so motion is reliable. */
  const thumbMotion =
    size === "default"
      ? "left-0.5 group-data-[checked]:left-[calc(100%-1.125rem)]"
      : "left-0.5 group-data-[checked]:left-[calc(100%-0.875rem)]";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "group relative inline-block shrink-0 cursor-pointer rounded-full border border-slate-400/50 bg-slate-300 outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:border-slate-600 dark:bg-slate-600 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        track,
        "data-checked:border-primary/30 data-checked:bg-primary data-unchecked:bg-slate-300 dark:data-unchecked:bg-slate-600",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute top-1/2 block -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-slate-900/15 transition-[left] duration-200 ease-out will-change-[left] dark:ring-black/20",
          thumb,
          thumbMotion,
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
