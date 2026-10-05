
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string;
  is_admin: boolean;
};

type Attempt = {
  id: string;
  quiz_id: string;
  total_questions: number;
  correct_answers: number;
  score: number;
  completed_at: string;
};

type Transaction = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

type StudentDetailsResponse = {
  student: Student;
  attempts: Attempt[];
  quizzes: { id: string; title: string }[];
  transactions: Transaction[];
  totalXP: number;
  completedLessons: number;
  totalLessons: number;
};

export default function AdminStudentDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<StudentDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();

        if (!supabase) {
          throw new Error("Supabase غير مهيأ.");
        }

        // نتأكد أن جلسة المستخدم موجودة.
        // getUser() يساعد أيضاً على تحديث الجلسة إذا كانت قابلة للتجديد.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("جلسة الدخول غير موجودة. أعد تسجيل الدخول.");
        }

        // جلب بيانات الطالب عبر RPC الآمن للأدمن.
        // الـ RPC نفسه يتحقق من صلاحيات الأدمن.
        console.log("🔥 STUDENT DETAILS TARGET ID:", id);

        const { data, error: detailsError } = await supabase.rpc(
          "get_admin_student_details",
          { target_user_id: id }
        );

        console.log("🔥 STUDENT DETAILS RPC DATA:", data);
        console.log("🔥 STUDENT DETAILS RPC ERROR:", detailsError);

        const studentDetails = data as StudentDetailsResponse;

        if (!studentDetails.student) {
          throw new Error("الطالب غير موجود.");
        }

        setDetails(studentDetails);
      } catch (err) {
        console.error("STUDENT DETAILS ERROR:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("تعذر تحميل بيانات الطالب.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-navy-950 p-4 text-foam sm:p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-foam/45">
            جاري تحميل بيانات الطالب...
          </p>
        </div>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="min-h-screen bg-navy-950 p-4 text-foam sm:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-300">
            {error ?? "الطالب غير موجود."}
          </div>

          <div className="mt-4">
            <Link
              href="/admin/students"
              className="text-sm text-foam/45 transition hover:text-cyan-300"
            >
              ← العودة إلى الطلبة
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const student = details.student;

  const progressPercent =
    details.totalLessons > 0
      ? Math.round(
          (details.completedLessons / details.totalLessons) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-navy-950 p-4 text-foam sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/students"
              className="text-sm text-foam/45 transition hover:text-cyan-300"
            >
              ← العودة إلى الطلبة
            </Link>

            <h1 className="mt-2 text-2xl font-bold text-foam">
              تفاصيل الطالب
            </h1>
          </div>
        </div>

        {/* Student Card */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_30px_rgba(34,211,238,0.04)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foam">
                {student.first_name} {student.last_name}
              </h2>

              <p className="mt-1 text-sm text-cyan-300/70">
                MARIS ID: {student.maris_id ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06] px-5 py-4">
              <p className="text-sm text-foam/45">الشعبة</p>

              <p className="mt-1 font-semibold text-cyan-300">
                {student.stream ?? "غير محددة"}
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-foam/45">XP</p>

            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {details.totalXP}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-foam/45">الدروس المكتملة</p>

            <p className="mt-2 text-3xl font-bold text-foam">
              {details.completedLessons}
              <span className="text-base font-normal text-foam/30">
                {" "}
                / {details.totalLessons}
              </span>
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-foam/45">نسبة التقدم</p>

            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {progressPercent}%
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-foam/45">الاختبارات</p>

            <p className="mt-2 text-3xl font-bold text-foam">
              {details.attempts.length}
            </p>
          </div>
        </section>

        {/* Progress */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foam">
              التقدم الدراسي
            </h2>

            <span className="text-sm font-semibold text-cyan-300">
              {progressPercent}%
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Quiz Attempts */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 font-bold text-foam">
            آخر الاختبارات
          </h2>

          {details.attempts.length === 0 ? (
            <p className="text-sm text-foam/40">
              لا توجد اختبارات.
            </p>
          ) : (
            <div className="space-y-3">
              {details.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-cyan-400/10 hover:bg-cyan-400/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foam">
                      {details.quizzes.find(
                        (quiz) => quiz.id === attempt.quiz_id
                      )?.title ?? "اختبار"}
                    </p>

                    <p className="text-sm text-foam/40">
                      {attempt.correct_answers} /{" "}
                      {attempt.total_questions} صحيحة
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-cyan-300">
                      {attempt.score}%
                    </p>

                    <p className="text-xs text-foam/30">
                      {new Date(
                        attempt.completed_at
                      ).toLocaleDateString("ar-DZ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* XP Transactions */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 font-bold text-foam">
            آخر معاملات XP
          </h2>

          {details.transactions.length === 0 ? (
            <p className="text-sm text-foam/40">
              لا توجد معاملات.
            </p>
          ) : (
            <div className="space-y-3">
              {details.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-cyan-400/10 hover:bg-cyan-400/[0.03]"
                >
                  <div>
                    <p className="font-medium text-foam">
                      {transaction.reason}
                    </p>

                    <p className="text-xs text-foam/30">
                      {new Date(
                        transaction.created_at
                      ).toLocaleDateString("ar-DZ")}
                    </p>
                  </div>

                  <span className="font-bold text-cyan-300">
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





