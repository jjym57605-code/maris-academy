"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type QuizType = "qcm" | "exam" | "bac" | "pdf" | "written";

type Course = {
  id: string;
  title: string;
};

type Quiz = {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  quiz_type: QuizType;
  created_at: string;
};

type QuizForm = {
  title: string;
  description: string;
  course_id: string;
  quiz_type: QuizType;
};

const QUIZ_TYPES: {
  value: QuizType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "qcm",
    label: "QCM",
    icon: "☑️",
    description: "أسئلة الاختيار المتعدد",
  },
  {
    value: "exam",
    label: "الفروض والاختبارات",
    icon: "📝",
    description: "الاختبارات والفروض العادية",
  },
  {
    value: "bac",
    label: "مواضيع البكالوريا",
    icon: "🎓",
    description: "مواضيع بكالوريا السنوات السابقة",
  },
  {
    value: "pdf",
    label: "اختبارات PDF",
    icon: "📄",
    description: "اختبارات مرتبطة بملفات PDF",
  },
  {
    value: "written",
    label: "الإجابات الكتابية",
    icon: "✍️",
    description: "أسئلة تتطلب كتابة الإجابة",
  },
];

const emptyForm: QuizForm = {
  title: "",
  description: "",
  course_id: "",
  quiz_type: "qcm",
};

function getQuizType(type: QuizType | string | null | undefined) {
  return (
    QUIZ_TYPES.find((item) => item.value === type) ?? QUIZ_TYPES[0]
  );
}

