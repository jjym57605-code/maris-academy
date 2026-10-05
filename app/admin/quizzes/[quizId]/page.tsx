"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Question = {
  id: string;
  quiz_id: string;
  text: string;
  options: Record<string, string>;
  correct_option: string;
  order_index: number;
  created_at?: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
};

const emptyOptions = {
  A: "",
  B: "",
  C: "",
  D: "",
};

export default function AdminQuizQuestionsPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<Record<string, string>>(
    emptyOptions
  );
  const [correctOption, setCorrectOption] = useState("A");
  const [orderIndex, setOrderIndex] = useState(1);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!quizId) return;

    loadData();
  }, [quizId]);

  async function loadData() {
    setLoading(true);
    setError("");

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setLoading(false);
      return;
    }

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, description")
      .eq("id", quizId)
      .single();

    if (quizError) {
      console.error("Error loading quiz:", quizError);
      setError(`تعذر تحميل الاختبار: ${quizError.message}`);
      setLoading(false);
      return;
    }

    const { data: questionsData, error: questionsError } =
      await supabase
        .from("questions")
        .select(
          "id, quiz_id, text, options, correct_option, order_index, created_at"
        )
        .eq("quiz_id", quizId)
        .order("order_index", {
          ascending: true,
        });

    if (questionsError) {
      console.error(
        "Error loading questions:",
        questionsError
      );
      setError(
        `تعذر تحميل الأسئلة: ${questionsError.message}`
      );
      setLoading(false);
      return;
    }

    setQuiz(quizData);
    setQuestions(questionsData || []);
    setLoading(false);
  }

  function resetForm() {
    setQuestionText("");
    setOptions({ ...emptyOptions });
    setCorrectOption("A");
    setOrderIndex(questions.length + 1);
    setEditingId(null);
  }

  function startAdd() {
    setSuccess("");
    setError("");
    resetForm();
    setShowForm(true);
  }

  function startEdit(question: Question) {
    setSuccess("");
    setError("");

    setEditingId(question.id);
    setQuestionText(question.text);

    setOptions({
      A: question.options?.A || "",
      B: question.options?.B || "",
      C: question.options?.C || "",
      D: question.options?.D || "",
    });

    setCorrectOption(question.correct_option);
    setOrderIndex(question.order_index);

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelForm() {
    setShowForm(false);
    resetForm();
    setError("");
  }

  function updateOption(
    option: string,
    value: string
  ) {
    setOptions((current) => ({
      ...current,
      [option]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!questionText.trim()) {
      setError("اكتب نص السؤال.");
      return;
    }

    if (
      !options.A.trim() ||
      !options.B.trim() ||
      !options.C.trim() ||
      !options.D.trim()
    ) {
      setError("لازم تعمر جميع الاختيارات A و B و C و D.");
      return;
    }

    if (!correctOption) {
      setError("حدد الإجابة الصحيحة.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setSaving(true);

    const questionData = {
      quiz_id: quizId,
      text: questionText.trim(),
      options: {
        A: options.A.trim(),
        B: options.B.trim(),
        C: options.C.trim(),
        D: options.D.trim(),
      },
      correct_option: correctOption,
      order_index: Number(orderIndex),
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from("questions")
        .update(questionData)
        .eq("id", editingId);

      if (updateError) {
        console.error(
          "Error updating question:",
          updateError
        );

        setError(
          `تعذر تعديل السؤال: ${updateError.message}`
        );

        setSaving(false);
        return;
      }

      setSuccess("تم تعديل السؤال بنجاح ✏️");
    } else {
      const { error: insertError } = await supabase
        .from("questions")
        .insert(questionData);

      if (insertError) {
        console.error(
          "Error inserting question:",
          insertError
        );

        setError(
          `تعذر إضافة السؤال: ${insertError.message}`
        );

        setSaving(false);
        return;
      }

      setSuccess("تمت إضافة السؤال بنجاح ✅");
    }

    await loadData();

    setShowForm(false);
    resetForm();
    setSaving(false);
  }

  async function handleDeleteQuestion(
    question: Question
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف هذا السؤال؟\n\n"${question.text}"`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(question.id);

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setDeletingId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("id", question.id);

    if (deleteError) {
      console.error(
        "Error deleting question:",
        deleteError
      );

      setError(
        `تعذر حذف السؤال: ${deleteError.message}`
      );

      setDeletingId(null);
      return;
    }

    if (editingId === question.id) {
      resetForm();
      setShowForm(false);
    }

    setSuccess("تم حذف السؤال بنجاح 🗑️");

    await loadData();

    setDeletingId(null);
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-950 px-6 py-10 text-white"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="text-4xl">⏳</div>

            <p className="mt-4 font-bold text-slate-400">
              جاري تحميل الأسئلة...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-950 px-6 py-10 text-white"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-10 text-center">
            <div className="text-4xl">⚠️</div>

            <h1 className="mt-4 text-xl font-black">
              الاختبار غير موجود
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error}
            </p>

            <Link
              href="/admin/quizzes"
              className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              ← العودة للاختبارات
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/quizzes"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
            >
              ← العودة للاختبارات
            </Link>

            <h1 className="text-2xl font-black sm:text-3xl">
              📝 إدارة أسئلة الاختبار
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {quiz.title}
            </p>
          </div>

          <button
            type="button"
            onClick={startAdd}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
          >
            ➕ إضافة سؤال
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {success}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-3xl border border-cyan-500/20 bg-white/[0.03] p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  {editingId
                    ? "✏️ تعديل السؤال"
                    : "➕ إضافة سؤال جديد"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  اكتب السؤال والاختيارات وحدد الإجابة الصحيحة.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelForm}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                إلغاء
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Question */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  نص السؤال
                </label>

                <textarea
                  value={questionText}
                  onChange={(event) =>
                    setQuestionText(event.target.value)
                  }
                  rows={4}
                  placeholder="اكتب السؤال هنا..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              {/* Options */}
              <div className="grid gap-4 md:grid-cols-2">
                {["A", "B", "C", "D"].map(
                  (option) => (
                    <div key={option}>
                      <label className="mb-2 block text-sm font-bold text-slate-300">
                        الاختيار {option}
                      </label>

                      <div className="flex gap-2">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-black text-cyan-300">
                          {option}
                        </div>

                        <input
                          type="text"
                          value={options[option] || ""}
                          onChange={(event) =>
                            updateOption(
                              option,
                              event.target.value
                            )
                          }
                          placeholder={`نص الاختيار ${option}`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Correct option + order */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    الإجابة الصحيحة
                  </label>

                  <select
                    value={correctOption}
                    onChange={(event) =>
                      setCorrectOption(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50"
                  >
                    <option value="A">
                      A
                    </option>
                    <option value="B">
                      B
                    </option>
                    <option value="C">
                      C
                    </option>
                    <option value="D">
                      D
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    ترتيب السؤال
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={orderIndex}
                    onChange={(event) =>
                      setOrderIndex(
                        Number(event.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingId
                    ? "💾 حفظ التعديل"
                    : "➕ إضافة السؤال"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-bold text-slate-500">
              عدد الأسئلة
            </p>

            <p className="mt-2 text-2xl font-black text-white">
              {questions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-bold text-slate-500">
              حالة الاختبار
            </p>

            <p className="mt-2 text-sm font-black text-emerald-400">
              🟢 جاهز للإدارة
            </p>
          </div>
        </div>

        {/* Questions list */}
        {questions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="text-5xl">📭</div>

            <h2 className="mt-4 text-xl font-black">
              لا توجد أسئلة بعد
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              أضف أول سؤال لهذا الاختبار.
            </p>

            <button
              type="button"
              onClick={startAdd}
              className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
            >
              ➕ إضافة أول سؤال
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(
              (question, index) => (
                <div
                  key={question.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-sm font-black text-cyan-300">
                          {index + 1}
                        </span>

                        <span className="text-xs font-bold text-slate-500">
                          ترتيب: {question.order_index}
                        </span>
                      </div>

                      <h3 className="text-base font-black leading-7 text-white sm:text-lg">
                        {question.text}
                      </h3>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {["A", "B", "C", "D"].map(
                          (option) => {
                            const isCorrect =
                              question.correct_option ===
                              option;

                            return (
                              <div
                                key={option}
                                className={`rounded-2xl border p-3 ${
                                  isCorrect
                                    ? "border-emerald-500/30 bg-emerald-500/10"
                                    : "border-white/10 bg-white/[0.02]"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                      isCorrect
                                        ? "bg-emerald-500 text-slate-950"
                                        : "bg-white/10 text-slate-300"
                                    }`}
                                  >
                                    {option}
                                  </span>

                                  <span className="text-sm font-bold leading-6 text-slate-300">
                                    {question.options?.[
                                      option
                                    ] || "—"}
                                  </span>
                                </div>

                                {isCorrect && (
                                  <div className="mt-2 text-xs font-black text-emerald-400">
                                    ✅ الإجابة الصحيحة
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(question)
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteQuestion(
                            question
                          )
                        }
                        disabled={
                          deletingId === question.id
                        }
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === question.id
                          ? "جاري الحذف..."
                          : "🗑️ حذف"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}