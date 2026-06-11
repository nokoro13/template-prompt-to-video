import { ArrowUpRight, Clock3, Film, Sparkles, TrendingUp, Zap } from "lucide-react";

import { CreateVideoButton } from "@/components/layout/CreateVideoButton";

const STATS = [
  {
    label: "Total videos",
    value: "0",
    icon: Film,
    iconClass: "text-brand-600 bg-brand-50",
  },
  {
    label: "This month",
    value: "0",
    icon: TrendingUp,
    iconClass: "text-emerald-600 bg-emerald-50",
  },
  {
    label: "In progress",
    value: "0",
    icon: Clock3,
    iconClass: "text-amber-600 bg-amber-50",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-medium text-brand-600">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-base">
          Create and manage your video styles and voice clones.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <CreateVideoButton variant="hero" />

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            className="group flex flex-col rounded-2xl border border-surface-border bg-white p-4 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
              <Zap className="size-4" />
            </span>
            <span className="mt-3 text-sm font-semibold text-slate-900">
              Buy credits
            </span>
            <span className="mt-0.5 text-xs text-slate-500">0 remaining</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
              Purchase
              <ArrowUpRight className="size-3.5" />
            </span>
          </button>

          <button
            type="button"
            className="group flex flex-col rounded-2xl border border-surface-border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
              <Sparkles className="size-4" />
            </span>
            <span className="mt-3 text-sm font-semibold text-slate-900">
              Upgrade plan
            </span>
            <span className="mt-0.5 text-xs text-slate-500">Free tier</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
              View plans
              <ArrowUpRight className="size-3.5" />
            </span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {STATS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-surface-border bg-white p-3 shadow-sm sm:p-5"
              >
                <span
                  className={`inline-flex size-8 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl ${card.iconClass}`}
                >
                  <Icon className="size-3.5 sm:size-4" />
                </span>
                <p className="mt-3 text-xl font-bold tabular-nums text-slate-900 sm:mt-4 sm:text-2xl">
                  {card.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500 sm:text-sm">
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Credit usage
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                All activities combined
              </p>
            </div>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-slate-500 sm:text-xs">
              Last 30 days
            </span>
          </div>
          <div className="mt-5 flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-muted/60 px-4 text-center sm:mt-6 sm:h-36">
            <p className="text-sm font-medium text-slate-500">No usage yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              Connect billing to see credit activity over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
