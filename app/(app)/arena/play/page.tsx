
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type ArenaQuestion = {
  question_id: string;
  question_order: number;
  question_text: string;
  options: string[];
};

type StartResult = {
  participant_id: string;
  challenge_id: string;
  started_at: string;
  duration_seconds: number;
  question_count: number;
};

type FinishResult = {
  participant_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  answered_questions?: number;
  duration_seconds: number;
  already_finished?: boolean;
};

type GameStatus = "loading" | "playing" | "finished" | "error";

export default function ArenaPlayPage() {
  const router = useRouter();

  // Supabase may be null, so all database operations check it first.
  const [supabase] = useState(() => getSupabase());

  const [participantId, setParticipantId] = useState("");
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<FinishResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const finishingRef = useRef(false);
  const savingRef = useRef(false);
  const answeredRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("تعذّر الاتصال بقاعدة البيانات.");
      setStatus("error");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get("participant");

    if (!id) {
      setErrorMessage(
        "معرّف المشاركة غير موجود. ارجع إلى صفحة Arena وانضم للتحدي أولًا."
      );
      setStatus("error");
      return;
    }

    setParticipantId(id);
  }, [supabase]);

  const finishChallenge = useCallback(async () => {
    const client = supabase;

    if (!client || !participantId || finishingRef.current) {
      return;
    }

    finishingRef.current = true;
    setSubmitting(true);

    try {
      const { data, error } = await client.rpc("arena_finish_challenge", {
        p_participant_id: participantId,
      });

      if (error) throw error;

      if (!mountedRef.current) return;

      setResult(data as FinishResult);
      setStatus("finished");
    } catch (error: unknown) {
      finishingRef.current = false;

      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "تعذّر إنهاء التحدي. حاول مجددًا."
        );
        setStatus("error");
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [participantId, supabase]);


useEffect(() => {
  if (!participantId) return;

  let cancelled = false;

  async function initializeGame() {
    try {
      const client = supabase;

      if (!client) {
        throw new Error("الاتصال بقاعدة البيانات غير متاح.");
      }

      const { data: startData, error: startError } = await client.rpc(
        "arena_start_challenge",
        { p_participant_id: participantId }
      );


        if (startError) throw startError;

        const start = startData as StartResult;

        if (
          !start ||
          typeof start.duration_seconds !== "number" ||
          start.duration_seconds <= 0 ||
          !start.started_at
        ) {
          throw new Error("تعذّر الحصول على معلومات بداية التحدي.");
        }

        const { data: questionData, error: questionError } =
          await client.rpc("arena_get_questions", {
            p_participant_id: participantId,
          });

        if (questionError) throw questionError;

        const loadedQuestions = (questionData ?? []) as ArenaQuestion[];

        if (loadedQuestions.length === 0) {
          throw new Error("لا توجد أسئلة متاحة في هذا التحدي.");
        }

        if (cancelled) return;

        startedAtRef.current = new Date(start.started_at).getTime();
        durationRef.current = start.duration_seconds;

        setQuestions(loadedQuestions);
        setRemainingSeconds(start.duration_seconds);
        setStatus("playing");
      } catch (error: unknown) {
        if (cancelled) return;

        setErrorMessage(
          error instanceof Error ? error.message : "تعذّر تحميل التحدي."
        );
        setStatus("error");
      }
    }

    void initializeGame();

    return () => {
      cancelled = true;
    };
  }, [participantId, supabase]);

  useEffect(() => {
    if (status !== "playing" || startedAtRef.current === null) {
      return;
    }

    const updateTimer = () => {
      const startedAt = startedAtRef.current;

      if (startedAt === null) return;

      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, durationRef.current - elapsed);

      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        void finishChallenge();
      }
    };

    updateTimer();

    const interval = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(interval);
  }, [status, finishChallenge]);

  useEffect(() => {
    if (currentQuestion) {
      setSelectedOption(
        savedAnswers[currentQuestion.question_id] ?? null
      );
    }
  }, [currentQuestion, savedAnswers]);

  function goToNextQuestion() {
    setCurrentIndex((index) =>
      index < questions.length - 1 ? index + 1 : index
    );
  }

  async function submitAnswer() {
    const client = supabase;
    const question = currentQuestion;
    const option = selectedOption;

    if (
      !client ||
      !participantId ||
      !question ||
      option === null ||
      savingRef.current ||
      finishingRef.current
    ) {
      return;
    }

    const questionId = question.question_id;

    if (answeredRef.current[questionId] !== undefined) {
      goToNextQuestion();
      return;
    }

    savingRef.current = true;
    setSubmitting(true);

    try {
      const { error } = await client.rpc("arena_submit_answer", {
        p_participant_id: participantId,
        p_question_id: questionId,
        p_selected_option: option,
      });

      if (error) throw error;

      const nextAnswers = {
        ...answeredRef.current,
        [questionId]: option,
      };

      answeredRef.current = nextAnswers;
      setSavedAnswers(nextAnswers);

      goToNextQuestion();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذّر حفظ الإجابة."
      );
      setStatus("error");
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(savedAnswers).length;

  const formattedTime = `${Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(remainingSeconds % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#061426] px-4 py-8 text-white sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/arena")}
          className="mb-6 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
        >
          ← العودة إلى Arena
        </button>

        {status === "loading" && (
          <section className="rounded-3xl border border-cyan-400/20 bg-[#0b2038] p-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
            <h1 className="text-xl font-bold">
              جارٍ تجهيز ساحة اللعب...
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              نتحقق من المشاركة ونحمّل الأسئلة.
            </p>
          </section>
        )}

        {status === "playing" && currentQuestion && (
          <>
            <header className="mb-6 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#102b48] to-[#08182b] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-300">
                    🐋 MARIS ARENA
                  </p>
                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                    ساحة التحدي
                  </h1>
                </div>

                <div
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    remainingSeconds <= 30
                      ? "border-red-400/40 bg-red-500/10 text-red-300"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  }`}
                >
                  <p className="text-xs">الوقت المتبقي</p>
                  <p
                    className="mt-1 font-mono text-2xl font-black"
                    aria-live="polite"
                  >
                    {formattedTime}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
                <span>
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span>
                  أُجيب عن {answeredCount} من {questions.length}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{
                    width: `${
                      ((currentIndex + 1) / questions.length) * 100
                    }%`,
                  }}
                />
              </div>
            </header>

            <section className="rounded-3xl border border-white/10 bg-[#0b2038] p-5 sm:p-8">
              <div className="mb-5 inline-flex rounded-xl bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-300">
                السؤال {currentQuestion.question_order}
              </div>

              <h2 className="whitespace-pre-wrap text-lg font-bold leading-8 sm:text-xl">
                {currentQuestion.question_text}
              </h2>

              <div className="mt-7 grid gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const alreadyAnswered =
                    savedAnswers[currentQuestion.question_id] !==
                    undefined;

                  return (
                    <button
                      key={`${currentQuestion.question_id}-${index}`}
                      type="button"
                      disabled={alreadyAnswered || submitting}
                      onClick={() => setSelectedOption(index)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-slate-200 hover:border-cyan-400/40 hover:bg-white/[0.04]"
                      } ${
                        alreadyAnswered
                          ? "cursor-not-allowed opacity-80"
                          : ""
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                          isSelected
                            ? "bg-cyan-400 text-[#061426]"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="pt-1 leading-6">{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => void submitAnswer()}
                    disabled={
                      selectedOption === null ||
                      submitting ||
                      savedAnswers[currentQuestion.question_id] !==
                        undefined
                    }
                    className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting
                      ? "جارٍ حفظ الإجابة..."
                      : "حفظ الإجابة والسؤال التالي ←"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        savedAnswers[currentQuestion.question_id] !==
                        undefined
                      ) {
                        void finishChallenge();
                      } else {
                        void submitAnswer();
                      }
                    }}
                    disabled={submitting || finishingRef.current}
                    className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting
                      ? "جارٍ الحفظ..."
                      : "حفظ الإجابة وإنهاء التحدي"}
                  </button>
                )}

                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((index) => index - 1)
                    }
                    disabled={submitting}
                    className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
                  >
                    السؤال السابق
                  </button>
                )}
              </div>

              <p className="mt-5 text-xs leading-6 text-slate-500">
                الإجابة تُحفظ عند الضغط على زر المتابعة. لا تغلق الصفحة
                قبل حفظ إجابتك.
              </p>
            </section>
          </>
        )}

        {status === "finished" && result && (
          <section className="rounded-3xl border border-cyan-400/20 bg-[#0b2038] p-6 text-center sm:p-10">
            <div className="text-5xl">🏆</div>
            <p className="mt-4 text-sm font-bold text-cyan-300">
              MARIS ARENA
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {result.already_finished
                ? "نتيجتك السابقة"
                : "أكملت التحدي!"}
            </h1>

            <div className="my-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
              <p className="text-sm text-slate-400">النتيجة النهائية</p>
              <p className="mt-2 text-5xl font-black text-cyan-300">
                {Number(result.score).toFixed(2)}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">
                  الإجابات الصحيحة
                </p>
                <p className="mt-2 text-2xl font-black">
                  {result.correct_answers}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">عدد الأسئلة</p>
                <p className="mt-2 text-2xl font-black">
                  {result.total_questions}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">مدة المحاولة</p>
                <p className="mt-2 text-xl font-black">
                  {Math.floor(result.duration_seconds / 60)} دقيقة{" "}
                  {result.duration_seconds % 60} ثانية
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/arena")}
              className="mt-7 w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300"
            >
              العودة إلى Arena
            </button>
          </section>
        )}

        {status === "error" && (
          <section className="rounded-3xl border border-red-400/20 bg-[#0b2038] p-6 sm:p-8">
            <h1 className="text-xl font-black text-red-300">
              تعذّر فتح التحدي
            </h1>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {errorMessage}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/arena")}
                className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-[#061426]"
              >
                العودة إلى Arena
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white"
              >
                إعادة المحاولة
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
