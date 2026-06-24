"use client";

import { useState } from "react";
import {
  Activity,
  Phone,
  MessageSquare,
  Gift,
  FileText,
  UserPlus,
  Filter,
} from "lucide-react";

const typeFilters = [
  { key: "all", label: "All", icon: Activity },
  { key: "call", label: "Calls", icon: Phone },
  { key: "message", label: "Messages", icon: MessageSquare },
  { key: "gift", label: "Gifts", icon: Gift },
  { key: "policy", label: "Policies", icon: FileText },
  { key: "customer", label: "Customers", icon: UserPlus },
] as const;
type TypeFilter = (typeof typeFilters)[number]["key"];

export default function ActivitiesPage() {
  const [activeType, setActiveType] = useState<TypeFilter>("all");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your activity timeline at a glance
        </p>
      </div>

      {/* Type Filters */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">
            Filter by type
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {typeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveType(filter.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeType === filter.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <filter.icon className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Empty State */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Timeline header */}
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Timeline
          </p>
        </div>

        {/* Empty state */}
        <div className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100">
            <Activity className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No activities recorded
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
            Activities will appear here as you interact with customers — calls,
            messages, gifts, and more.
          </p>
        </div>
      </div>

      {/* Timeline visual placeholder */}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/50 p-6">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
            <div className="h-12 w-px bg-slate-200" />
            <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
            <div className="h-12 w-px bg-slate-200" />
            <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
          </div>
          <div className="flex flex-col gap-6 pt-0.5">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="h-4 w-36 rounded bg-slate-100" />
            <div className="h-4 w-40 rounded bg-slate-100" />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Timeline entries will populate here
        </p>
      </div>
    </div>
  );
}
