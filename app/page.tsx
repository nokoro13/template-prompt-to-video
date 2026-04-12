import { CreateVideoButton } from "@/components/layout/CreateVideoButton";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600">
          Create and manage your video styles and voice clones.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <CreateVideoButton variant="card" />
        <div className="flex flex-col justify-between rounded-2xl bg-brand-500 p-6 text-white shadow-md">
          <span className="text-lg font-semibold">Buy credits</span>
          <button
            type="button"
            className="mt-4 w-fit rounded-full bg-white/25 px-4 py-1.5 text-sm font-medium hover:bg-white/35"
          >
            Purchase credits
          </button>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-slate-400 p-6 text-white shadow-md">
          <span className="text-lg font-semibold">Upgrade plan</span>
          <button
            type="button"
            className="mt-4 w-fit rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium hover:bg-white/30"
          >
            View plans
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total videos", value: "0", icon: "📹" },
          { label: "This month", value: "0", icon: "📈" },
          { label: "In progress", value: "0", icon: "⏱" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
              <span className="text-2xl opacity-80">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Credit usage timeline
        </h2>
        <p className="mt-1 text-sm text-slate-500">All activities combined</p>
        <div className="mt-8 flex h-40 items-center justify-center rounded-xl bg-surface-muted text-slate-400">
          Chart placeholder — connect billing to populate
        </div>
      </div>
    </div>
  );
}
