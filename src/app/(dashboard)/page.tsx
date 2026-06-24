import Link from "next/link";
import {
  Users,
  FileText,
  Bell,
  Gift,
  Camera,
  UserPlus,
  CalendarClock,
  Activity,
  ArrowRight,
} from "lucide-react";

const metrics = [
  {
    label: "Total Customers",
    value: "0",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    gradientBorder: "from-blue-200 to-blue-400",
  },
  {
    label: "Active Policies",
    value: "0",
    icon: FileText,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    gradientBorder: "from-emerald-200 to-emerald-400",
  },
  {
    label: "Pending Reminders",
    value: "0",
    icon: Bell,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    gradientBorder: "from-amber-200 to-amber-400",
  },
  {
    label: "This Month Gifts",
    value: "฿0",
    icon: Gift,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    gradientBorder: "from-pink-200 to-pink-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">FollowFlow</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back! Here&apos;s your overview.
        </p>
      </div>

      {/* Metric Cards - 2x2 on mobile, 4-col on desktop */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative rounded-2xl p-[1px]">
            {/* Gradient border */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${metric.gradientBorder} opacity-40`}
            />
            <div className="relative flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${metric.iconBg}`}
              >
                <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {metric.value}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {metric.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-3">
        <Link
          href="/import"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform active:scale-[0.98]"
        >
          <Camera className="h-4 w-4" />
          Import Screenshots
        </Link>
        <Link
          href="/customers/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-transform active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Link>
      </div>

      {/* Upcoming Reminders Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            Upcoming Reminders
          </h2>
          <Link
            href="/reminders"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            No upcoming reminders
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Import customers to get started!
          </p>
        </div>
      </section>

      {/* Recent Activities Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Activity className="h-5 w-5 text-indigo-500" />
            Recent Activities
          </h2>
          <Link
            href="/activities"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Activity className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            No recent activities
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Activities will appear here as you use FollowFlow.
          </p>
        </div>
      </section>
    </div>
  );
}
