
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Course = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  created_at: string;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  is_published: boolean;
  review_status: "draft" | "pending" | "approved" | "rejected";
};

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type Subject = {
  id: string;
  name: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  resources: unknown;
  order_index: number;
};

type ReviewCourse = Course & {
  teacher: Teacher | null;
  subject: Subject | null;
  lessons: Lesson[];
};

export default function AdminCourseReviewsPage() {
  const [courses, setCourses] = useState<ReviewCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        window.location.href = "/login";
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || isAdmin !== true) {
        window.location.href = "/dashboard";
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(
          "id, title, description, teacher_id, subject_id, created_at, thumbnail_url, is_free, price, is_published, review_status"
        )
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });

      if (courseError) {
        throw new Error(
          `تعذر تحميل الدورات المعلقة: ${courseError.message}`
        );
      }

      const pendingCourses = (courseData ?? []) as Course[];

      if (pendingCourses.length === 0) {
        setCourses([]);
        return;
      }

      const teacherIds = [
        ...new Set(
          pendingCourses
            .map((course) => course.teacher_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const subjectIds = [
        ...new Set(
          pendingCourses
            .map((course) => course.subject_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const courseIds = pendingCourses.map((course) => course.id);

      const [teachersResult, subjectsResult, lessonsResult] =
        await Promise.all([
          teacherIds.length
            ? supabase
                .from("teacher_applications")
                .select("id, first_name, last_name, email")
                .in("id", teacherIds)
            : Promise.resolve({ data: [], error: null }),

          subjectIds.length
            ? supabase
                .from("subjects")
                .select("id, name")
                .in("id", subjectIds)
            : Promise.resolve({ data: [], error: null }),

          supabase
            .from("lessons")
            .select(
              "id, course_id, title, content, video_url, resources, order_index"
            )
            .in("course_id", courseIds)
            .order("order_index", { ascending: true }),
        ]);

      if (teachersResult.error) {
        throw new Error(
          `تعذر تحميل معلومات الأساتذة: ${teachersResult.error.message}`
        );
      }

      if (subjectsResult.error) {
        throw new Error(
          `تعذر تحميل المواد: ${subjectsResult.error.message}`
        );
      }

      if (lessonsResult.error) {
        throw new Error(
          `تعذر تحميل الدروس: ${lessonsResult.error.message}`
        );
      }

      const teachers = (teachersResult.data ?? []) as Teacher[];
      const subjects = (subjectsResult.data ?? []) as Subject[];
      const lessons = (lessonsResult.data ?? []) as Lesson[];

      setCourses(
        pendingCourses.map((course) => ({
          ...course,
          teacher:
            teachers.find((teacher) => teacher.id === course.teacher_id) ??
            null,
          subject:
            subjects.find((subject) => subject.id === course.subject_id) ??
            null,
          lessons: lessons.filter(
            (lesson) => lesson.course_id === course.id
          ),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الدورات."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function handleReview(
    course: ReviewCourse,
    status: "approved" | "rejected"
  ) {
    if (processingId) return;

    const action = status === "approved" ? "قبول" : "رفض";

    const confirmed = window.confirm(
      `هل أنت متأكد من ${action} الدورة "${course.title}"؟${
        status === "approved"
          ? "\n\nستبقى الدورة غير منشورة حتى تنشرها من إدارة الدورات."
          : "\n\nسيتم رفض الدورة وإزالتها من قائمة المراجعة."
      }`
    );

    if (!confirmed) return;

    setProcessingId(course.id);
    setError("");
    setNotice("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("انتهت جلسة الدخول. يرجى تسجيل الدخول مجددًا.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || isAdmin !== true) {
        throw new Error("ليس لديك صلاحية مراجعة الدورات.");
      }

      const { data: updatedCourse, error: updateError } = await supabase
        .from("courses")
        .update({
          review_status: status,
          reviewed_by: user.id,
          is_published: false,
        })
        .eq("id", course.id)
        .eq("review_status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`تعذر تحديث الدورة: ${updateError.message}`);
      }

      if (!updatedCourse) {
        throw new Error(
          "لم يتم تحديث الدورة. ربما تمت مراجعتها من قبل؛ حدّث القائمة وحاول مجددًا."
        );
      }

      setCourses((current) =>
        current.filter((item) => item.id !== course.id)
      );

      setNotice(
        status === "approved"
          ? `تم قبول دورة "${course.title}" بنجاح. يمكنك نشرها لاحقًا من إدارة الدورات.`
          : `تم رفض دورة "${course.title}" بنجاح.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء مراجعة الدورة."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-cyan-400">
            MARIS ACADEMY ²⁰²⁷
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            مراجعة دورات الأساتذة
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            راجع محتوى الدورات قبل قبولها أو رفضها.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadCourses()}
            disabled={loading || processingId !== null}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            تحديث القائمة
          </button>

          <Link
            href="/admin/courses"
            className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            إدارة الدورات
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              الدورات قيد المراجعة
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              الدورات المعروضة هنا لم تُنشر للطلاب.
            </p>
          </div>

          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-sm font-bold text-amber-300">
            {courses.length} دورة
          </span>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-slate-400">
          جارٍ تحميل الدورات...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="text-4xl">📚</div>
          <h2 className="mt-4 text-xl font-black text-white">
            لا توجد دورات معلقة
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            ستظهر هنا الدورات التي يرسلها الأساتذة للمراجعة.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60"
            >
              <div className="border-b border-white/10 p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                      قيد المراجعة
                    </span>

                    <h2 className="mt-3 text-xl font-black text-white">
                      {course.title}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      الأستاذ:{" "}
                      <span className="font-bold text-slate-200">
                        {course.teacher
                          ? `${course.teacher.first_name} ${course.teacher.last_name}`.trim()
                          : "معلومات الأستاذ غير متوفرة"}
                      </span>
                    </p>

                    {course.teacher?.email && (
                      <p className="mt-1 text-sm text-slate-400">
                        البريد الإلكتروني: {course.teacher.email}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-slate-400">
                      المادة:{" "}
                      <span className="font-bold text-cyan-300">
                        {course.subject?.name ?? "غير محددة"}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      تاريخ الإرسال:{" "}
                      {new Intl.DateTimeFormat("ar-DZ", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(course.created_at))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">
                      {course.is_free
                        ? "مجانية"
                        : `مدفوعة — ${course.price ?? 0} دج`}
                    </span>
                    <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">
                      {course.lessons.length} درس
                    </span>
                  </div>
                </div>

                {course.description && (
                  <div className="mt-5 rounded-xl bg-black/20 p-4">
                    <h3 className="mb-2 text-sm font-bold text-slate-300">
                      وصف الدورة
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-400">
                      {course.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="mb-4 text-lg font-black text-white">
                  محتوى الدورة
                </h3>

                {course.lessons.length === 0 ? (
                  <p className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">
                    لا توجد دروس في هذه الدورة.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-4"
                      >
                        <p className="text-xs font-bold text-cyan-400">
                          الدرس {index + 1}
                        </p>

                        <h4 className="mt-2 font-bold text-white">
                          {lesson.title}
                        </h4>

                        {lesson.content && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                            {lesson.content}
                          </p>
                        )}

                        {lesson.video_url && (
                          <a
                            href={lesson.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-400/20"
                          >
                            ▶ مشاهدة الفيديو
                            <span aria-hidden="true">↗</span>
                          </a>
                        )}

                        {Array.isArray(lesson.resources) &&
                          lesson.resources.length > 0 && (
                            <div className="mt-4">
                              <p className="mb-2 text-sm font-bold text-slate-300">
                                الموارد المرفقة
                              </p>
                              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-xs text-slate-400">
                                {JSON.stringify(lesson.resources, null, 2)}
                              </pre>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleReview(course, "rejected")}
                    disabled={processingId !== null || loading}
                    className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-6 py-3 font-bold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === course.id
                      ? "جارٍ تسجيل القرار..."
                      : "رفض الدورة"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleReview(course, "approved")}
                    disabled={processingId !== null || loading}
                    className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === course.id
                      ? "جارٍ تسجيل القرار..."
                      : "قبول الدورة"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
