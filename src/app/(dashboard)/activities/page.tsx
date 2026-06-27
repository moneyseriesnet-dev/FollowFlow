"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Phone,
  MessageCircle,
  Users,
  Mail,
  Shield,
  Heart,
  Calendar,
  Clock,
  Gift,
  FileText,
  Filter,
  Loader2,
  Search,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

const typeFilters = [
  { key: "all", label: "ทั้งหมด", icon: Activity },
  { key: "call", label: "โทรศัพท์", icon: Phone },
  { key: "message", label: "ข้อความ/ไลน์", icon: MessageCircle },
  { key: "meeting", label: "พบปะ", icon: Users },
  { key: "policy", label: "กรมธรรม์/เคลม", icon: Shield },
  { key: "gift", label: "ของขวัญ", icon: Gift },
  { key: "other", label: "อื่นๆ", icon: Clock },
] as const;

type TypeFilter = (typeof typeFilters)[number]["key"];

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  phone_call: 'โทรศัพท์',
  line_chat: 'ไลน์คุย',
  meeting: 'พบปะ',
  email: 'อีเมล',
  policy_delivery: 'ส่งมอบกรมธรรม์',
  claim_support: 'ช่วยเหลือเคลม',
  follow_up: 'ติดตามงาน',
  other: 'อื่นๆ'
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'phone_call':
      return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30';
    case 'line_chat':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30';
    case 'meeting':
      return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-450 dark:border-indigo-900/30';
    case 'email':
      return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30';
    case 'policy_delivery':
      return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/30';
    case 'claim_support':
      return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30';
    default:
      return 'bg-slate-50 text-slate-655 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50';
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'phone_call':
      return <Phone className="h-3.5 w-3.5" />;
    case 'line_chat':
      return <MessageCircle className="h-3.5 w-3.5" />;
    case 'meeting':
      return <Users className="h-3.5 w-3.5" />;
    case 'email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'policy_delivery':
      return <Shield className="h-3.5 w-3.5" />;
    case 'claim_support':
      return <Heart className="h-3.5 w-3.5" />;
    case 'follow_up':
      return <Calendar className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
};

export default function ActivitiesPage() {
  const supabase = createClient() as any;
  
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
      }

      // Fetch all activities with customer details, policies, and linked gifts
      const { data, error: fetchErr } = await supabase
        .from("activities")
        .select(`
          *,
          customers (
            id,
            full_name
          ),
          policies (
            id,
            policy_number,
            plan_name,
            company
          ),
          gifts (
            id,
            gift_name,
            gift_cost
          )
        `)
        .eq("owner_id", user.id)
        .order("activity_date", { ascending: false });

      if (fetchErr) throw fetchErr;

      setActivities(data || []);
    } catch (err: any) {
      console.error("Failed to load activities:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // Filter activities locally
  const filteredActivities = activities.filter((act) => {
    const customerName = act.customers?.full_name || "";
    const summaryText = act.summary || "";
    const resultText = act.result || "";
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      searchQuery.trim() === "" ||
      customerName.toLowerCase().includes(searchLower) ||
      summaryText.toLowerCase().includes(searchLower) ||
      resultText.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Type filtering
    if (activeType === "all") return true;
    if (activeType === "call") return act.activity_type === "phone_call";
    if (activeType === "message")
      return act.activity_type === "line_chat" || act.activity_type === "email";
    if (activeType === "meeting") return act.activity_type === "meeting";
    if (activeType === "policy")
      return (
        act.activity_type === "policy_delivery" ||
        act.activity_type === "claim_support" ||
        act.policy_id !== null
      );
    if (activeType === "gift") return act.gifts && act.gifts.length > 0;
    if (activeType === "other")
      return (
        act.activity_type === "follow_up" ||
        act.activity_type === "other"
      );
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Activities (กิจกรรม)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ประวัติการทำกิจกรรมการติดต่อและเข้าดูแลลูกค้าของคุณทั้งหมด
          </p>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, รายละเอียด หรือผลลัพธ์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        {/* Filter Badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>กรองตามประเภท</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {typeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveType(filter.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all border ${
                  activeType === filter.key
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm dark:bg-indigo-500 dark:border-indigo-500"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800/50"
                }`}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 text-center dark:border-rose-950/20 dark:bg-rose-950/10">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            เกิดข้อผิดพลาดในการโหลดข้อมูล
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {error}
          </p>
          <button
            onClick={loadActivities}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            ลองอีกครั้ง
          </button>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm dark:border-slate-850 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30">
            <Activity className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            ไม่พบรายการกิจกรรม
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {searchQuery || activeType !== "all"
              ? "ลองปรับการค้นหาหรือตัวกรอง หรือสร้างกิจกรรมใหม่ในหน้าลูกค้า"
              : "ประวัติกิจกรรมจะแสดงที่นี่เมื่อคุณได้บันทึกการคุยโทรศัพท์ ข้อความ ส่งมอบของขวัญ หรือบริการกรมธรรม์กับลูกค้า"}
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 pl-6 dark:border-slate-800 space-y-6">
          {filteredActivities.map((act) => {
            const dateObj = new Date(act.activity_date);
            const dateStr = dateObj.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={act.id} className="relative group">
                {/* Timeline Node Point (Bullet Icon) */}
                <div
                  className={`absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all group-hover:scale-110 ${getActivityColor(
                    act.activity_type
                  )}`}
                >
                  {getActivityIcon(act.activity_type)}
                </div>

                {/* Timeline Card */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                    {/* Customer link and activity type label */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/customers/${act.customers?.id}`}
                          className="text-sm font-bold text-indigo-650 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
                        >
                          {act.customers?.full_name}
                          <ArrowRight className="h-3 w-3 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="text-[10px] text-slate-400 font-bold dark:text-slate-500">
                          •
                        </span>
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {ACTIVITY_TYPE_LABELS[act.activity_type] || act.activity_type}
                        </span>
                      </div>
                    </div>

                    {/* Date/Time */}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {dateStr}
                    </span>
                  </div>

                  {/* Summary / Notes */}
                  {act.summary && (
                    <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                      {act.summary}
                    </p>
                  )}

                  {/* Activity Results / Outcomes */}
                  {act.result && (
                    <div className="mt-2.5 rounded-lg bg-emerald-50/50 p-2.5 border border-emerald-100/50 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/10 dark:border-emerald-900/20 dark:text-emerald-450">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">ผลลัพธ์: </span>
                      {act.result}
                    </div>
                  )}

                  {/* Related Entities (Policies / Gifts) */}
                  {(act.policies || (act.gifts && act.gifts.length > 0) || act.next_action_date) && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                      {/* Policy Badges */}
                      {act.policies && (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span>
                            {act.policies.company} - {act.policies.plan_name} ({act.policies.policy_number})
                          </span>
                        </div>
                      )}

                      {/* Gift Badges */}
                      {act.gifts && act.gifts.map((gift: any) => (
                        <div key={gift.id} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50/30 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/20 dark:bg-rose-950/10 dark:text-rose-450">
                          <Gift className="h-3 w-3 text-rose-450" />
                          <span>
                            {gift.gift_name} (฿{Number(gift.gift_cost).toLocaleString()})
                          </span>
                        </div>
                      ))}

                      {/* Next Action Date Badge */}
                      {act.next_action_date && (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/20 dark:bg-indigo-950/10 dark:text-indigo-400">
                          <Calendar className="h-3 w-3 text-indigo-500" />
                          <span>
                            นัดติดตามครั้งถัดไป: {new Date(act.next_action_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
