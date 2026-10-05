"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getLevelInfo } from "@/lib/level";

type Student = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string | null;
  is_admin: boolean | null;
};

type QuizAttempt = {
  id: string;
  quiz_id: string;
  total_questions: number;
  correct_answers: number;
  score: number;
  completed_at: string | null;
};

type Quiz = {
  id: string;
  title: string;
};

type XPTransaction = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export default function StudentDetailsPage() {
  const params = useParams();

  const rawId = params?.id;
  const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [student, setStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);

  const [totalXP, setTotalXP] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      loadStudent(studentId);
    }
  }, [studentId]);

  async function loadStudent(id: string) {
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
          "ليس لديك صلاحية الوصول إلى هذه الصفحة."
        );
      }

      const [
        profileRes,
        attemptsRes,
        quizzesRes,
        transactionsRes,
        allXPRes,
        progressRes,
        lessonsRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, stream, maris_id, created_at, is_admin"
          )
          .eq("id", id)
          .maybeSingle(),

        supabase
          .from("quiz_attempts")
          .select(
            "id, quiz_id, total_questions, correct_answers, score, completed_at"
          )
          .eq("user_id", id)
          .not("completed_at", "is", null)
          .order("completed_at", {
            ascending: false,
          })
          .limit(10),

        supabase
          .from("quizzes")
          .select("id, title"),

        supabase
          .from("xp_transactions")
          .select(
            "id, amount, reason, created_at"
          )
          .eq("user_id", id)
          .order("created_at", {
            ascending: false,
          })
          .limit(10),

        supabase
          .from("xp_transactions")
          .select("amount")
          .eq("user_id", id),

        supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", id),

        supabase
          .from("lessons")
          .select("id", {
            count: "exact",
            head: true,
          }),
      ]);

      if (profileRes.error) {
        throw profileRes.error;
      }

      if (attemptsRes.error) {
        throw attemptsRes.error;
      }

      if (quizzesRes.error) {
        throw quizzesRes.error;
      }

      if (transactionsRes.error) {
        throw transactionsRes.error;
      }

      if (allXPRes.error) {
        throw allXPRes.error;
      }

      if (progressRes.error) {
        throw progressRes.error;
      }

      if (lessonsRes.error) {
        throw lessonsRes.error;
      }

      if (!profileRes.data) {
        throw new Error("الطالب غير موجود.");
      }

      const calculatedXP = (allXPRes.data ?? []).reduce(
        (sum, transaction) =>
          sum + (transaction.amount ?? 0),
        0
      );

      setStudent(profileRes.data);
      setAttempts(attemptsRes.data ?? []);
      setQuizzes(quizzesRes.data ?? []);
      setTransactions(transactionsRes.data ?? []);
      setTotalXP(calculatedXP);
      setCompletedLessons(
        progressRes.data?.length ?? 0
      );
      setTotalLessons(lessonsRes.count ?? 0);
    } catch (err) {
      console.error(
        "STUDENT DETAILS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل بيانات الطالب."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>

          <div className="mt-6 h-80 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin/students"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← العودة إلى الطلاب
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
            <div className="text-3xl">⚠️</div>

            <h1 className="mt-3 text-xl font-semibold text-red-300">
              تعذر تحميل الطالب
            </h1>

            <p className="mt-2 text-sm text-red-200/80">
              {error ?? "الطالب غير موجود."}
            </p>

            <button
              onClick={() => {
                if (studentId) {
                  loadStudent(studentId);
                }
              }}
              className="mt-5 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/30"
            >
              المحاولة مرة أخرى
            </button>
          </div>
        </div>
      </main>
    );
  }

  const level = getLevelInfo(totalXP);

  const progressPercent =
    totalLessons > 0
      ? Math.round(
          (completedLessons / totalLessons) * 100
        )
      : 0;

  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) =>
              sum + (attempt.score ?? 0),
            0
          ) / attempts.length
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/students"
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            ← العودة إلى الطلاب
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                👤 ملف الطالب
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                {getFullName(student)}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-cyan-400/10 px-3 py-1 font-mono text-sm text-cyan-300">
                  {student.maris_id ?? "بدون MARIS ID"}
                </span>

                {student.is_admin && (
                  <span className="rounded-lg bg-purple-400/10 px-3 py-1 text-sm text-purple-300">
                    👑 Admin
                  </span>
                )}

                <span className="rounded-lg bg-white/5 px-3 py-1 text-sm text-slate-400">
                  {student.stream ?? "الشعبة غير محددة"}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (studentId) {
                  loadStudent(studentId);
                }
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              ↻ تحديث البيانات
            </button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="⚡"
            label="XP"
            value={totalXP}
            description="إجمالي نقاط الطالب"
          />

          <StatCard
            icon="🏆"
            label={`المستوى ${level.level}`}
            value={level.name}
            description={`${level.xpIntoLevel} / ${level.xpForNext} XP للمستوى التالي`}
          />

          <StatCard
            icon="📚"
            label="الدروس"
            value={`${completedLessons}/${totalLessons}`}
            description={`${progressPercent}% من الدروس مكتملة`}
          />

          <StatCard
            icon="📝"
            label="الاختبارات"
            value={attempts.length}
            description={`متوسط النتائج ${averageScore}%`}
          />
        </div>

        {/* Level Progress */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                تقدم المستوى
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Lv. {level.level} · {level.name}
              </h2>
            </div>

            <span className="text-sm font-semibold text-cyan-300">
              {level.progress}%
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{
                width: `${level.progress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-600">
            <span>{level.xpIntoLevel} XP</span>
            <span>{level.xpForNext} XP</span>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5">
              <p className="text-xs text-cyan-300">
                PROFILE
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                معلومات الطالب
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBox
                label="الاسم الأول"
                value={student.first_name ?? "—"}
              />

              <InfoBox
                label="اللقب"
                value={student.last_name ?? "—"}
              />

              <InfoBox
                label="الشعبة"
                value={
                  student.stream ?? "غير محددة"
                }
              />

              <InfoBox
                label="MARIS ID"
                value={student.maris_id ?? "—"}
              />

              <InfoBox
                label="تاريخ التسجيل"
                value={formatDate(student.created_at)}
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
          </section>

          {/* Lesson Progress */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5">
              <p className="text-xs text-cyan-300">
                LEARNING
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                تقدم الدروس
              </h2>
            </div>

            <div className="rounded-xl bg-white/[0.03] p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {progressPercent}%
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    نسبة إكمال الدروس
                  </p>
                </div>

                <div className="text-right text-sm text-slate-400">
                  <div>
                    {completedLessons} مكتملة
                  </div>

                  <div className="mt-1">
                    من أصل {totalLessons}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Quiz Attempts */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5">
            <p className="text-xs text-cyan-300">
              QUIZZES
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              آخر الاختبارات
            </h2>
          </div>

          {attempts.length === 0 ? (
            <EmptyState text="لم يجتز الطالب أي اختبار بعد." />
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => {
                const quiz = quizzes.find(
                  (item) =>
                    item.id === attempt.quiz_id
                );

                return (
                  <div
                    key={attempt.id}
                    className="flex flex-col gap-3 rounded-xl bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-white">
                        {quiz?.title ??
                          "اختبار غير معروف"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(
                          attempt.completed_at
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-slate-400">
                          {attempt.correct_answers}/
                          {attempt.total_questions}
                        </div>

                        <div className="text-xs text-slate-600">
                          إجابات صحيحة
                        </div>
                      </div>

                      <div className="rounded-xl bg-cyan-400/10 px-4 py-2 text-center">
                        <div className="font-bold text-cyan-300">
                          {attempt.score}%
                        </div>

                        <div className="text-[10px] text-slate-500">
                          SCORE
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* XP History */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5">
            <p className="text-xs text-cyan-300">
              XP HISTORY
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              آخر حركات XP
            </h2>
          </div>

          {transactions.length === 0 ? (
            <EmptyState text="لا توجد حركات XP لهذا الطالب." />
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-4"
                >
                  <div>
                    <p className="font-medium text-white">
                      {formatXPReason(
                        transaction.reason
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTime(
                        transaction.created_at
                      )}
                    </p>
                  </div>

                  <span className="font-bold text-amber-300">
                    +{transaction.amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function getFullName(student: Student) {
  const name =
    `${student.first_name ?? ""} ${
      student.last_name ?? ""
    }`.trim();

  return name || "طالب بدون اسم";
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

function formatDateTime(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatXPReason(reason: string | null) {
  switch (reason) {
    case "quiz_complete":
      return "إكمال اختبار";

    case "lesson_complete":
      return "إكمال درس";

    default:
      return reason || "حركة XP";
  }
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string | number;
  description: string;
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

        <div className="mt-1 text-sm font-medium text-slate-300">
          {label}
        </div>

        <div className="mt-1 text-xs text-slate-600">
          {description}
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
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="text-[11px] text-slate-600">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-medium text-slate-300">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-5 py-10 text-center">
      <div className="text-3xl">📭</div>

      <p className="mt-3 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}