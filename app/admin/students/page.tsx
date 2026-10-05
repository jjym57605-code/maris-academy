"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string | null;
  is_admin: boolean | null;
  total_xp: number | null;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const {
        data: adminCheck,
        error: adminError,
      } = await supabase.rpc("is_current_user_admin");

      if (adminError) {
        throw adminError;
      }

      if (!adminCheck) {
        throw new Error(
          "ليس لديك صلاحية الوصول إلى لوحة الطلاب."
        );
      }

      const { data, error: studentsError } =
        await supabase.rpc("get_admin_students");

      if (studentsError) {
        throw studentsError;
      }

      setStudents((data ?? []) as Student[]);
    } catch (err) {
      console.error("ADMIN STUDENTS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الطلاب."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const fullName =
        `${student.first_name ?? ""} ${
          student.last_name ?? ""
        }`.trim();

      return (
        fullName.toLowerCase().includes(query) ||
        (student.maris_id ?? "")
          .toLowerCase()
          .includes(query) ||
        (student.stream ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [students, search]);

  const totalStudents = students.length;

  const adminCount = students.filter(
    (student) => student.is_admin
  ).length;

  const normalStudents = totalStudents - adminCount;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            ← العودة إلى لوحة الإدارة
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                👥 STUDENTS
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                إدارة الطلاب
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                عرض ومتابعة حسابات طلاب MARIS ACADEMY.
              </p>
            </div>

            <button
              onClick={loadStudents}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              ↻ تحديث البيانات
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon="👥"
            label="إجمالي الحسابات"
            value={totalStudents}
          />

          <StatCard
            icon="🎓"
            label="حسابات الطلاب"
            value={normalStudents}
          />

          <StatCard
            icon="👑"
            label="المشرفون"
            value={adminCount}
          />
        </div>

        {/* Search */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="relative">
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ابحث بالاسم أو MARIS ID أو الشعبة..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-12 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
            <div className="text-3xl">⚠️</div>

            <h2 className="mt-3 text-xl font-semibold text-red-300">
              تعذر تحميل الطلاب
            </h2>

            <p className="mt-2 text-sm text-red-200/80">
              {error}
            </p>

            <button
              onClick={loadStudents}
              className="mt-5 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/30"
            >
              المحاولة مرة أخرى
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredStudents.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-14 text-center">
              <div className="text-4xl">📭</div>

              <h2 className="mt-4 text-lg font-semibold">
                لا توجد نتائج
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "لم نجد طالبًا يطابق البحث."
                  : "لا يوجد طلاب مسجلون حاليًا."}
              </p>
            </div>
          )}

        {/* Students */}
        {!loading &&
          !error &&
          filteredStudents.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:block">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.03] px-6 py-4 text-xs font-medium text-slate-500">
                  <div>الطالب</div>
                  <div>الشعبة</div>
                  <div>XP</div>
                  <div>التسجيل</div>
                </div>

                <div className="divide-y divide-white/5">
                  {filteredStudents.map((student) => {
                    const fullName =
                      `${student.first_name ?? ""} ${
                        student.last_name ?? ""
                      }`.trim() ||
                      "طالب بدون اسم";

                    const xp =
                      Number(student.total_xp ?? 0);

                    return (
                      <Link
                        key={student.id}
                        href={`/admin/students/${student.id}`}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-6 py-4 transition hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-lg">
                            👤
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {fullName}
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-xs text-cyan-300">
                                {student.maris_id ??
                                  "بدون ID"}
                              </span>

                              {student.is_admin && (
                                <span className="text-xs text-purple-300">
                                  👑
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-slate-400">
                          {student.stream ??
                            "غير محددة"}
                        </div>

                        <div className="font-semibold text-amber-300">
                          ⚡ {xp}
                        </div>

                        <div className="text-sm text-slate-500">
                          {formatDate(
                            student.created_at
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Mobile */}
              <div className="space-y-3 md:hidden">
                {filteredStudents.map((student) => {
                  const fullName =
                    `${student.first_name ?? ""} ${
                      student.last_name ?? ""
                    }`.trim() ||
                    "طالب بدون اسم";

                  const xp =
                    Number(student.total_xp ?? 0);

                  return (
                    <Link
                      key={student.id}
                      href={`/admin/students/${student.id}`}
                      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xl">
                            👤
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">
                              {fullName}
                            </h3>

                            <p className="mt-1 font-mono text-xs text-cyan-300">
                              {student.maris_id ??
                                "بدون MARIS ID"}
                            </p>
                          </div>
                        </div>

                        {student.is_admin && (
                          <span className="shrink-0 rounded-lg bg-purple-400/10 px-2 py-1 text-xs text-purple-300">
                            👑 Admin
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="الشعبة"
                          value={
                            student.stream ??
                            "غير محددة"
                          }
                        />

                        <InfoBox
                          label="XP"
                          value={`⚡ ${xp}`}
                        />

                        <InfoBox
                          label="التسجيل"
                          value={formatDate(
                            student.created_at
                          )}
                        />

                        <InfoBox
                          label="الحساب"
                          value={
                            student.is_admin
                              ? "مشرف"
                              : "طالب"
                          }
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
      </div>
    </main>
  );
}

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>

        <span className="text-xs text-slate-600">
          MARIS
        </span>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-white">
          {value}
        </div>

        <div className="mt-1 text-sm text-slate-400">
          {label}
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className="text-[11px] text-slate-600">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-medium text-slate-300">
        {value}
      </div>
    </div>
  );
}
