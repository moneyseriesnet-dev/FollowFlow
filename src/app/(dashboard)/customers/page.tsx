"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Camera,
  UserPlus,
  Filter,
} from "lucide-react";

const filterChips = ["All", "Active", "Inactive"] as const;
type FilterChip = (typeof filterChips)[number];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("All");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your customer relationships
          </p>
        </div>
        <Link
          href="/customers/new"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition-transform active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Filter Chips */}
      <div className="mb-6 flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {filterChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === chip
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
          <Users className="h-8 w-8 text-indigo-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          No customers yet
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          Use OCR Import to add your first customers from insurance app
          screenshots.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/import"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            Import Screenshots
          </Link>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-transform active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Add Manually
          </Link>
        </div>
      </div>
    </div>
  );
}
