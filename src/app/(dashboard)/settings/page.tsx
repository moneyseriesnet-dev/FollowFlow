import {
  User,
  Crown,
  BellRing,
  Download,
  Info,
  ChevronRight,
  Shield,
  Palette,
  LogOut,
} from "lucide-react";

const settingsSections = [
  {
    title: "Customer Levels",
    description: "Manage customer tier classifications",
    icon: Crown,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    href: "/settings/levels",
  },
  {
    title: "Notifications",
    description: "Reminder and alert preferences",
    icon: BellRing,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    href: "/settings/notifications",
  },
  {
    title: "Appearance",
    description: "Theme and display settings",
    icon: Palette,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    href: "/settings/appearance",
  },
  {
    title: "Data Export",
    description: "Export your data as CSV or JSON",
    icon: Download,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    href: "/settings/export",
  },
  {
    title: "Privacy & Security",
    description: "Password and account security",
    icon: Shield,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    href: "/settings/security",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                <User className="h-8 w-8" />
              </div>
              <div className="text-white">
                <p className="text-lg font-bold">Insurance Agent</p>
                <p className="text-sm text-white/80">user@example.com</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Plan</span>
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700">
                Free
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Sections */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Preferences
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {settingsSections.map((section, index) => (
            <button
              key={section.title}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                index !== settingsSections.length - 1
                  ? "border-b border-slate-100"
                  : ""
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.iconBg}`}
              >
                <section.icon
                  className={`h-5 w-5 ${section.iconColor}`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {section.title}
                </p>
                <p className="text-xs text-slate-500">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="mb-6">
        <button className="flex w-full items-center gap-4 rounded-2xl border border-red-100 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-red-50 active:bg-red-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <LogOut className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-red-600">Sign Out</p>
        </button>
      </section>

      {/* About Section */}
      <section className="mb-10">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Info className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">FollowFlow</p>
              <p className="text-xs text-slate-500">
                Version 0.1.0 · Insurance CRM
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Mobile-first insurance CRM with OCR import, smart reminders, and
            customer lifecycle management. Built with Next.js, Supabase, and
            Tailwind CSS.
          </p>
        </div>
      </section>
    </div>
  );
}
