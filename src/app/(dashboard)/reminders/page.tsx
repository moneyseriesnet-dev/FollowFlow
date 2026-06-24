"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  Pause,
  CheckCircle2,
  CalendarHeart,
  Wallet,
  ClipboardList,
  Tag,
  Camera,
} from "lucide-react";

const tabs = [
  { key: "all", label: "All", icon: Bell },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "snoozed", label: "Snoozed", icon: Pause },
  { key: "done", label: "Done", icon: CheckCircle2 },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const typeGroups = [
  { key: "all", label: "All Types", icon: Tag },
  { key: "premium", label: "Premium Due", icon: Wallet },
  { key: "birthday", label: "Birthday", icon: CalendarHeart },
  { key: "review", label: "Financial Review", icon: ClipboardList },
  { key: "general", label: "General", icon: Bell },
] as const;
type TypeKey = (typeof typeGroups)[number]["key"];

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [activeType, setActiveType] = useState<TypeKey>("all");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reminders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stay on top of follow-ups and important dates
        </p>
      </div>

      {/* Tab Filters */}
      <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Type Groups */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {typeGroups.map((type) => (
          <button
            key={type.key}
            onClick={() => setActiveType(type.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeType === type.key
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <type.icon className="h-3.5 w-3.5" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
          <Bell className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          No reminders yet
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          Reminders are auto-generated when you add customers with policy
          renewal dates and birthdays.
        </p>
        <Link
          href="/import"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-transform active:scale-[0.98]"
        >
          <Camera className="h-4 w-4" />
          Import Customers
        </Link>
      </div>
    </div>
  );
}
