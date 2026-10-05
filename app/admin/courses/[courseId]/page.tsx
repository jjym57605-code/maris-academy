"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  resources: unknown[];
  order_index: number;
  created_at: string;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  is_free: boolean;
  price: number;
  is_published: boolean;
};

type LessonForm = {
  title: string;
  content: string;
  order_index: string;
  resources: string;
};

const emptyForm: LessonForm = {
  title: "",
  content: "",
  order_index: "1",
  resources: "[]",
};

export default function AdminCourseLessonsPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = String(params.courseId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [form, setForm] = useState<LessonForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  async function loadData() {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        { data: courseData, error: courseError },
        { data: lessonsData, error: lessonsError },
      ] = await Promise.all([
        supabase
          .from("courses")
          .select(
            "id, title, description, is_free, price, is_published"
          )
          .eq("id", courseId)
          .single(),

        supabase
          .from("lessons")
          .select(
            "id, course_id, title, content, resources, order_index, created_at"
          )
          .eq("course_id", courseId)
          .order("order_index", { ascending: true }),
      ]);

      if (courseError) throw courseError;
      if (lessonsError) throw lessonsError;

      setCourse(courseData as Course);
      setLessons((lessonsData ?? []) as Lesson[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الدروس"
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    const nextOrder =
      lessons.length > 0
        ? Math.max(...lessons.map((lesson) => lesson.order_index)) + 1
        : 1;

    setEditingLesson(null);

    setForm({
      ...emptyForm,
      order_index: String(nextOrder),
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(lesson: Lesson) {
    setEditingLesson(lesson);

    setForm({
      title: lesson.title,
      content: lesson.content ?? "",
      order_index: String(lesson.order_index),
      resources: JSON.stringify(lesson.resources ?? [], null, 2),
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingLesson(null);
    setForm(emptyForm);
    setError("");
  }

  async function saveLesson() {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات");
      return;
    }

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("اكتب عنوان الدرس");
      return;
    }

    const orderIndex = Number(form.order_index);

    if (
      !Number.isInteger(orderIndex) ||
      orderIndex < 1
    ) {
      setError("رقم ترتيب الدرس غير صالح");
      return;
    }

    let parsedResources: unknown[];

    try {
      const parsed = JSON.parse(form.resources || "[]");

      if (!Array.isArray(parsed)) {
        setError("Resources لازم تكون Array مثل []");
        return;
      }

      parsedResources = parsed;
    } catch {
      setError(
        'صيغة Resources غير صحيحة. مثال صحيح: []'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        course_id: courseId,
        title: form.title.trim(),
        content: form.content.trim() || null,
        resources: parsedResources,
        order_index: orderIndex,
      };

      if (editingLesson) {
        const { data, error } = await supabase
          .from("lessons")
          .update({
            title: payload.title,
            content: payload.content,
            resources: payload.resources,
            order_index: payload.order_index,
          })
          .eq("id", editingLesson.id)
          .eq("course_id", courseId)
          .select(
            "id, course_id, title, content, resources, order_index, created_at"
          )
          .single();

        if (error) throw error;

        setLessons((current) =>
          current
            .map((lesson) =>
              lesson.id === editingLesson.id
                ? (data as Lesson)
                : lesson
            )
            .sort(
              (a, b) =>
                a.order_index - b.order_index
            )
        );

        setSuccess("تم تعديل الدرس بنجاح ✅");
      } else {
        const { data, error } = await supabase
          .from("lessons")
          .insert(payload)
          .select(
            "id, course_id, title, content, resources, order_index, created_at"
          )
          .single();

        if (error) throw error;

        setLessons((current) =>
          [...current, data as Lesson].sort(
            (a, b) =>
              a.order_index - b.order_index
          )
        );

        setSuccess("تم إنشاء الدرس بنجاح ✅");
      }

      setTimeout(() => {
        setShowModal(false);
        setEditingLesson(null);
        setForm(emptyForm);
        setSuccess("");
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ الدرس"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: Lesson) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الدرس؟\n\n${lesson.order_index}. ${lesson.title}`
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lesson.id)
        .eq("course_id", courseId);

      if (error) throw error;

      setLessons((current) =>
        current.filter(
          (item) => item.id !== lesson.id
        )
      );

      setSuccess("تم حذف الدرس بنجاح 🗑️");

      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف الدرس"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📖</div>

          <p className="text-slate-400">
            جاري تحميل الدروس...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center">
        <div className="mb-3 text-4xl">⚠️</div>

        <h1 className="text-xl font-bold">
          الكورس غير موجود
        </h1>

        <button
          onClick={() => router.push("/admin/courses")}
          className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
        >
          العودة للكورسات
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/courses"
          className="mb-5 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          ← العودة للكورسات
        </Link>

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-cyan-400">
              📚 إدارة الكورس
            </p>

            <h1 className="text-3xl font-bold">
              {course.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  course.is_published
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {course.is_published
                  ? "منشور"
                  : "مخفي"}
              </span>

              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {course.is_free
                  ? "مجاني"
                  : `${course.price} دج`}
              </span>

              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                {lessons.length} درس
              </span>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            ➕ إضافة درس
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Course description */}
      {course.description && (
        <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.025] p-5">
          <p className="text-sm leading-7 text-slate-400">
            {course.description}
          </p>
        </div>
      )}

      {/* Lessons */}
      {lessons.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.025] px-6 py-16 text-center">
          <div className="mb-4 text-5xl">📖</div>

          <h2 className="text-xl font-bold">
            مازال ما كاش دروس
          </h2>

          <p className="mt-2 text-slate-500">
            أضف أول درس لهذا الكورس.
          </p>

          <button
            onClick={openCreateModal}
            className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
          >
            ➕ إضافة أول درس
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-3xl border border-white/5 bg-white/[0.025] p-5 transition hover:border-cyan-400/20"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                {/* Number */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl font-bold text-cyan-300">
                  {lesson.order_index}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">
                    {lesson.title}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    ترتيب الدرس: {lesson.order_index}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                    {lesson.content ||
                      "لا يوجد محتوى لهذا الدرس حاليًا."}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() =>
                      openEditModal(lesson)
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    ✏️ تعديل
                  </button>

                  <button
                    onClick={() =>
                      deleteLesson(lesson)
                    }
                    className="rounded-xl border border-red-400/10 bg-red-400/5 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingLesson
                    ? "✏️ تعديل الدرس"
                    : "➕ إضافة درس"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {course.title}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl bg-white/5 px-3 py-2 text-slate-300 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <Field label="عنوان الدرس">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="مثال: مفهوم الدالة العددية"
                  className="input"
                />
              </Field>

              {/* Order */}
              <Field label="ترتيب الدرس">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.order_index}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      order_index: e.target.value,
                    })
                  }
                  className="input"
                />
              </Field>

              {/* Content */}
              <Field label="محتوى الدرس">
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      content: e.target.value,
                    })
                  }
                  placeholder="اكتب محتوى الدرس هنا..."
                  rows={12}
                  className="input resize-y"
                />
              </Field>

              {/* Resources */}
              <Field label="Resources — JSON Array">
                <textarea
                  value={form.resources}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      resources: e.target.value,
                    })
                  }
                  placeholder="[]"
                  rows={6}
                  className="input resize-y font-mono text-sm"
                  dir="ltr"
                />

                <p className="mt-2 text-xs text-slate-500">
                  حاليًا استعمل [] إذا ما عندكش موارد إضافية.
                </p>
              </Field>

              {error && (
                <div className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                  {success}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveLesson}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingLesson
                    ? "💾 حفظ التعديلات"
                    : "➕ إنشاء الدرس"}
                </button>

                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-300 hover:bg-white/10"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.75rem 1rem;
          color: white;
          outline: none;
        }

        .input:focus {
          border-color: rgba(34, 211, 238, 0.5);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.08);
        }

        .input::placeholder {
          color: rgb(100, 116, 139);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </label>

      {children}
    </div>
  );
}