export default function AdminQuizzesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState<QuizForm>(emptyForm);

  async function loadData() {
    setLoading(true);

    const supabase = getSupabase();

    if (!supabase) {
      console.error("Supabase client is not available.");
      setLoading(false);
      return;
    }

    const [quizzesResult, coursesResult] = await Promise.all([
      supabase
        .from("quizzes")
        .select(
          `
            id,
            course_id,
            title,
            description,
            quiz_type,
            created_at
          `
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("courses")
        .select("id, title")
        .order("title", { ascending: true }),
    ]);

    if (quizzesResult.error) {
      console.error("Error loading quizzes:", quizzesResult.error);
      alert("حدث خطأ أثناء تحميل الاختبارات.");
    } else {
      setQuizzes((quizzesResult.data || []) as Quiz[]);
    }

    if (coursesResult.error) {
      console.error("Error loading courses:", coursesResult.error);
      alert("حدث خطأ أثناء تحميل الدروس.");
    } else {
      setCourses(coursesResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreateModal() {
    setEditingQuiz(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(quiz: Quiz) {
    setEditingQuiz(quiz);

    setForm({
      title: quiz.title,
      description: quiz.description || "",
      course_id: quiz.course_id || "",
      quiz_type: quiz.quiz_type || "qcm",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingQuiz(null);
    setForm(emptyForm);
  }

  async function saveQuiz() {
    if (!form.title.trim()) {
      alert("أدخل عنوان الاختبار.");
      return;
    }

    setSaving(true);

    const supabase = getSupabase();

    if (!supabase) {
      alert("تعذر الاتصال بـ Supabase.");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      course_id: form.course_id || null,
      quiz_type: form.quiz_type,
    };

    const result = editingQuiz
      ? await supabase
          .from("quizzes")
          .update(payload)
          .eq("id", editingQuiz.id)
      : await supabase.from("quizzes").insert(payload);

    if (result.error) {
      console.error("Error saving quiz:", result.error);
      alert(`حدث خطأ أثناء حفظ الاختبار: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setShowModal(false);
    setEditingQuiz(null);
    setForm(emptyForm);

    await loadData();
    setSaving(false);
  }

  async function deleteQuiz(quiz: Quiz) {
    const confirmed = confirm(
      `هل أنت متأكد من حذف الاختبار "${quiz.title}"؟`
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) {
      alert("تعذر الاتصال بـ Supabase.");
      return;
    }

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quiz.id);

    if (error) {
      console.error("Error deleting quiz:", error);
      alert(`تعذر حذف الاختبار: ${error.message}`);
      return;
    }

    await loadData();
  }

  const totalQuizzes = quizzes.length;

  const linkedQuizzes = quizzes.filter(
    (quiz) => !!quiz.course_id
  ).length;

  const unlinkedQuizzes = quizzes.filter(
    (quiz) => !quiz.course_id
  ).length;

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-400">
              <Link
                href="/admin"
                className="transition hover:text-cyan-300"
              >
                لوحة الإدارة
              </Link>

              <span>←</span>

              <span className="text-gray-400">الاختبارات</span>
            </div>

            <h1 className="text-3xl font-bold">📝 الاختبارات</h1>

            <p className="mt-2 text-sm text-gray-400">
              إدارة الاختبارات وتصنيفها وتنظيم ارتباطها بالدروس.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-[#06111f] transition hover:bg-cyan-400"
          >
            ＋ إضافة اختبار
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Stat icon="📝" label="كل الاختبارات" value={totalQuizzes} />
          <Stat icon="📚" label="مرتبطة بدروس" value={linkedQuizzes} />
          <Stat icon="⚠️" label="بدون درس" value={unlinkedQuizzes} />
        </div>

        {!loading && quizzes.length > 0 && (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUIZ_TYPES.map((type) => {
              const count = quizzes.filter(
                (quiz) => getQuizType(quiz.quiz_type).value === type.value
              ).length;

              return (
                <div
                  key={type.value}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-lg font-bold text-cyan-300">
                      {count}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold">{type.label}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {type.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
            جاري تحميل الاختبارات...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <div className="mb-4 text-5xl">📝</div>

            <h2 className="text-xl font-bold">لا توجد اختبارات بعد</h2>

            <p className="mt-2 text-sm text-gray-400">
              أضف أول اختبار وحدد نوعه ليكون منظماً في المنصة.
            </p>

            <button
              onClick={openCreateModal}
              className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-[#06111f]"
            >
              ＋ إضافة أول اختبار
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => {
              const course =
                courses.find((item) => item.id === quiz.course_id) || null;
              const type = getQuizType(quiz.quiz_type);

              return (
                <div
                  key={quiz.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-cyan-500/30"
                >
                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-cyan-500/10 px-3 py-2 text-xl">
                        {type.icon}
                      </div>

                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                        {type.label}
                      </div>
                    </div>

                    <h2 className="line-clamp-2 text-lg font-bold">
                      {quiz.title}
                    </h2>

                    <div className="mt-3">
                      {course ? (
                        <div className="text-sm text-cyan-400">
                          📚 {course.title}
                        </div>
                      ) : (
                        <div className="text-sm text-yellow-400">
                          ⚠️ غير مرتبط بأي درس
                        </div>
                      )}
                    </div>

                    {quiz.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                        {quiz.description}
                      </p>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      أُنشئ في{" "}
                      {new Date(quiz.created_at).toLocaleDateString("ar-DZ")}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-white/10">
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="border-l border-white/10 px-3 py-3 text-center text-sm font-bold text-cyan-400 transition hover:bg-cyan-500/10"
                    >
                      ❓ الأسئلة
                    </Link>

                    <button
                      onClick={() => openEditModal(quiz)}
                      className="border-l border-white/10 px-3 py-3 text-center text-sm font-bold text-blue-400 transition hover:bg-blue-500/10"
                    >
                      ✏️ تعديل
                    </button>

                    <button
                      onClick={() => deleteQuiz(quiz)}
                      className="px-3 py-3 text-center text-sm font-bold text-red-400 transition hover:bg-red-500/10"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1728] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingQuiz ? "✏️ تعديل الاختبار" : "＋ إضافة اختبار"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  حدد نوع الاختبار حتى يظهر في القسم المناسب.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-5">
              <Field label="عنوان الاختبار">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="مثال: اختبار الدوال العددية"
                  className="input"
                />
              </Field>

              <Field label="نوع الاختبار">
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUIZ_TYPES.map((type) => {
                    const selected = form.quiz_type === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, quiz_type: type.value })
                        }
                        className={`rounded-xl border p-3 text-right transition ${
                          selected
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{type.icon}</span>
                          <span
                            className={`text-sm font-bold ${
                              selected ? "text-cyan-300" : "text-gray-200"
                            }`}
                          >
                            {type.label}
                          </span>
                          {selected && (
                            <span className="mr-auto text-cyan-300">✓</span>
                          )}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {type.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="الدرس المرتبط">
                <select
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">بدون درس</option>

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الوصف">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="وصف مختصر للاختبار..."
                  rows={4}
                  className="input resize-none"
                />
              </Field>

              {(form.quiz_type === "pdf" || form.quiz_type === "written") && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-6 text-amber-200">
                  هذا التصنيف أصبح متاحاً، لكن وظائف رفع PDF وتصحيح الإجابات
                  الكتابية تحتاج تطويراً منفصلاً قبل استعمالها كأنواع أسئلة
                  مكتملة.
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/10 p-5">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-bold text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                onClick={saveQuiz}
                disabled={saving}
                className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-[#06111f] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "جاري الحفظ..."
                  : editingQuiz
                    ? "حفظ التعديلات"
                    : "إضافة الاختبار"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.75rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s;
        }

        .input:focus {
          border-color: rgba(34, 211, 238, 0.6);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.08);
        }

        .input::placeholder {
          color: #6b7280;
        }

        select.input option {
          background: #0b1728;
          color: white;
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
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label}
      </label>
      {children}
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 text-2xl">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </div>
  );
}
