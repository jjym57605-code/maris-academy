"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Stats = {
  students: number;
  courses: number;
  lessons: number;
  quizzes: number;
  reels: number;
  achievements: number;
};

type RecentStudent = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  maris_id: string | null;
  created_at: string;
};

type AdminStudent = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string;
  is_admin: boolean | null;
  total_xp: number | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [stats, setStats] = useState<Stats>({
    students: 0,
    courses: 0,
    lessons: 0,
    quizzes: 0,
    reels: 0,
    achievements: 0,
  });

  const [recentStudents, setRecentStudents] = useState<
    RecentStudent[]
  >([]);

  async function loadDashboard() {
    try {
      const supabase = getSupabase();

      if (!supabase) {
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminData, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminData !== true) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      const [
        adminStudentsResult,
        coursesResult,
        lessonsResult,
        quizzesResult,
        reelsResult,
        achievementsResult,
      ] = await Promise.all([
        supabase.rpc("get_admin_students"),

        supabase
          .from("courses")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("quizzes")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("reels")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("achievements")
          .select("id", { count: "exact", head: true }),
      ]);

      if (adminStudentsResult.error) {
        throw adminStudentsResult.error;
      }

      if (coursesResult.error) {
        throw coursesResult.error;
      }

      if (lessonsResult.error) {
        throw lessonsResult.error;
      }

      if (quizzesResult.error) {
        throw quizzesResult.error;
      }

      if (reelsResult.error) {
        throw reelsResult.error;
      }

      if (achievementsResult.error) {
        throw achievementsResult.error;
      }

      const allStudents =
        (adminStudentsResult.data ?? []) as AdminStudent[];

      setStats({
        students: allStudents.length,
        courses: coursesResult.count ?? 0,
        lessons: lessonsResult.count ?? 0,
        quizzes: quizzesResult.count ?? 0,
        reels: reelsResult.count ?? 0,
        achievements: achievementsResult.count ?? 0,
      });

      setRecentStudents(
        allStudents.slice(0, 5).map((student) => ({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          maris_id: student.maris_id,
          created_at: student.created_at,
        }))
      );
    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!mounted) return;
      await loadDashboard();
    }

    start();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl shadow-[0_0_30px_rgba(34,211,238,0.12)]">
            👑
          </div>

          <p className="text-sm font-medium text-slate-400">
            جاري تحميل لوحة الإدارة...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main
      dir="rtl"
      className="min-h-full px-4 py-6 text-slate-100 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#071b2d] via-[#08283d] to-[#063247] p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              <span>🌊</span>
              <span>MARIS ACADEMY ²⁰²⁷</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              👑 لوحة الإدارة
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              مرحبًا بك في مركز التحكم في MARIS ACADEMY.
              من هنا تقدر تدير المحتوى، الطلاب، الاختبارات
              والإحصائيات.
            </p>
          </div>
        </section>

        {/* MAIN STATS */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                📊 نظرة عامة
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أرقام حقيقية من قاعدة البيانات
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon="👥"
              title="الطلاب"
              value={stats.students}
              href="/admin/students"
              accent="cyan"
            />

            <StatCard
              icon="📚"
              title="الدورات"
              value={stats.courses}
              href="/admin/courses"
              accent="blue"
            />

            <StatCard
              icon="📖"
              title="الدروس"
              value={stats.lessons}
              href="/admin/courses"
              accent="emerald"
            />

            <StatCard
              icon="📝"
              title="الاختبارات"
              value={stats.quizzes}
              href="/admin/quizzes"
              accent="violet"
            />

            <StatCard
              icon="🎬"
              title="الريلزات"
              value={stats.reels}
              href="/admin/reels"
              accent="sky"
            />

            <StatCard
              icon="🏆"
              title="الإنجازات"
              value={stats.achievements}
              href="/admin/achievements"
              accent="amber"
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 shadow-xl shadow-black/10 md:p-6">
          <div className="mb-5">
            <h2 className="font-bold text-white">
              ⚡ الوصول السريع
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              أهم الأدوات الإدارية
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/reels"
              icon="🎬"
              title="إدارة الريلزات"
            />

            <QuickAction
              href="/admin/courses"
              icon="📚"
              title="إدارة الدروس"
            />

            <QuickAction
              href="/admin/quizzes"
              icon="📝"
              title="إدارة الاختبارات"
            />

            <QuickAction
              href="/admin/students"
              icon="👥"
              title="إدارة الطلاب"
            />

            <QuickAction
              href="/admin/achievements"
              icon="🏆"
              title="إدارة الإنجازات"
            />

            <QuickAction
              href="/admin/stats"
              icon="📊"
              title="الإحصائيات"
            />

            <QuickAction
              href="/admin/settings"
              icon="⚙️"
              title="إعدادات المنصة"
            />
          </div>
        </section>

        {/* RECENT STUDENTS */}
        <section className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-cyan-400/[0.06] to-transparent p-5">
            <div>
              <h2 className="font-bold text-white">
                👥 آخر الطلاب المسجلين
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أحدث الحسابات في المنصة
              </p>
            </div>

            <Link
              href="/admin/students"
              className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              كل الطلاب ←
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl">👥</div>

              <p className="mt-3 text-sm text-slate-500">
                لا يوجد طلاب مسجلون حاليًا.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/admin/students/${student.id}`}
                  className="flex items-center justify-between gap-4 p-5 transition hover:bg-cyan-400/[0.025]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/10 text-lg">
                      👤
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {student.first_name ||
                        student.last_name
                          ? `${student.first_name ?? ""} ${
                              student.last_name ?? ""
                            }`.trim()
                          : "طالب بدون اسم"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {student.maris_id ?? "بدون MARIS ID"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="text-xs text-slate-500">
                      التسجيل
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-300">
                      {new Date(
                        student.created_at
                      ).toLocaleDateString("ar-DZ")}
                    </p>
                  </div>

                  <span className="text-cyan-400">
                    ←
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  href,
  accent,
}: {
  icon: string;
  title: string;
  value: number;
  href: string;
  accent:
    | "cyan"
    | "blue"
    | "emerald"
    | "violet"
    | "sky"
    | "amber";
}) {
  const styles = {
    cyan: {
      border: "border-cyan-400/10 hover:border-cyan-400/25",
      icon: "bg-cyan-400/10",
      value: "text-cyan-300",
    },
    blue: {
      border: "border-blue-400/10 hover:border-blue-400/25",
      icon: "bg-blue-400/10",
      value: "text-blue-300",
    },
    emerald: {
      border: "border-emerald-400/10 hover:border-emerald-400/25",
      icon: "bg-emerald-400/10",
      value: "text-emerald-300",
    },
    violet: {
      border: "border-violet-400/10 hover:border-violet-400/25",
      icon: "bg-violet-400/10",
      value: "text-violet-300",
    },
    sky: {
      border: "border-sky-400/10 hover:border-sky-400/25",
      icon: "bg-sky-400/10",
      value: "text-sky-300",
    },
    amber: {
      border: "border-amber-400/10 hover:border-amber-400/25",
      icon: "bg-amber-400/10",
      value: "text-amber-300",
    },
  };

  const style = styles[accent];

  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10 transition hover:bg-[#08283d]/80 ${style.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${style.value}`}
          >
            {value}
          </p>

          <p className="mt-2 text-[11px] text-slate-600 transition group-hover:text-slate-400">
            فتح القسم ←
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-cyan-400/15 hover:bg-cyan-400/[0.05]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-lg">
        {icon}
      </div>

      <span className="text-sm font-semibold text-slate-300 transition group-hover:text-white">
        {title}
      </span>

      <span className="mr-auto text-xs text-slate-600">
        ←
      </span>
    </Link>
  );
}


