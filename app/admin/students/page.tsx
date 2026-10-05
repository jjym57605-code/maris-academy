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
  created_at: string;
  is_admin: boolean;
  is_super_admin: boolean;
  total_xp: number | null;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [demotingId, setDemotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");

  async function loadStudents(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`خطأ في Session: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error("انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.");
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) {
        throw new Error(
          `تعذر التحقق من صلاحيات الأدمن: ${adminError.message}`
        );
      }

      if (!isAdmin) {
        throw new Error("ليس لديك صلاحية للوصول إلى هذه الصفحة.");
      }

      const { data, error: studentsError } = await supabase.rpc(
        "get_admin_students"
      );

      if (studentsError) {
        throw new Error(`تعذر تحميل الطلاب: ${studentsError.message}`);
      }

      setStudents((data ?? []) as Student[]);
    } catch (err) {
      console.error("LOAD STUDENTS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الطلاب."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function handlePromoteStudent(student: Student) {
    if (promotingId || demotingId || deletingId) return;

    if (student.is_admin) {
      window.alert("هذا الحساب Admin بالفعل.");
      return;
    }

    if (!student.maris_id) {
      window.alert("هذا الطالب لا يملك MARIS ID.");
      return;
    }

    const fullName =
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
      "هذا الطالب";

    const confirmed = window.confirm(
      `هل أنت متأكد من ترقية ${fullName} إلى Admin؟\n\nMARIS ID: ${student.maris_id}\n\nسيحصل هذا الحساب على صلاحيات الإدارة في المنصة.`
    );

    if (!confirmed) return;

    try {
      setPromotingId(student.id);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`خطأ في Session: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error(
          "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى."
        );
      }

      const response = await fetch("/api/admin/promote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maris_id: student.maris_id,
        }),
      });

      let result: {
        success?: boolean;
        message?: string;
        error?: string;
      } = {};

      try {
        result = await response.json();
      } catch {
        // API may return an empty response
      }

      console.error("PROMOTE API RESPONSE:", {
        status: response.status,
        statusText: response.statusText,
        result,
      });

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر ترقية الطالب. HTTP ${response.status}`
        );
      }

      setStudents((currentStudents) =>
        currentStudents.map((currentStudent) =>
          currentStudent.id === student.id
            ? {
                ...currentStudent,
                is_admin: true,
                is_super_admin: false,
              }
            : currentStudent
        )
      );

      window.alert(`تمت ترقية ${fullName} إلى Admin بنجاح.`);
    } catch (err) {
      console.error("PROMOTE STUDENT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء ترقية الطالب."
      );
    } finally {
      setPromotingId(null);
    }
  }

  async function handleDemoteStudent(student: Student) {
    if (promotingId || demotingId || deletingId) return;

    if (!student.is_admin) {
      window.alert("هذا الحساب ليس Admin.");
      return;
    }

    if (student.is_super_admin) {
      window.alert("هذا Admin أساسي ومحمي ولا يمكن إزالة صلاحياته.");
      return;
    }

    const fullName =
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
      "هذا الـAdmin";

    const confirmed = window.confirm(
      `هل أنت متأكد من إزالة صلاحيات Admin من ${fullName}؟\n\nMARIS ID: ${
        student.maris_id ?? "غير موجود"
      }\n\nسيعود الحساب إلى طالب عادي ولن يستطيع الوصول إلى لوحة الإدارة.`
    );

    if (!confirmed) return;

    try {
      setDemotingId(student.id);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`خطأ في Session: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error(
          "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى."
        );
      }

      if (session.user.id === student.id) {
        window.alert("لا يمكنك إزالة صلاحيات Admin من حسابك الحالي.");
        return;
      }

      if (!student.maris_id) {
        throw new Error("هذا الـAdmin لا يملك MARIS ID.");
      }

      const response = await fetch("/api/admin/demote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maris_id: student.maris_id,
        }),
      });

      let result: {
        success?: boolean;
        message?: string;
        error?: string;
      } = {};

      try {
        result = await response.json();
      } catch {
        // API may return an empty response
      }

      console.error("DEMOTE API RESPONSE:", {
        status: response.status,
        statusText: response.statusText,
        result,
      });

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر إزالة صلاحيات Admin. HTTP ${response.status}`
        );
      }

      setStudents((currentStudents) =>
        currentStudents.map((currentStudent) =>
          currentStudent.id === student.id
            ? {
                ...currentStudent,
                is_admin: false,
                is_super_admin: false,
              }
            : currentStudent
        )
      );

      window.alert(
        `تمت إزالة صلاحيات Admin من ${fullName} بنجاح.`
      );
    } catch (err) {
      console.error("DEMOTE STUDENT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إزالة صلاحيات Admin."
      );
    } finally {
      setDemotingId(null);
    }
  }

  async function handleDeleteStudent(student: Student) {
    if (deletingId || promotingId || demotingId) return;

    if (student.is_admin) {
      window.alert("لا يمكن حذف حساب Admin من هنا.");
      return;
    }

    const fullName =
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
      "هذا الطالب";

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${fullName}؟\n\nسيتم حذف الحساب نهائياً من المنصة وجميع بياناته المرتبطة به. لا يمكن التراجع عن هذه العملية.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(student.id);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `خطأ في Session: ${sessionError.message}`
        );
      }

      if (!session) {
        throw new Error(
          "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى."
        );
      }

      if (session.user.id === student.id) {
        window.alert("لا يمكنك حذف حساب الأدمن الحالي.");
        return;
      }

      const response = await fetch(
        `/api/admin/students/${student.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      let result: {
        success?: boolean;
        message?: string;
        error?: string;
      } = {};

      try {
        result = await response.json();
      } catch {
        // API may return an empty response
      }

      console.error("DELETE API RESPONSE:", {
        status: response.status,
        statusText: response.statusText,
        result,
      });

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر حذف الطالب. HTTP ${response.status}`
        );
      }

      setStudents((currentStudents) =>
        currentStudents.filter(
          (currentStudent) => currentStudent.id !== student.id
        )
      );
    } catch (err) {
      console.error("DELETE STUDENT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حذف الطالب."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const streams = useMemo(() => {
    const uniqueStreams = new Set<string>();

    students.forEach((student) => {
      if (student.stream) {
        uniqueStreams.add(student.stream);
      }
    });

    return Array.from(uniqueStreams).sort((a, b) =>
      a.localeCompare(b, "ar")
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName =
        `${student.first_name ?? ""} ${student.last_name ?? ""}`.toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        (student.maris_id ?? "").toLowerCase().includes(query);

      const matchesStream =
        streamFilter === "all" ||
        (student.stream ?? "") === streamFilter;

      return matchesSearch && matchesStream;
    });
  }, [students, search, streamFilter]);

  const totalStudents = students.length;

  const adminCount = students.filter(
    (student) => student.is_admin
  ).length;

  const normalStudentsCount = totalStudents - adminCount;

  function formatDate(dateString: string) {
    try {
      return new Intl.DateTimeFormat("ar-DZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(dateString));
    } catch {
      return "—";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-card rounded-3xl p-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />

            <p className="text-sm font-semibold text-foam/60">
              جاري تحميل قائمة الطلاب...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300">
              👥 إدارة الطلاب
            </div>

            <h1 className="page-title">
              جميع الطلاب
            </h1>

            <p className="mt-2 text-sm text-foam/60">
              إدارة حسابات طلاب MARIS ACADEMY ومتابعة معلوماتهم.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-foam/80 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
            >
              ← لوحة الإدارة
            </Link>

            <button
              type="button"
              onClick={() => loadStudents(true)}
              disabled={
                refreshing ||
                !!deletingId ||
                !!promotingId ||
                !!demotingId
              }
              className="btn-primary"
            >
              {refreshing ? "جاري التحديث..." : "↻ تحديث"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-5 text-red-300">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>

              <div className="flex-1">
                <h2 className="font-black text-red-200">
                  حدث خطأ
                </h2>

                <p className="mt-1 text-sm font-semibold text-red-300/80">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => loadStudents(true)}
                  className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400/20"
                >
                  المحاولة مرة أخرى
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon="👥"
            title="إجمالي الحسابات"
            value={totalStudents}
            description="جميع الحسابات المسجلة"
          />

          <StatCard
            icon="🎓"
            title="الطلاب"
            value={normalStudentsCount}
            description="الحسابات العادية"
          />

          <StatCard
            icon="👑"
            title="Admins"
            value={adminCount}
            description="حسابات الإدارة"
          />
        </div>

        {/* Filters */}
        <div className="glass-card rounded-3xl p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-black text-foam/80">
                البحث
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو MARIS ID..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-foam outline-none transition placeholder:text-foam/30 focus:border-cyan-400/40 focus:bg-white/10 focus:ring-4 focus:ring-cyan-400/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-foam/80">
                الشعبة
              </label>

              <select
                value={streamFilter}
                onChange={(event) => setStreamFilter(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-foam outline-none transition focus:border-cyan-400/40 focus:bg-white/10 focus:ring-4 focus:ring-cyan-400/10"
              >
                <option value="all">كل الشعب</option>

                {streams.map((stream) => (
                  <option key={stream} value={stream}>
                    {stream}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-xs font-bold text-foam/40">
            عرض {filteredStudents.length} من أصل {students.length} حساب
          </div>
        </div>

        {/* Desktop Table */}
        <div className="glass-card hidden overflow-hidden rounded-3xl md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-right">
                  <th className="px-5 py-4 text-xs font-black text-foam/50">
                    الطالب
                  </th>

                  <th className="px-5 py-4 text-xs font-black text-foam/50">
                    الشعبة
                  </th>

                  <th className="px-5 py-4 text-xs font-black text-foam/50">
                    XP
                  </th>

                  <th className="px-5 py-4 text-xs font-black text-foam/50">
                    التسجيل
                  </th>

                  <th className="px-5 py-4 text-xs font-black text-foam/50">
                    الإجراء
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const fullName =
                    `${student.first_name ?? ""} ${
                      student.last_name ?? ""
                    }`.trim() || "بدون اسم";

                  const isDeleting = deletingId === student.id;
                  const isPromoting = promotingId === student.id;
                  const isDemoting = demotingId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-white/5 last:border-0 transition hover:bg-cyan-400/5"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-lg font-black text-cyan-300">
                            {(student.first_name?.[0] ?? "M").toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-black text-foam">
                              {fullName}
                            </div>

                            <div className="mt-1 text-xs font-bold text-foam/40">
                              {student.maris_id ?? "بدون MARIS ID"}
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <span className="badge">
                          {student.stream ?? "غير محدد"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-black text-cyan-300">
                          {student.total_xp ?? 0} XP
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-foam/50">
                          {formatDate(student.created_at)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/20"
                          >
                            عرض
                          </Link>

                          {student.is_super_admin ? (
                            <span className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-300">
                              🔒 Admin أساسي
                            </span>
                          ) : student.is_admin ? (
                            <button
                              type="button"
                              disabled={
                                !!deletingId ||
                                !!promotingId ||
                                !!demotingId
                              }
                              onClick={() =>
                                handleDemoteStudent(student)
                              }
                              className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDemoting
                                ? "جاري الإزالة..."
                                : "🔻 إزالة Admin"}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={
                                  !!deletingId ||
                                  !!promotingId ||
                                  !!demotingId
                                }
                                onClick={() =>
                                  handlePromoteStudent(student)
                                }
                                className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isPromoting
                                  ? "جاري الترقية..."
                                  : "👑 ترقية"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  !!deletingId ||
                                  !!promotingId ||
                                  !!demotingId
                                }
                                onClick={() =>
                                  handleDeleteStudent(student)
                                }
                                className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting
                                  ? "جاري الحذف..."
                                  : "🗑️ حذف"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden">
          {filteredStudents.map((student) => {
            const fullName =
              `${student.first_name ?? ""} ${
                student.last_name ?? ""
              }`.trim() || "بدون اسم";

            const isDeleting = deletingId === student.id;
            const isPromoting = promotingId === student.id;
            const isDemoting = demotingId === student.id;

            return (
              <div
                key={student.id}
                className="glass-card rounded-3xl p-4"
              >
                <Link
                  href={`/admin/students/${student.id}`}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-lg font-black text-cyan-300">
                    {(student.first_name?.[0] ?? "M").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black text-foam">
                      {fullName}
                    </div>

                    <div className="mt-1 text-xs font-bold text-foam/40">
                      {student.maris_id ?? "بدون MARIS ID"}
                    </div>
                  </div>

                  <span className="text-foam/20">←</span>
                </Link>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <div className="font-bold text-foam/40">
                      الشعبة
                    </div>

                    <div className="mt-1 font-black text-foam/80">
                      {student.stream ?? "غير محدد"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <div className="font-bold text-foam/40">
                      XP
                    </div>

                    <div className="mt-1 font-black text-cyan-300">
                      {student.total_xp ?? 0}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foam/40">
                    {formatDate(student.created_at)}
                  </span>

                  {student.is_super_admin ? (
                    <span className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-300">
                      🔒 Admin أساسي
                    </span>
                  ) : student.is_admin ? (
                    <button
                      type="button"
                      disabled={
                        !!deletingId ||
                        !!promotingId ||
                        !!demotingId
                      }
                      onClick={() =>
                        handleDemoteStudent(student)
                      }
                      className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDemoting
                        ? "جاري الإزالة..."
                        : "🔻 إزالة Admin"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          !!deletingId ||
                          !!promotingId ||
                          !!demotingId
                        }
                        onClick={() =>
                          handlePromoteStudent(student)
                        }
                        className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPromoting
                          ? "جاري الترقية..."
                          : "👑 ترقية"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          !!deletingId ||
                          !!promotingId ||
                          !!demotingId
                        }
                        onClick={() =>
                          handleDeleteStudent(student)
                        }
                        className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting
                          ? "جاري الحذف..."
                          : "🗑️ حذف"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="glass-card rounded-3xl p-10 text-center">
            <div className="text-4xl">🔎</div>

            <h2 className="mt-3 font-black text-foam">
              لا توجد نتائج
            </h2>

            <p className="mt-1 text-sm font-semibold text-foam/40">
              جرّب تغيير كلمات البحث أو الفلتر.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <div className="flex gap-3">
            <span className="text-xl">ℹ️</span>

            <div>
              <h3 className="font-black text-foam">
                ملاحظة مهمة
              </h3>

              <p className="mt-1 text-sm font-semibold leading-6 text-foam/60">
                حذف الطالب عملية نهائية. حسابات Admin الأساسية محمية
                ولا يمكن إزالة صلاحياتها أو حذفها من هذه الصفحة.
                يمكن إزالة صلاحيات Admin من الحسابات الثانوية فقط،
                وبعدها يعود الحساب إلى طالب عادي.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="glass-card rounded-3xl p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-foam/40">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-foam">
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-foam/40">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}










