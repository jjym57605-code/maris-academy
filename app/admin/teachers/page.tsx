
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type ApplicationStatus = "pending" | "approved" | "rejected";

type TeacherApplication = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  stream: string;
  bio: string;
  cv_path: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "all" | ApplicationStatus;

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  rejected: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fullName(application: TeacherApplication) {
  return `${application.first_name} ${application.last_name}`.trim();
}

export default function AdminTeachersPage() {
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cvLoadingId, setCvLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const loadApplications = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      setNotice(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`تعذر التحقق من جلسة الدخول: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error("انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد.");
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) {
        throw new Error(`تعذر التحقق من صلاحيات الأدمن: ${adminError.message}`);
      }

      if (isAdmin !== true) {
        throw new Error("ليس لديك صلاحية الوصول إلى هذه الصفحة.");
      }

      const { data, error: queryError } = await supabase
        .from("teacher_applications")
        .select(
          "id, first_name, last_name, email, subject, stream, bio, cv_path, status, reviewed_by, reviewed_at, admin_note, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (queryError) {
        throw new Error(`تعذر تحميل طلبات الأساتذة: ${queryError.message}`);
      }

      setApplications((data ?? []) as TeacherApplication[]);
    } catch (err) {
      console.error("LOAD TEACHER APPLICATIONS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل طلبات الأساتذة."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function handleViewCv(application: TeacherApplication) {
    if (cvLoadingId) return;

    if (!application.cv_path) {
      setError("هذا الطلب ما فيهش سيرة ذاتية مرفقة.");
      return;
    }

    try {
      setCvLoadingId(application.id);
      setError(null);
      setNotice(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`تعذر التحقق من جلسة الدخول: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error("يرجى تسجيل الدخول من جديد.");
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) {
        throw new Error(`تعذر التحقق من صلاحيات الأدمن: ${adminError.message}`);
      }

      if (isAdmin !== true) {
        throw new Error("ليس لديك صلاحية عرض السير الذاتية.");
      }

      // تحقق إضافي: يجب أن يكون الملف داخل مجلد صاحب الطلب.
      const expectedPrefix = `${application.id}/`;

      if (!application.cv_path.startsWith(expectedPrefix)) {
        throw new Error("مسار السيرة الذاتية غير صالح.");
      }

      const { data, error: signedUrlError } = await supabase.storage
        .from("teacher-cvs")
        .createSignedUrl(application.cv_path, 60);

      if (signedUrlError) {
        throw new Error(
          `تعذر فتح السيرة الذاتية: ${signedUrlError.message}`
        );
      }

      if (!data?.signedUrl) {
        throw new Error("لم يتم إنشاء رابط صالح للسيرة الذاتية.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("VIEW TEACHER CV ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء فتح السيرة الذاتية."
      );
    } finally {
      setCvLoadingId(null);
    }
  }

  async function handleReview(
    application: TeacherApplication,
    nextStatus: "approved" | "rejected"
  ) {
    if (processingId) return;

    if (application.status !== "pending") {
      setError("تمت مراجعة هذا الطلب من قبل.");
      return;
    }

    const name = fullName(application);

    if (nextStatus === "approved") {
      const confirmed = window.confirm(
        `هل أنت متأكد من قبول طلب الأستاذ ${name}؟\n\nقبول الطلب لا يمنح صلاحيات النشر تلقائيًا.`
      );

      if (!confirmed) return;
    }

    let adminNote: string | null = null;

    if (nextStatus === "rejected") {
      const note = window.prompt(
        `اكتب سبب رفض طلب ${name} (اختياري):`,
        ""
      );

      if (note === null) return;

      adminNote = note.trim() || null;

      const confirmed = window.confirm(
        `هل أنت متأكد من رفض طلب الأستاذ ${name}؟`
      );

      if (!confirmed) return;
    }

    try {
      setProcessingId(application.id);
      setError(null);
      setNotice(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`تعذر التحقق من جلسة الدخول: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error("يرجى تسجيل الدخول من جديد.");
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) {
        throw new Error(`تعذر التحقق من صلاحيات الأدمن: ${adminError.message}`);
      }

      if (isAdmin !== true) {
        throw new Error("ليس لديك صلاحية مراجعة الطلبات.");
      }

      const { data: updatedApplication, error: updateError } = await supabase
        .from("teacher_applications")
        .update({
          status: nextStatus,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          admin_note: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`تعذر تحديث الطلب: ${updateError.message}`);
      }

      if (!updatedApplication) {
        throw new Error(
          "لم يتغير الطلب. ربما تمت مراجعته من طرف مسؤول آخر؛ حدّث القائمة وحاول مجددًا."
        );
      }

      setNotice(
        nextStatus === "approved"
          ? "تم قبول طلب الأستاذ بنجاح."
          : "تم رفض طلب الأستاذ وتسجيل المراجعة."
      );

      await loadApplications(true);
    } catch (err) {
      console.error("REVIEW TEACHER APPLICATION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء مراجعة الطلب."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const filteredApplications = applications.filter((application) => {
    const matchesStatus =
      statusFilter === "all" || application.status === statusFilter;

    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      fullName(application).toLowerCase().includes(searchText) ||
      application.email.toLowerCase().includes(searchText) ||
      application.subject.toLowerCase().includes(searchText) ||
      application.stream.toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = applications.filter(
    (application) => application.status === "pending"
  ).length;

  const approvedCount = applications.filter(
    (application) => application.status === "approved"
  ).length;

  const rejectedCount = applications.filter(
    (application) => application.status === "rejected"
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-navy-950 px-4 py-8 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              <span aria-hidden>→</span>
              العودة إلى لوحة الإدارة
            </Link>

            <h1 className="text-2xl font-black sm:text-3xl">
              طلبات الأساتذة
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              مراجعة طلبات الانضمام إلى فريق MARIS ACADEMY.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadApplications(true)}
            disabled={loading || refreshing}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "جارٍ التحديث..." : "تحديث الطلبات ↻"}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "قيد المراجعة",
              count: pendingCount,
              color: "text-amber-300",
            },
            {
              label: "الطلبات المقبولة",
              count: approvedCount,
              color: "text-emerald-300",
            },
            {
              label: "الطلبات المرفوضة",
              count: rejectedCount,
              color: "text-rose-300",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className={`mt-2 text-3xl font-black ${item.color}`}>
                {item.count}
              </p>
            </div>
          ))}
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-7 text-rose-200"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-200"
          >
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو البريد أو المادة أو الشعبة..."
            className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
          >
            <option value="pending">قيد المراجعة</option>
            <option value="approved">المقبولة</option>
            <option value="rejected">المرفوضة</option>
            <option value="all">جميع الطلبات</option>
          </select>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
            جارٍ تحميل طلبات الأساتذة...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="font-bold text-slate-200">ما كاين حتى طلب هنا</p>
            <p className="mt-2 text-sm text-slate-400">
              جرّب تغيير حالة الطلب أو عبارة البحث.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <article
                key={application.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black">
                        {fullName(application) || "أستاذ بدون اسم"}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[application.status]}`}
                      >
                        {STATUS_LABELS[application.status]}
                      </span>
                    </div>

                    <a
                      href={`mailto:${application.email}`}
                      className="mt-2 inline-block break-all text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      {application.email}
                    </a>
                  </div>

                  <p className="shrink-0 text-xs text-slate-500">
                    تاريخ الطلب: {formatDate(application.created_at)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-xs text-slate-500">المادة</p>
                    <p className="mt-2 font-bold text-slate-200">
                      {application.subject}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-xs text-slate-500">الشعبة</p>
                    <p className="mt-2 font-bold text-slate-200">
                      {application.stream}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-300">
                    نبذة عن الأستاذ
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
                    {application.bio}
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                  <p className="text-sm font-bold text-slate-200">
                    السيرة الذاتية (CV)
                  </p>

                  {application.cv_path ? (
                    <>
                      <p className="mt-2 text-xs leading-6 text-slate-400">
                        ملف PDF محفوظ في مساحة خاصة. الرابط صالح لمدة دقيقة واحدة.
                      </p>

                      <button
                        type="button"
                        onClick={() => void handleViewCv(application)}
                        disabled={cvLoadingId !== null}
                        className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cvLoadingId === application.id
                          ? "جارٍ فتح السيرة الذاتية..."
                          : "📄 عرض السيرة الذاتية (PDF)"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-amber-300">
                      لا توجد سيرة ذاتية مرفقة بهذا الطلب.
                    </p>
                  )}
                </div>

                {application.status !== "pending" && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                    <p className="text-slate-400">
                      تاريخ المراجعة:{" "}
                      <span className="text-slate-200">
                        {application.reviewed_at
                          ? formatDate(application.reviewed_at)
                          : "غير متوفر"}
                      </span>
                    </p>

                    {application.admin_note && (
                      <p className="mt-2 leading-7 text-slate-400">
                        ملاحظة الإدارة:{" "}
                        <span className="text-slate-200">
                          {application.admin_note}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {application.status === "pending" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        void handleReview(application, "approved")
                      }
                      disabled={processingId !== null}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === application.id
                        ? "جارٍ المعالجة..."
                        : "✓ قبول الطلب"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleReview(application, "rejected")
                      }
                      disabled={processingId !== null}
                      className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      رفض الطلب
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="text-center text-xs leading-6 text-slate-500">
          قبول الطلب يسجل قرار الإدارة فقط. صلاحيات التدريس والنشر تحتاج إلى
          نظام موافقة وصلاحيات منفصل.
        </p>
      </div>
    </main>
  );
}
