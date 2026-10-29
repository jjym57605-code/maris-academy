
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type ReviewStatus = "draft" | "pending" | "approved" | "rejected";
type Tab = "courses" | "reels";

type TeacherCourse = {
  id: string;
  teacher_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  is_published: boolean;
  review_status: ReviewStatus;
  created_at: string;
};

type TeacherReel = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  target_stream: string | null;
  is_published: boolean;
  review_status: ReviewStatus;
  admin_note: string | null;
  created_at: string;
};

type TeacherProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default function AdminTeacherCoursesPage() {
  const [tab, setTab] = useState<Tab>("courses");
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [reels, setReels] = useState<TeacherReel[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data: admin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) throw adminError;

      if (!admin) {
        setError("ليس لديك صلاحية الوصول لهذه الصفحة.");
        setCourses([]);
        setReels([]);
        return;
      }

      const [coursesResult, reelsResult] = await Promise.all([
        supabase
          .from("courses")
          .select(
            "id, teacher_id, subject_id, title, description, thumbnail_url, is_free, price, is_published, review_status, created_at"
          )
          .not("teacher_id", "is", null)
          .eq("review_status", "pending")
          .order("created_at", { ascending: true }),

        supabase
          .from("reels")
          .select(
            "id, teacher_id, title, description, video_url, thumbnail_url, subject_id, target_stream, is_published, review_status, admin_note, created_at"
          )
          .not("teacher_id", "is", null)
          .eq("review_status", "pending")
          .order("created_at", { ascending: true }),
      ]);

      if (coursesResult.error) throw coursesResult.error;
      if (reelsResult.error) throw reelsResult.error;

      const courseRows = (coursesResult.data ?? []) as TeacherCourse[];
      const reelRows = (reelsResult.data ?? []) as TeacherReel[];

      setCourses(courseRows);
      setReels(reelRows);

      const teacherIds = [
        ...new Set([
          ...courseRows.map((item) => item.teacher_id),
          ...reelRows.map((item) => item.teacher_id),
        ]),
      ];

      if (teacherIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", teacherIds);

        if (profilesError) throw profilesError;

        const names: Record<string, string> = {};

        for (const profile of (profiles ?? []) as TeacherProfile[]) {
          names[profile.id] =
            [profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(" ") || "أستاذ";
        }

        setTeachers(names);
      } else {
        setTeachers({});
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل محتوى الأساتذة."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function reviewContent(
    kind: Tab,
    item: TeacherCourse | TeacherReel,
    decision: "approved" | "rejected"
  ) {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    const note = notes[item.id]?.trim() ?? "";

    if (decision === "rejected" && !note) {
      setError("اكتب سبب الرفض أولاً.");
      return;
    }

    const kindLabel = kind === "courses" ? "الدورة" : "الريل";
    const action = decision === "approved" ? "الموافقة على" : "رفض";

    if (!window.confirm(`هل تريد ${action} ${kindLabel} «${item.title}»؟`)) {
      return;
    }

    setBusyId(item.id);
    setError("");
    setSuccess("");

    try {
      const { data: admin, error: adminError } = await supabase.rpc(
        "is_current_user_admin"
      );

      if (adminError) throw adminError;
      if (!admin) throw new Error("ليس لديك صلاحية تنفيذ هذا الإجراء.");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) throw new Error("يلزم تسجيل الدخول مجدداً.");

      const updatePayload: Record<string, unknown> = {
        review_status: decision,
        is_published: decision === "approved",
        reviewed_by: authData.user.id,
        reviewed_at: new Date().toISOString(),
      };

      // ملاحظة الرفض محفوظة في الريلز فقط لأن العمود موجود في مخططها.
      // لا نفترض وجود admin_note في جدول الدورات.
      if (kind === "reels" && decision === "rejected") {
        updatePayload.admin_note = note;
      }

      const table = kind === "courses" ? "courses" : "reels";

      const { data: updatedRows, error: updateError } = await supabase
        .from(table)
        .update(updatePayload)
        .eq("id", item.id)
        .eq("teacher_id", item.teacher_id)
        .eq("review_status", "pending")
        .select("id");

      if (updateError) throw updateError;

      if (!updatedRows?.length) {
        throw new Error(
          "لم يتم تحديث المحتوى. تحقق من صلاحيات قاعدة البيانات ثم حدّث القائمة."
        );
      }

      if (kind === "courses") {
        setCourses((current) =>
          current.filter((course) => course.id !== item.id)
        );
      } else {
        setReels((current) =>
          current.filter((reel) => reel.id !== item.id)
        );
      }

      setNotes((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      setSuccess(
        decision === "approved"
          ? `تمت الموافقة على ${kindLabel}. تحقق من سياسات قاعدة البيانات وآلية عرض المحتوى للطلاب لضمان ظهوره لهم.`
          : `تم رفض ${kindLabel}${kind === "reels" ? " وحُفظ سبب الرفض" : ""}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحديث حالة المحتوى."
      );
    } finally {
      setBusyId("");
    }
  }

  const currentCount = tab === "courses" ? courses.length : reels.length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06111f] px-4 py-8 text-slate-100 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-cyan-400">
              MARIS ACADEMY ²⁰²⁷
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              مراجعة محتوى الأساتذة
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              راجع الدورات والريلزات قبل نشرها للطلاب.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/teachers"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              إدارة الأساتذة
            </Link>
            <Link
              href="/admin/courses"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              دورات المنصة
            </Link>
            <Link
              href="/admin/reels"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              ريلزات المنصة
            </Link>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              تحديث القائمة
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setTab("courses");
              setError("");
              setSuccess("");
            }}
            className={`rounded-2xl border p-5 text-right transition ${
              tab === "courses"
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-800 bg-[#0b1b2c] hover:border-slate-600"
            }`}
          >
            <span className="text-sm text-slate-400">دورات الأساتذة</span>
            <span className="mt-2 block text-3xl font-bold text-cyan-300">
              {courses.length}
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              دورات تنتظر المراجعة
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("reels");
              setError("");
              setSuccess("");
            }}
            className={`rounded-2xl border p-5 text-right transition ${
              tab === "reels"
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-800 bg-[#0b1b2c] hover:border-slate-600"
            }`}
          >
            <span className="text-sm text-slate-400">ريلزات الأساتذة</span>
            <span className="mt-2 block text-3xl font-bold text-cyan-300">
              {reels.length}
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              ريلزات تنتظر المراجعة
            </span>
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {tab === "courses" ? "مراجعة دورات الأساتذة" : "مراجعة ريلزات الأساتذة"}
          </h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
            {currentCount} قيد المراجعة
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            جارٍ تحميل محتوى الأساتذة...
          </div>
        ) : tab === "courses" ? (
          courses.length === 0 ? (
            <EmptyState text="لا توجد دورات تنتظر المراجعة حالياً." />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1b2c]"
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={`صورة دورة ${course.title}`}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-slate-900 text-slate-500">
                      لا توجد صورة للدورة
                    </div>
                  )}

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">{course.title}</h3>
                      <StatusBadge />
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {course.description || "لا يوجد وصف للدورة."}
                    </p>

                    <div className="grid gap-3 rounded-xl bg-slate-900/70 p-4 text-sm sm:grid-cols-2">
                      <Info label="الأستاذ" value={teachers[course.teacher_id] || "أستاذ"} />
                      <Info
                        label="نوع الدورة"
                        value={
                          course.is_free
                            ? "مجانية"
                            : `مدفوعة — ${course.price ?? 0}`
                        }
                      />
                      <Info
                        label="تاريخ الإرسال"
                        value={new Date(course.created_at).toLocaleDateString("ar-DZ")}
                      />
                      <Info label="معرّف الدورة" value={course.id} small />
                    </div>

                    <label className="block text-sm text-slate-300">
                      سبب الرفض
                      <textarea
                        value={notes[course.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [course.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="اكتب سبب الرفض..."
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-[#06111f] p-3 text-sm outline-none focus:border-cyan-500"
                      />
                    </label>

                    <ReviewButtons
                      busy={busyId === course.id}
                      onApprove={() => void reviewContent("courses", course, "approved")}
                      onReject={() => void reviewContent("courses", course, "rejected")}
                      label="الدورة"
                    />
                  </div>
                </article>
              ))}
            </div>
          )
        ) : reels.length === 0 ? (
          <EmptyState text="لا توجد ريلزات تنتظر المراجعة حالياً." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {reels.map((reel) => (
              <article
                key={reel.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1b2c]"
              >
                {reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail_url}
                    alt={`صورة ريل ${reel.title}`}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-slate-900 text-slate-500">
                    ريل أرسله الأستاذ للمراجعة
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{reel.title}</h3>
                    <StatusBadge />
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {reel.description || "لا يوجد وصف للريل."}
                  </p>

                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
                    <video
                      src={reel.video_url}
                      controls
                      preload="metadata"
                      playsInline
                      className="max-h-[480px] w-full"
                    >
                      المتصفح لا يدعم تشغيل الفيديو.
                    </video>
                  </div>

                  <a
                    href={reel.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-cyan-300 underline"
                  >
                    فتح الفيديو في نافذة جديدة
                  </a>

                  <div className="grid gap-3 rounded-xl bg-slate-900/70 p-4 text-sm sm:grid-cols-2">
                    <Info label="الأستاذ" value={teachers[reel.teacher_id] || "أستاذ"} />
                    <Info label="الشعبة المستهدفة" value={reel.target_stream || "كل الشعب"} />
                    <Info
                      label="تاريخ الإرسال"
                      value={new Date(reel.created_at).toLocaleDateString("ar-DZ")}
                    />
                    <Info label="معرّف الريل" value={reel.id} small />
                  </div>

                  {reel.admin_note && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                      الملاحظة السابقة: {reel.admin_note}
                    </div>
                  )}

                  <label className="block text-sm text-slate-300">
                    سبب الرفض
                    <textarea
                      value={notes[reel.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [reel.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="اكتب سبب الرفض ليظهر للأستاذ..."
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-[#06111f] p-3 text-sm outline-none focus:border-cyan-500"
                    />
                  </label>

                  <ReviewButtons
                    busy={busyId === reel.id}
                    onApprove={() => void reviewContent("reels", reel, "approved")}
                    onReject={() => void reviewContent("reels", reel, "rejected")}
                    label="الريل"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b1b2c] px-5 py-16 text-center">
      <h3 className="text-lg font-semibold">{text}</h3>
      <p className="mt-2 text-sm text-slate-400">
        سيظهر هنا المحتوى الذي يرسله الأساتذة للمراجعة.
      </p>
    </div>
  );
}

function StatusBadge() {
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
      ينتظر المراجعة
    </span>
  );
}

function Info({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="text-slate-500">{label}</span>
      <p className={`mt-1 break-words font-medium ${small ? "text-xs text-slate-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ReviewButtons({
  busy,
  onApprove,
  onReject,
  label,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onApprove}
        disabled={busy}
        className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {busy ? "جارٍ المعالجة..." : `الموافقة على ${label} والنشر`}
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={busy}
        className="flex-1 rounded-xl border border-red-500/40 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        رفض {label}
      </button>
    </div>
  );
}
