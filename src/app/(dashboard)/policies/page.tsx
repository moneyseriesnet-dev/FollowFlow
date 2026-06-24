"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Camera,
  Building2,
  CircleDot,
} from "lucide-react";

const companyFilters = ["All", "AXA", "AIA"] as const;
type CompanyFilter = (typeof companyFilters)[number];

const statusFilters = ["All", "Active", "Lapsed"] as const;
type StatusFilter = (typeof statusFilters)[number];

export default function PoliciesPage() {
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track insurance policies across companies
        </p>
      </div>

      {/* Company Filter */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Company</span>
        </div>
        <div className="mt-2 flex gap-2">
          {companyFilters.map((company) => (
            <button
              key={company}
              onClick={() => setCompanyFilter(company)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                companyFilter === company
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {company}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Status</span>
        </div>
        <div className="mt-2 flex gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
          <FileText className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          No policies found
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          Policies are created when you import customer data from insurance app
          screenshots.
        </p>
        <Link
          href="/import"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98]"
        >
          <Camera className="h-4 w-4" />
          Import Screenshots
        </Link>
      </div>
    </div>
  );
}
