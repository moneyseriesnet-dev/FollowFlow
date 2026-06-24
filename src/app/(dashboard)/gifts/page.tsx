import Link from "next/link";
import {
  Gift,
  TrendingUp,
  Plus,
  CalendarDays,
} from "lucide-react";

export default function GiftsPage() {
  const currentMonth = new Date().toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gifts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track gifts sent to customers
          </p>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg shadow-pink-500/25 transition-transform active:scale-95">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Monthly Summary Card */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-[1px]">
        {/* Gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 opacity-50" />
        <div className="relative rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-pink-600">
                <CalendarDays className="h-3.5 w-3.5" />
                {currentMonth}
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">฿0</p>
              <p className="mt-1 text-sm text-slate-500">Total this month</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <TrendingUp className="h-7 w-7 text-pink-500" />
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="flex-1 rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-900">0</p>
              <p className="text-[10px] font-medium text-slate-500">
                Gifts Sent
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-900">0</p>
              <p className="text-[10px] font-medium text-slate-500">
                Recipients
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-900">฿0</p>
              <p className="text-[10px] font-medium text-slate-500">Average</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gift List - Empty State */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Gift History
        </h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-rose-100">
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No gifts recorded
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
            ฿0 total this month. Record gifts to track your customer
            relationship expenses.
          </p>
          <Link
            href="/customers"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-transform active:scale-[0.98]"
          >
            <Gift className="h-4 w-4" />
            View Customers
          </Link>
        </div>
      </section>
    </div>
  );
}
