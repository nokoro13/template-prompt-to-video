import { cn } from "@/lib/utils";

export function ClipngLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    >
      <path d="M16 16V24H24V16H16Z" fill="currentColor" />
      <path
        d="M0 0H8V8H16V16H8V24H0V16H8V8H0V0Z"
        fill="currentColor"
      />
    </svg>
  );
}
