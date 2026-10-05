"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Subject = {
  id: string;
  name: string;
};

type Course = {
  id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  is_published: boolean;
  subject?: Subject | null;
};

type CourseForm = {
  subject_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_free: boolean;
  price: string;
  is_published: boolean;
};

const emptyForm: CourseForm = {
  subject_id: "",
  title: "",
  description: "",
  thumbnail_url: "",
  is_free: true,
  price: "",
  is_published: false,
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [form, setForm] = useState<CourseForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

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
        { data: coursesData, error: coursesError },
        { data: subjectsData, error: subjectsError },
      ] = await Promise.all([
        supabase
          .from("courses")
          .select(`
            *,
            subject:subjects(id, name)
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("subjects")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (coursesError) throw coursesError;
      if (subjectsError) throw subjectsError;

      const normalizedCourses = (coursesData ?? []).map((course: any) => ({
        ...course,
        subject: Array.isArray(course.subject)
          ? course.subject[0] ?? null
          : course.subject ?? null,
      }));

      setCourses(normalizedCourses as Course[]);
      setSubjects((subjectsData ?? []) as Subject[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الكورسات"
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCourse(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(course: Course) {
    setEditingCourse(course);

    setForm({
      subject_id: course.subject_id ?? "",
      title: course.title,
      description: course.description ?? "",
      thumbnail_url: course.thumbnail_url ?? "",
      is_free: course.is_free,
      price:
        course.price !== null && course.price !== undefined
          ? String(course.price)
          : "",
      is_published: course.is_published,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingCourse(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  async function saveCourse() {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات");
      return;
    }

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("اكتب عنوان الكورس");
      return;
    }

    if (!form.is_free) {
      if (!form.price.trim()) {
        setError("أدخل سعر الكورس");
        return;
      }

      const numericPrice = Number(form.price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        setError("السعر غير صحيح");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        subject_id: form.subject_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        is_free: form.is_free,
        price: form.is_free ? 0 : Number(form.price),
        is_published: form.is_published,
      };

      if (editingCourse) {
        const { data, error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingCourse.id)
          .select(`
            *,
            subject:subjects(id, name)
          `)
          .single();

        if (error) throw error;

        const updatedCourse = {
          ...data,
          subject: Array.isArray(data.subject)
            ? data.subject[0] ?? null
            : data.subject ?? null,
        } as Course;

        setCourses((current) =>
          current.map((course) =>
            course.id === editingCourse.id
              ? updatedCourse
              : course
          )
        );

        setSuccess("تم تعديل الكورس بنجاح ✅");
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert(payload)
          .select(`
            *,
            subject:subjects(id, name)
          `)
          .single();

        if (error) throw error;

        const newCourse = {
          ...data,
          subject: Array.isArray(data.subject)
            ? data.subject[0] ?? null
            : data.subject ?? null,
        } as Course;

        setCourses((current) => [newCourse, ...current]);

        setSuccess("تم إنشاء الكورس بنجاح ✅");
      }

      setTimeout(() => {
        setShowModal(false);
        setEditingCourse(null);
        setForm(emptyForm);
        setSuccess("");
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ الكورس"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكورس:\n\n${course.title}\n\nقد تكون هناك دروس واختبارات مرتبطة به.`
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
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (error) throw error;

      setCourses((current) =>
        current.filter((item) => item.id !== course.id)
      );

      setSuccess("تم حذف الكورس بنجاح 🗑️");

      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف الكورس"
      );
    }
  }

  async function togglePublished(course: Course) {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات");
      return;
    }

    setError("");

    try {
      const nextValue = !course.is_published;

      const { error } = await supabase
        .from("courses")
        .update({
          is_published: nextValue,
        })
        .eq("id", course.id);

      if (error) throw error;

      setCourses((current) =>
        current.map((item) =>
          item.id === course.id
            ? {
                ...item,
                is_published: nextValue,
              }
            : item
        )
      );

      setSuccess(
        nextValue
          ? "تم نشر الكورس ✅"
          : "تم إخفاء الكورس 👁️"
      );

      setTimeout(() => {
        setSuccess("");
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تغيير حالة الكورس"
      );
    }
  }

  const publishedCount = courses.filter(
    (course) => course.is_published
  ).length;

  const freeCount = courses.filter(
    (course) => course.is_free
  ).length;

  const paidCount = courses.filter(
    (course) => !course.is_free
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">📚</div>

          <p className="text-slate-400">
            جاري تحميل الكورسات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-cyan-400">
            MARIS ACADEMY ²⁰²⁷
          </p>

          <h1 className="text-3xl font-bold">
            📚 إدارة الكورسات
          </h1>

          <p className="mt-2 text-slate-400">
            أنشئ ونظم كورسات المنصة وأدر محتواها من مكان واحد.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          ➕ إضافة كورس
        </button>
      </div>

      {/* Messages */}
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

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon="📚"
          label="كل الكورسات"
          value={courses.length}
        />

        <Stat
          icon="🟢"
          label="منشورة"
          value={publishedCount}
        />

        <Stat
          icon="🆓"
          label="مجانية"
          value={freeCount}
        />

        <Stat
          icon="💰"
          label="مدفوعة"
          value={paidCount}
        />
      </div>

      {/* Courses */}
      {courses.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.025] px-6 py-16 text-center">
          <div className="mb-4 text-5xl">📚</div>

          <h2 className="text-xl font-bold">
            مازال ما كاش كورسات
          </h2>

          <p className="mt-2 text-slate-500">
            أنشئ أول كورس للمنصة.
          </p>

          <button
            onClick={openCreateModal}
            className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
          >
            ➕ إنشاء أول كورس
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.025]"
            >
              <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
                {/* Thumbnail */}
                <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-900 lg:h-32 lg:w-52">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-5xl">📚</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {course.subject?.name ?? "بدون مادة"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        course.is_published
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-yellow-400/10 text-yellow-300"
                      }`}
                    >
                      {course.is_published
                        ? "منشور"
                        : "مخفي"}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                      {course.is_free
                        ? "مجاني"
                        : `${course.price ?? 0} دج`}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold">
                    {course.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                    {course.description ||
                      "لا يوجد وصف لهذا الكورس."}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    أُنشئ في{" "}
                    {new Date(
                      course.created_at
                    ).toLocaleDateString("ar-DZ")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                  >
                    📖 الدروس
                  </Link>

                  <button
                    onClick={() =>
                      togglePublished(course)
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                  >
                    {course.is_published
                      ? "👁️ إخفاء"
                      : "🚀 نشر"}
                  </button>

                  <button
                    onClick={() =>
                      openEditModal(course)
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    ✏️ تعديل
                  </button>

                  <button
                    onClick={() =>
                      deleteCourse(course)
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingCourse
                    ? "✏️ تعديل الكورس"
                    : "➕ إضافة كورس"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أدخل معلومات الكورس الأساسية.
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
              <Field label="المادة">
                <select
                  value={form.subject_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subject_id: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="">
                    بدون مادة
                  </option>

                  {subjects.map((subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="عنوان الكورس">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="مثال: مدخل شامل إلى الدوال العددية"
                  className="input"
                />
              </Field>

              <Field label="الوصف">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="وصف مختصر للكورس..."
                  rows={4}
                  className="input resize-none"
                />
              </Field>

              <Field label="رابط صورة الكورس">
                <input
                  value={form.thumbnail_url}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      thumbnail_url: e.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نوع الكورس">
                  <select
                    value={form.is_free ? "free" : "paid"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_free:
                          e.target.value === "free",
                      })
                    }
                    className="input"
                  >
                    <option value="free">
                      🆓 مجاني
                    </option>

                    <option value="paid">
                      💰 مدفوع
                    </option>
                  </select>
                </Field>

                {!form.is_free && (
                  <Field label="السعر بالدينار">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: e.target.value,
                        })
                      }
                      placeholder="مثال: 1500"
                      className="input"
                    />
                  </Field>
                )}
              </div>

              <Field label="حالة النشر">
                <select
                  value={
                    form.is_published
                      ? "published"
                      : "hidden"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_published:
                        e.target.value ===
                        "published",
                    })
                  }
                  className="input"
                >
                  <option value="hidden">
                    👁️ مخفي
                  </option>

                  <option value="published">
                    🚀 منشور
                  </option>
                </select>
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveCourse}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingCourse
                    ? "💾 حفظ التعديلات"
                    : "➕ إنشاء الكورس"}
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

        select.input option {
          background: rgb(15, 23, 42);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="text-2xl">{icon}</div>

      <div className="mt-3 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-sm text-slate-500">
        {label}
      </div>
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
