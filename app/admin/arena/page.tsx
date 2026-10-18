
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Subject = {
  id: string;
  name: string;
  stream: string | null;
};

type ArenaQuestion = {
  id: string;
  subject_id: string;
  stream: string | null;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
  created_at: string;
};

type QuestionForm = {
  subject_id: string;
  stream: string;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
};

const emptyForm: QuestionForm = {
  subject_id: "",
  stream: "",
  question_text: "",
  options: ["", "", "", ""],
  correct_option: 0,
  explanation: "",
  difficulty: "medium",
  is_published: false,
};

const STREAMS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
  "تسيير واقتصاد",
  "آداب وفلسفة",
  "لغات أجنبية",
];

export default function AdminArenaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<ArenaQuestion | null>(null);

  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [filterStream, setFilterStream] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterPublication, setFilterPublication] = useState("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setLoading(false);
      return;
    }

    const [subjectsResult, questionsResult] = await Promise.all([
      supabase
        .from("subjects")
        .select("id, name, stream")
        .order("name", { ascending: true }),

      supabase
        .from("arena_questions")
        .select(
          "id, subject_id, stream, question_text, options, correct_option, explanation, difficulty, is_published, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (subjectsResult.error) {
      console.error(subjectsResult.error);
      setError(`تعذر تحميل المواد: ${subjectsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (questionsResult.error) {
      console.error(questionsResult.error);
      setError(`تعذر تحميل الأسئلة: ${questionsResult.error.message}`);
      setLoading(false);
      return;
    }

    setSubjects(subjectsResult.data || []);
    setQuestions(
      (questionsResult.data || []).map((question) => ({
        ...question,
        options: Array.isArray(question.options)
          ? question.options
          : [],
      })) as ArenaQuestion[]
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const availableSubjects = subjects.filter(
    (subject) =>
      !form.stream ||
      !subject.stream ||
      subject.stream === form.stream
  );

  function openCreateForm() {
    setEditingQuestion(null);
    setForm({ ...emptyForm, options: ["", "", "", ""] });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(question: ArenaQuestion) {
    setEditingQuestion(question);

    setForm({
      subject_id: question.subject_id,
      stream: question.stream || "",
      question_text: question.question_text,
      options: Array.from({ length: 4 }, (_, index) =>
        question.options[index] || ""
      ),
      correct_option: question.correct_option,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      is_published: question.is_published,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingQuestion(null);
    setForm({ ...emptyForm, options: ["", "", "", ""] });
  }

  function updateOption(index: number, value: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    }));
  }

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.subject_id) {
      setError("اختار المادة.");
      return;
    }

    if (!form.question_text.trim()) {
      setError("اكتب نص السؤال.");
      return;
    }

    if (form.options.length < 2 || form.options.some((option) => !option.trim())) {
      setError("عمّر الاختيارات الأربعة.");
      return;
    }

    if (
      form.correct_option < 0 ||
      form.correct_option >= form.options.length
    ) {
      setError("الإجابة الصحيحة غير صالحة.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setSaving(true);

    const selectedSubject = subjects.find(
      (subject) => subject.id === form.subject_id
    );

    const payload = {
      subject_id: form.subject_id,
      stream: form.stream || selectedSubject?.stream || null,
      question_text: form.question_text.trim(),
      options: form.options.map((option) => option.trim()),
      correct_option: form.correct_option,
      explanation: form.explanation.trim() || null,
      difficulty: form.difficulty,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };

    const result = editingQuestion
      ? await supabase
          .from("arena_questions")
          .update(payload)
          .eq("id", editingQuestion.id)
      : await supabase.from("arena_questions").insert(payload);

    if (result.error) {
      console.error(result.error);
      setError(`تعذر حفظ السؤال: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setSuccess(
      editingQuestion
        ? "تم تعديل السؤال بنجاح."
        : "تمت إضافة السؤال بنجاح."
    );

    setShowForm(false);
    setEditingQuestion(null);
    setForm({ ...emptyForm, options: ["", "", "", ""] });

    await loadData();
    setSaving(false);
  }

  async function deleteQuestion(question: ArenaQuestion) {
    if (question.is_published) {
      alert("أوقف نشر السؤال أولًا قبل حذفه.");
      return;
    }

    const confirmed = window.confirm(
      `هل تريد حذف هذا السؤال؟\n\n${question.question_text}`
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setDeletingId(question.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("arena_questions")
      .delete()
      .eq("id", question.id);

    if (deleteError) {
      console.error(deleteError);
      setError(
        `تعذر حذف السؤال. ممكن يكون مرتبط بتحدٍ موجود: ${deleteError.message}`
      );
      setDeletingId(null);
      return;
    }

    setSuccess("تم حذف السؤال.");
    await loadData();
    setDeletingId(null);
  }

  const filteredQuestions = questions.filter((question) => {
    const streamMatches =
      filterStream === "all" || question.stream === filterStream;

    const subjectMatches =
      filterSubject === "all" || question.subject_id === filterSubject;

    const publicationMatches =
      filterPublication === "all" ||
      (filterPublication === "published" && question.is_published) ||
      (filterPublication === "draft" && !question.is_published);

    return streamMatches && subjectMatches && publicationMatches;
  });

  function subjectName(subjectId: string) {
    return subjects.find((subject) => subject.id === subjectId)?.name || "مادة غير معروفة";
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-cyan-400">
              <Link href="/admin" className="hover:text-cyan-300">
                لوحة الإدارة
              </Link>
              <span>←</span>
              <span className="text-slate-400">MARIS ARENA</span>
            </div>

            <h1 className="text-3xl font-black">🐋 إدارة أسئلة Arena</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              حضّر بنك الأسئلة حسب المواد والشعب قبل إضافتها للتحديات.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
            >
              العودة للإدارة
            </Link>
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300"
            >
              ＋ إضافة سؤال
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            ✅ {success}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="إجمالي الأسئلة" value={questions.length} icon="❓" />
          <Stat
            label="منشورة"
            value={questions.filter((question) => question.is_published).length}
            icon="🌊"
          />
          <Stat
            label="مسودات"
            value={questions.filter((question) => !question.is_published).length}
            icon="📝"
          />
        </section>

        {showForm && (
          <section className="mb-8 rounded-3xl border border-cyan-400/20 bg-white/[0.03] p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  {editingQuestion ? "✏️ تعديل السؤال" : "➕ سؤال جديد"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  الإجابة الصحيحة لا تظهر للطلاب عبر واجهة الأسئلة.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={saveQuestion} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الشعبة">
                  <select
                    value={form.stream}
                    onChange={(event) => {
                      const stream = event.target.value;
                      setForm((current) => ({
                        ...current,
                        stream,
                        subject_id: "",
                      }));
                    }}
                    className="arena-input"
                  >
                    <option value="">مادة عامة / كل الشعب</option>
                    {STREAMS.map((stream) => (
                      <option key={stream} value={stream}>
                        {stream}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="المادة">
                  <select
                    required
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subject_id: event.target.value,
                      }))
                    }
                    className="arena-input"
                  >
                    <option value="">اختار المادة</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.stream ? ` — ${subject.stream}` : " — عامة"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="نص السؤال">
                <textarea
                  required
                  rows={4}
                  value={form.question_text}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      question_text: event.target.value,
                    }))
                  }
                  placeholder="اكتب السؤال هنا..."
                  className="arena-input resize-y"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {form.options.map((option, index) => (
                  <Field key={index} label={`الاختيار ${index + 1}`}>
                    <input
                      required
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                      placeholder={`اكتب الاختيار ${index + 1}`}
                      className="arena-input"
                    />
                  </Field>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الإجابة الصحيحة">
                  <select
                    value={form.correct_option}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        correct_option: Number(event.target.value),
                      }))
                    }
                    className="arena-input"
                  >
                    {form.options.map((_, index) => (
                      <option key={index} value={index}>
                        الاختيار {index + 1}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    تُخزّن الإجابة كفهرس يبدأ من 0.
                  </p>
                </Field>

                <Field label="الصعوبة">
                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        difficulty: event.target.value as QuestionForm["difficulty"],
                      }))
                    }
                    className="arena-input"
                  >
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                </Field>
              </div>

              <Field label="شرح الإجابة (اختياري)">
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      explanation: event.target.value,
                    }))
                  }
                  placeholder="اشرح سبب صحة الإجابة..."
                  className="arena-input resize-y"
                />
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_published: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-cyan-400"
                />
                <span>
                  <span className="block font-bold">نشر السؤال</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    الأسئلة المنشورة فقط يُفترض استخدامها في التحديات.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50 sm:w-auto"
              >
                {saving ? "جاري الحفظ..." : editingQuestion ? "حفظ التعديلات" : "إضافة السؤال"}
              </button>
            </form>
          </section>
        )}

        <section className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <select
            value={filterStream}
            onChange={(event) => setFilterStream(event.target.value)}
            className="arena-input"
          >
            <option value="all">كل الشعب</option>
            {STREAMS.map((stream) => (
              <option key={stream} value={stream}>
                {stream}
              </option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(event) => setFilterSubject(event.target.value)}
            className="arena-input"
          >
            <option value="all">كل المواد</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            value={filterPublication}
            onChange={(event) => setFilterPublication(event.target.value)}
            className="arena-input"
          >
            <option value="all">الكل: منشور ومسودة</option>
            <option value="published">الأسئلة المنشورة</option>
            <option value="draft">المسودات</option>
          </select>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
            جاري تحميل أسئلة Arena...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="text-5xl">🐋</div>
            <h2 className="mt-4 text-xl font-black">ماكان حتى سؤال مطابق</h2>
            <p className="mt-2 text-sm text-slate-400">
              زيد سؤال جديد أو بدّل خيارات التصفية.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => (
              <article
                key={question.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-300">
                        {subjectName(question.subject_id)}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
                        {question.stream || "مادة عامة"}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
                        {question.difficulty === "easy"
                          ? "سهل"
                          : question.difficulty === "hard"
                            ? "صعب"
                            : "متوسط"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          question.is_published
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {question.is_published ? "منشور" : "مسودة"}
                      </span>
                    </div>

                    <h3 className="whitespace-pre-wrap text-base font-bold leading-7">
                      {index + 1}. {question.question_text}
                    </h3>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`rounded-xl border p-3 text-sm ${
                            optionIndex === question.correct_option
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-white/[0.02] text-slate-300"
                          }`}
                        >
                          <span className="ml-2 font-black">
                            {optionIndex + 1}.
                          </span>
                          {option}
                          {optionIndex === question.correct_option && (
                            <span className="mr-2 text-xs">✓ صحيحة</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <p className="mt-4 rounded-xl bg-white/[0.03] p-3 text-sm leading-6 text-slate-400">
                        <strong className="text-cyan-300">التفسير: </strong>
                        {question.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(question)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-400/10"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(question)}
                      disabled={deletingId === question.id}
                      className="rounded-xl border border-red-400/20 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                    >
                      {deletingId === question.id ? "..." : "حذف"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .arena-input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.8rem;
          background: #0b1728;
          color: white;
          padding: 0.8rem 1rem;
          outline: none;
        }

        .arena-input:focus {
          border-color: rgba(34, 211, 238, 0.6);
        }

        .arena-input::placeholder {
          color: #64748b;
        }

        .arena-input option {
          background: #0b1728;
          color: white;
        }
      `}</style>
    </main>
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
      <label className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-2xl">{icon}</div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}
