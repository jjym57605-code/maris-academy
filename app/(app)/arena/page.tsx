
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

const FEATURES = [
  {
    icon: "⚔️",
    number: "01",
    title: "تحدَّ زملاءك",
    description:
      "ادخل أجواء المنافسة واختبر مستواك العلمي أمام طلاب MARIS.",
    glow: "group-hover:shadow-cyan-500/10",
    accent: "text-cyan-300",
    iconBg: "bg-cyan-400/10 border-cyan-300/20",
  },
  {
    icon: "🎯",
    number: "02",
    title: "اختَر تخصصك",
    description:
      "ركّز على المواد والشعبة تاعك، وخلي كل إجابة تقرّبك لهدفك.",
    glow: "group-hover:shadow-blue-500/10",
    accent: "text-blue-300",
    iconBg: "bg-blue-400/10 border-blue-300/20",
  },
  {
    icon: "🏆",
    number: "03",
    title: "اصنع ترتيبك",
    description:
      "طوّر مستواك، حقّق نتائج أفضل، ونافس على المراتب الأولى.",
    glow: "group-hover:shadow-amber-500/10",
    accent: "text-amber-300",
    iconBg: "bg-amber-400/10 border-amber-300/20",
  },
];

const RESOURCES = [
  {
    href: "/quizzes",
    icon: "📝",
    title: "الاختبارات",
    description: "اختبر معلوماتك",
    action: "ابدأ المراجعة",
    accent: "group-hover:border-cyan-300/40",
  },
  {
    href: "/leaderboard",
    icon: "🏆",
    title: "لوحة الصدارة",
    description: "اكتشف ترتيبك",
    action: "شوف الترتيب",
    accent: "group-hover:border-amber-300/40",
  },
  {
    href: "/courses",
    icon: "📚",
    title: "الدروس",
    description: "قوّي مكتسباتك",
    action: "واصل التعلّم",
    accent: "group-hover:border-blue-300/40",
  },
];

type ArenaChallenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: "personal" | "official";
  subject_id: string;
  stream: string | null;
  question_count: number;
  duration_seconds: number;
  max_participants: number;
  status: "open" | "in_progress" | "finished";
  starts_at: string | null;
  ends_at: string | null;
};

type ArenaSubject = {
  id: string;
  name: string;
  stream: string | null;
};

type ParticipantCount = number | null;

type PersonalChallengeQuestion = {
  id: string;
  question_text: string;
  options: unknown;
  difficulty: string | null;
};

type PersonalChallengeResult = {
  challenge_id: string;
  access_code: string;
  title: string;
  question_count: number;
  duration_seconds: number;
  max_participants: number;
  status: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function ArenaChallenges() {
  const [challenges, setChallenges] = useState<ArenaChallenge[]>([]);
  const [subjects, setSubjects] = useState<ArenaSubject[]>([]);
  const [stream, setStream] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [participantCounts, setParticipantCounts] = useState<
    Record<string, ParticipantCount>
  >({});

  // إنشاء تحدٍّ شخصي
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSubjectId, setCreateSubjectId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("10");
  const [maxParticipants, setMaxParticipants] = useState("10");
  const [questions, setQuestions] = useState<PersonalChallengeQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdChallenge, setCreatedChallenge] =
    useState<PersonalChallengeResult | null>(null);
  const [createError, setCreateError] = useState("");
  const [createMessage, setCreateMessage] = useState("");

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        setError("تعذّر الاتصال بقاعدة البيانات.");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Arena authentication error:", authError);
        setError(`تعذّر التحقق من تسجيل الدخول: ${authError.message}`);
        return;
      }

      if (!user) {
        setError("سجّل الدخول باش تشوف التحديات المتاحة.");
        return;
      }

      const [profileResult, challengesResult, subjectsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("stream")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("arena_challenges")
            .select(
              "id,title,description,challenge_type,subject_id,stream,question_count,duration_seconds,max_participants,status,starts_at,ends_at"
            )
            .eq("status", "open")
            .order("created_at", { ascending: false }),

          supabase.from("subjects").select("id,name,stream"),
        ]);

      if (profileResult.error) {
        console.error("Arena profile error:", profileResult.error);
        setError(`تعذّر تحميل ملفك الشخصي: ${profileResult.error.message}`);
        return;
      }

      if (challengesResult.error) {
        console.error("Arena challenges error:", challengesResult.error);
        setError(`تعذّر تحميل التحديات: ${challengesResult.error.message}`);
        return;
      }

      if (subjectsResult.error) {
        console.error("Arena subjects error:", subjectsResult.error);
        setError(`تعذّر تحميل المواد: ${subjectsResult.error.message}`);
        return;
      }

      const loadedChallenges = (challengesResult.data ??
        []) as ArenaChallenge[];

      setStream(profileResult.data?.stream ?? null);
      setChallenges(loadedChallenges);
      setSubjects((subjectsResult.data ?? []) as ArenaSubject[]);

      const countResults = await Promise.all(
        loadedChallenges.map(async (challenge) => {
          const { count, error: countError } = await supabase
            .from("arena_participants")
            .select("id", { count: "exact", head: true })
            .eq("challenge_id", challenge.id);

          if (countError) {
            console.error(
              `Arena participant count error (${challenge.id}):`,
              countError
            );
          }

          return {
            challengeId: challenge.id,
            count: countError ? null : (count ?? 0),
          };
        })
      );

      setParticipantCounts(
        Object.fromEntries(
          countResults.map(({ challengeId, count }) => [
            challengeId,
            count,
          ])
        )
      );
    } catch (caughtError: unknown) {
      console.error("Arena load error:", caughtError);
      setError(
        getErrorMessage(caughtError, "وقع خطأ أثناء تحميل التحديات.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const availableChallenges = challenges.filter((challenge) => {
    if (!challenge.stream) return true;
    return !!stream && challenge.stream.trim() === stream.trim();
  });

  const availableSubjects = subjects
    .filter((subject) => {
      if (!subject.stream) return true;
      return !!stream && subject.stream.trim() === stream.trim();
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  useEffect(() => {
    if (
      createSubjectId &&
      availableSubjects.some((subject) => subject.id === createSubjectId)
    ) {
      return;
    }

    if (availableSubjects.length > 0) {
      setCreateSubjectId(availableSubjects[0].id);
    } else {
      setCreateSubjectId("");
    }
  }, [subjects, stream, createSubjectId]);

  useEffect(() => {
    if (!showCreateForm || !createSubjectId) {
      setQuestions([]);
      setSelectedQuestionIds([]);
      return;
    }

    let cancelled = false;

    async function loadQuestions() {
      setLoadingQuestions(true);
      setCreateError("");

      try {
        const supabase = getSupabase();

        if (!supabase) {
          throw new Error("تعذّر الاتصال بقاعدة البيانات.");
        }

        const selectedSubject = subjects.find(
          (subject) => subject.id === createSubjectId
        );

        const { data, error: questionsError } = await supabase.rpc(
          "arena_get_personal_challenge_questions",
          {
            p_subject_id: createSubjectId,
            p_stream: selectedSubject?.stream ?? stream,
          }
        );

        if (questionsError) throw questionsError;

        if (cancelled) return;

        const loadedQuestions = (data ?? []) as PersonalChallengeQuestion[];
        setQuestions(loadedQuestions);
        setSelectedQuestionIds([]);
      } catch (caughtError: unknown) {
        if (cancelled) return;

        setQuestions([]);
        setSelectedQuestionIds([]);
        setCreateError(
          `تعذّر تحميل الأسئلة: ${getErrorMessage(
            caughtError,
            "خطأ غير معروف."
          )}`
        );
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [showCreateForm, createSubjectId, stream, subjects]);

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds((current) => {
      if (current.includes(questionId)) {
        return current.filter((id) => id !== questionId);
      }

      if (current.length >= 100) {
        setCreateError("تقدر تختار حتى 100 سؤال فقط في التحدي الواحد.");
        return current;
      }

      setCreateError("");
      return [...current, questionId];
    });
  }

  async function createPersonalChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setCreateMessage("");
    setCreatedChallenge(null);

    const title = createTitle.trim();
    const description = createDescription.trim();
    const duration = Number(durationMinutes);
    const maximum = Number(maxParticipants);

    if (title.length < 3 || title.length > 100) {
      setCreateError("عنوان التحدي لازم يكون بين 3 و100 حرف.");
      return;
    }

    if (!createSubjectId) {
      setCreateError("اختَر المادة أولًا.");
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
      setCreateError("المدة لازم تكون بين دقيقة واحدة و120 دقيقة.");
      return;
    }

    if (
      !Number.isInteger(maximum) ||
      maximum < 2 ||
      maximum > 100
    ) {
      setCreateError("عدد المشاركين لازم يكون بين 2 و100.");
      return;
    }

    if (selectedQuestionIds.length === 0) {
      setCreateError("اختَر سؤالًا واحدًا على الأقل.");
      return;
    }

    if (
      selectedQuestionIds.some(
        (id) => !questions.some((question) => question.id === id)
      )
    ) {
      setCreateError("تبدّلت قائمة الأسئلة. عاود اختيار الأسئلة.");
      return;
    }

    setCreating(true);

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذّر الاتصال بقاعدة البيانات.");
      }

      const selectedSubject = subjects.find(
        (subject) => subject.id === createSubjectId
      );

      const { data, error: createRpcError } = await supabase.rpc(
        "arena_create_personal_challenge",
        {
          p_title: title,
          p_description: description || null,
          p_subject_id: createSubjectId,
          p_stream: selectedSubject?.stream ?? stream,
          p_duration_seconds: duration * 60,
          p_max_participants: maximum,
          p_question_ids: selectedQuestionIds,
        }
      );

      if (createRpcError) throw createRpcError;

      const result = (
        Array.isArray(data) ? data[0] : data
      ) as PersonalChallengeResult | null;

      if (!result?.access_code) {
        throw new Error("تم إرسال الطلب، لكن لم يصلنا كود الدعوة.");
      }

      setCreatedChallenge(result);
      setCreateMessage("تم إنشاء التحدي بنجاح! شارك كود الدعوة مع زملائك.");
      setCreateTitle("");
      setCreateDescription("");
      setDurationMinutes("10");
      setMaxParticipants("10");
      setSelectedQuestionIds([]);
      setShowCreateForm(false);

      await loadChallenges();
    } catch (caughtError: unknown) {
      console.error("Create personal challenge error:", caughtError);
      setCreateError(
        `تعذّر إنشاء التحدي: ${getErrorMessage(
          caughtError,
          "وقع خطأ غير متوقع."
        )}`
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyAccessCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCreateMessage("تم نسخ كود الدعوة بنجاح.");
    } catch (caughtError: unknown) {
      console.error("Copy access code error:", caughtError);
      setCreateError("ما قدرناش ننسخو الكود تلقائيًا. انسخو يدويًا.");
    }
  }

  async function joinChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const code = accessCode.trim();

    if (!code) {
      setError("دخل كود التحدي أولًا.");
      return;
    }

    setJoining(true);

    try {
      const supabase = getSupabase();

      if (!supabase) {
        setError("تعذّر الاتصال بقاعدة البيانات.");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Arena join authentication error:", authError);
        setError(`تعذّر التحقق من تسجيل الدخول: ${authError.message}`);
        return;
      }

      if (!user) {
        setError("سجّل الدخول قبل الانضمام للتحدي.");
        return;
      }

      const { data, error: joinError } = await supabase.rpc(
        "arena_join_challenge",
        { p_access_code: code }
      );

      if (joinError) {
        console.error("Arena join RPC error:", joinError);
        setError(
          `تعذّر الانضمام: ${joinError.message}${
            joinError.code ? ` (الرمز: ${joinError.code})` : ""
          }`
        );
        return;
      }

      if (!data) {
        setError("ما وصلناش تأكيد الانضمام. عاود حاول.");
        return;
      }

      const newParticipantId = String(data);

      window.location.href = `/arena/play?participant=${encodeURIComponent(
        newParticipantId
      )}`;
    } catch (caughtError: unknown) {
      console.error("Arena join unexpected error:", caughtError);
      setError(
        `وقع خطأ أثناء الانضمام: ${getErrorMessage(
          caughtError,
          "خطأ غير معروف."
        )}`
      );
    } finally {
      setJoining(false);
    }
  }

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) return `${seconds} ثانية`;
    if (remainingSeconds === 0) return `${minutes} دقيقة`;

    return `${minutes} د و ${remainingSeconds} ث`;
  }

  return (
    <section
      id="arena-challenges"
      className="space-y-5 rounded-3xl border border-cyan-300/15 bg-[#071727]/80 p-5 sm:p-7"
    >
      <div>
        <p className="mb-2 text-[10px] font-black tracking-[0.2em] text-cyan-300 sm:text-xs">
          LIVE CHALLENGES
        </p>

        <h2 className="text-xl font-black text-white sm:text-2xl">
          ⚔️ التحديات المتاحة
        </h2>

        <p className="mt-2 text-sm leading-7 text-slate-400">
          اكتشف التحديات المفتوحة لشعبتك، أو انضمّ مباشرة باستعمال الكود.
        </p>

        {stream && (
          <span className="mt-3 inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-bold text-cyan-200">
            شعبتك: {stream}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setCreateError("");
            setCreateMessage("");
          }}
          className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-5 py-3 text-sm font-black text-[#052033] transition hover:brightness-110"
        >
          <span className="text-xl">✨</span>
          <span>
            {showCreateForm ? "إغلاق نموذج الإنشاء" : "أنشئ تحديًا شخصيًا"}
          </span>
        </button>

        <a
          href="#join-arena-challenge"
          className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
        >
          <span className="text-xl">🔑</span>
          <span>عندي كود دعوة</span>
        </a>
      </div>

      {createMessage && (
        <div
          role="status"
          className="break-words rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm leading-6 text-emerald-200"
        >
          {createMessage}
        </div>
      )}

      {createdChallenge && (
        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/10 text-2xl">
              🏆
            </span>
            <div>
              <h3 className="font-black text-white">
                {createdChallenge.title}
              </h3>
              <p className="mt-1 text-xs text-cyan-200">
                التحدي جاهز لمشاركة كوده مع زملائك
              </p>
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">كود الدعوة</p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div
              dir="ltr"
              className="flex min-h-14 flex-1 items-center justify-center break-all rounded-xl border border-white/10 bg-black/20 px-4 text-center font-mono text-xl font-black tracking-widest text-cyan-200"
            >
              {createdChallenge.access_code}
            </div>

            <button
              type="button"
              onClick={() => void copyAccessCode(createdChallenge.access_code)}
              className="min-h-12 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#052033] transition hover:bg-cyan-200"
            >
              📋 نسخ الكود
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-lg bg-white/[0.05] px-3 py-2">
              📝 {createdChallenge.question_count} سؤال
            </span>
            <span className="rounded-lg bg-white/[0.05] px-3 py-2">
              ⏱️ {formatDuration(createdChallenge.duration_seconds)}
            </span>
            <span className="rounded-lg bg-white/[0.05] px-3 py-2">
              👥 حتى {createdChallenge.max_participants} مشارك
            </span>
          </div>
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={createPersonalChallenge}
          className="space-y-5 rounded-2xl border border-cyan-300/15 bg-black/15 p-4 sm:p-6"
        >
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
              CREATE YOUR CHALLENGE
            </p>
            <h3 className="mt-2 text-lg font-black text-white">
              🐋 اصنع تحدّيك الخاص
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              اختَر المادة والأسئلة، حدّد الوقت وعدد المشاركين، ومن بعد شارك
              كود الدعوة مع زملائك.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="arena-create-title"
              className="block text-sm font-bold text-slate-200"
            >
              عنوان التحدي
            </label>
            <input
              id="arena-create-title"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              required
              minLength={3}
              maxLength={100}
              placeholder="مثال: تحدي مراجعة الوحدة الأولى"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-[#061426] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="arena-create-subject"
              className="block text-sm font-bold text-slate-200"
            >
              المادة
            </label>
            <select
              id="arena-create-subject"
              value={createSubjectId}
              onChange={(event) => setCreateSubjectId(event.target.value)}
              required
              disabled={availableSubjects.length === 0}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-[#061426] px-4 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-50"
            >
              {availableSubjects.length === 0 && (
                <option value="">ما كاين حتى مادة متاحة لشعبتك</option>
              )}
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                  {subject.stream ? ` — ${subject.stream}` : ""}
                </option>
              ))}
            </select>
            {!stream && (
              <p className="text-xs leading-5 text-amber-200/80">
                ما قدرناش نحدّد شعبتك من ملفك الشخصي؛ المواد المرتبطة بشعبة
                معيّنة فقط راح تظهر إذا كانت شعبتك محددة.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="arena-create-description"
              className="block text-sm font-bold text-slate-200"
            >
              وصف التحدي <span className="font-normal text-slate-500">(اختياري)</span>
            </label>
            <textarea
              id="arena-create-description"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="اكتب ملاحظة قصيرة للمشاركين..."
              className="w-full resize-y rounded-xl border border-white/10 bg-[#061426] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="arena-create-duration"
                className="block text-sm font-bold text-slate-200"
              >
                ⏱️ المدة بالدقائق
              </label>
              <input
                id="arena-create-duration"
                type="number"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                min={1}
                max={120}
                step={1}
                required
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#061426] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
              />
              <p className="text-xs text-slate-500">من دقيقة إلى 120 دقيقة</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="arena-create-max-participants"
                className="block text-sm font-bold text-slate-200"
              >
                👥 الحد الأقصى للمشاركين
              </label>
              <input
                id="arena-create-max-participants"
                type="number"
                value={maxParticipants}
                onChange={(event) => setMaxParticipants(event.target.value)}
                min={2}
                max={100}
                step={1}
                required
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#061426] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
              />
              <p className="text-xs text-slate-500">من مشاركين إلى 100 مشارك</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-white">📝 اختَر أسئلة التحدي</h4>
                <p className="mt-1 text-xs text-slate-400">
                  الأسئلة المتاحة للمادة والشعبة المختارتين.
                </p>
              </div>

              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-black text-cyan-200">
                {selectedQuestionIds.length} مختار
              </span>
            </div>

            {loadingQuestions ? (
              <div className="rounded-xl border border-white/[0.08] p-5 text-center text-sm text-slate-400">
                جارٍ تحميل الأسئلة...
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
                <p className="text-2xl">📚</p>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  ما كاين حتى سؤال متاح لهذه المادة حاليًا
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  تأكد من وجود أسئلة منشورة ومتوافقة مع المادة والشعبة.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestionIds(
                        questions.slice(0, 100).map((question) => question.id)
                      );
                      setCreateError("");
                    }}
                    className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/10"
                  >
                    اختيار الكل (حتى 100)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestionIds([]);
                      setCreateError("");
                    }}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.05]"
                  >
                    إلغاء الاختيار
                  </button>
                </div>

                <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-white/[0.07] p-2">
                  {questions.map((question, index) => {
                    const checked = selectedQuestionIds.includes(question.id);

                    return (
                      <label
                        key={question.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                          checked
                            ? "border-cyan-300/30 bg-cyan-300/[0.07]"
                            : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestion(question.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="mb-1 block text-[10px] font-bold text-cyan-300">
                            السؤال {index + 1}
                            {question.difficulty
                              ? ` · ${question.difficulty}`
                              : ""}
                          </span>
                          <span className="block whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                            {question.question_text}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {createError && (
            <p
              role="alert"
              className="break-words rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm leading-6 text-red-200"
            >
              {createError}
            </p>
          )}

          <button
            type="submit"
            disabled={
              creating ||
              loadingQuestions ||
              !createSubjectId ||
              selectedQuestionIds.length === 0
            }
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-5 py-3 text-sm font-black text-[#052033] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "⏳ جارٍ إنشاء التحدي..." : "🚀 أنشئ التحدي واحصل على كود الدعوة"}
          </button>

          <p className="text-xs leading-6 text-slate-500">
            بإنشاء التحدي، راجع عنوانه وأسئلته قبل مشاركته مع زملائك.
          </p>
        </form>
      )}

      <div id="join-arena-challenge" className="scroll-mt-6">
        <h3 className="mb-3 text-sm font-black text-white">
          🔑 الانضمام باستعمال كود الدعوة
        </h3>

        <form
          onSubmit={joinChallenge}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="دخل كود التحدي..."
            aria-label="كود التحدي"
            autoComplete="off"
            maxLength={100}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
          />

          <button
            type="submit"
            disabled={joining || !accessCode.trim()}
            className="min-h-12 rounded-xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-6 text-sm font-black text-[#052033] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {joining ? "جارٍ الانضمام..." : "انضمّ للتحدي ←"}
          </button>
        </form>
      </div>

      {error && (
        <p
          role="alert"
          className="break-words rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/[0.07] p-6 text-center text-sm text-slate-400">
          جارٍ تحميل التحديات...
        </div>
      ) : availableChallenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-3xl">🌊</p>
          <p className="mt-3 font-bold text-white">
            ما كاين حتى تحدي مفتوح لشعبتك حاليًا
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            أنشئ تحديك الخاص أو استعمل كود التحدي إذا عطاهولك المنظّم.
          </p>
          <button
            type="button"
            onClick={() => void loadChallenges()}
            className="mt-4 rounded-xl border border-cyan-300/20 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/10"
          >
            تحديث القائمة ↻
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {availableChallenges.map((challenge) => {
            const subject = subjects.find(
              (item) => item.id === challenge.subject_id
            );
            const participantCount = participantCounts[challenge.id];
            const personal = challenge.challenge_type === "personal";

            return (
              <article
                key={challenge.id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-cyan-300/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${
                      personal
                        ? "border-violet-300/20 bg-violet-300/[0.08]"
                        : "border-cyan-300/15 bg-cyan-300/[0.07]"
                    }`}
                  >
                    {personal ? "✨" : "⚔️"}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold ${
                        personal
                          ? "border-violet-300/20 bg-violet-300/[0.06] text-violet-200"
                          : "border-blue-300/20 bg-blue-300/[0.06] text-blue-200"
                      }`}
                    >
                      {personal ? "تحدي شخصي" : "تحدي رسمي"}
                    </span>
                    <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1 text-[10px] font-bold text-emerald-200">
                      مفتوح للانضمام
                    </span>
                  </div>
                </div>

                <h3 className="mt-4 break-words text-lg font-black text-white">
                  {challenge.title}
                </h3>

                {challenge.description && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                    {challenge.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2">
                    📚 {subject?.name ?? "مادة"}
                  </span>
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2">
                    📝 {challenge.question_count} سؤال
                  </span>
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2">
                    ⏱️ {formatDuration(challenge.duration_seconds)}
                  </span>
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2">
                    👥{" "}
                    {participantCount === undefined
                      ? "جارٍ تحميل العدد..."
                      : participantCount === null
                        ? "تعذّر تحميل العدد"
                        : `${participantCount} / ${challenge.max_participants} مشارك`}
                  </span>
                </div>

                {challenge.ends_at && (
                  <p className="mt-3 text-xs text-amber-200/80">
                    نهاية التسجيل/التحدي:{" "}
                    {new Date(challenge.ends_at).toLocaleString("ar-DZ")}
                  </p>
                )}

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  للانضمام، أدخل كود هذا التحدي في الخانة أعلاه.
                </p>
              </article>
            );
          })}
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => void loadChallenges()}
          className="text-xs font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          ↻ تحديث التحديات
        </button>
      )}
    </section>
  );
}

export default function ArenaPage() {
  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden pb-12 text-slate-100"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[100px]" />
        <div className="absolute top-[35%] -left-40 h-96 w-96 rounded-full bg-blue-600/[0.08] blur-[110px]" />
        <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-indigo-500/[0.05] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-3 sm:space-y-10 sm:px-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 backdrop-blur-xl sm:px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/20 to-blue-500/10 text-2xl">
              🐋
            </div>
            <div>
              <p className="text-sm font-black tracking-wide text-white">
                MARIS <span className="text-cyan-300">ARENA PRO</span>
              </p>
              <p className="mt-0.5 text-[10px] font-medium tracking-[0.18em] text-slate-500">
                THE BATTLE OF KNOWLEDGE
              </p>
            </div>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 text-xs font-bold text-amber-200 transition hover:border-amber-300/30 hover:bg-amber-300/10 sm:px-4 sm:text-sm"
          >
            <span>🏆</span>
            <span>لوحة الصدارة</span>
            <span aria-hidden="true">←</span>
          </Link>
        </div>

        <section className="relative isolate overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#071727] shadow-2xl shadow-cyan-950/20 sm:rounded-[36px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -top-28 left-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-[90px]" />
            <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(148,220,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(148,220,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="absolute -left-10 top-10 h-48 w-48 rounded-full border border-cyan-300/10 sm:h-72 sm:w-72" />
            <div className="absolute -left-2 top-20 h-32 w-32 rounded-full border border-cyan-300/[0.07] sm:h-56 sm:w-56" />
          </div>

          <div className="relative grid items-center gap-8 p-5 sm:p-8 md:grid-cols-[1.2fr_0.8fr] md:gap-5 md:p-12 lg:p-14">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3.5 py-2 text-xs font-bold text-cyan-200 sm:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                <span>عقلك هو سلاحك الأقوى</span>
              </div>

              <p className="mb-3 text-xs font-bold tracking-[0.22em] text-cyan-300/70 sm:text-sm">
                WELCOME TO THE ARENA
              </p>

              <h1 className="max-w-2xl text-4xl font-black leading-[1.35] tracking-tight text-white sm:text-5xl lg:text-6xl">
                هنا تبدأ
                <span className="block bg-gradient-to-l from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  أسطورتك العلمية
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-8 text-slate-300 sm:text-base sm:leading-9">
                مرحبًا بيك في ساحة MARIS ARENA PRO، وين المعرفة تتحوّل
                لمنافسة، وكل سؤال يعطيك فرصة باش تثبت قدراتك وتقرب أكثر
                من هدفك في البكالوريا.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#arena-challenges"
                  className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-6 py-3.5 text-sm font-black text-[#052033] shadow-lg shadow-cyan-500/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-400/20"
                >
                  <span>⚡</span>
                  <span>اكتشف التحديات</span>
                  <span className="transition-transform group-hover:-translate-x-1">
                    ←
                  </span>
                </a>

                <Link
                  href="/courses"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-cyan-300/25 hover:bg-white/[0.07]"
                >
                  <span>📚</span>
                  <span>حضّر روحك</span>
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.08] pt-5 text-xs text-slate-400 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="text-cyan-300">✦</span>
                  تعلّم بذكاء
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-blue-300">✦</span>
                  نافس بشرف
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-amber-300">✦</span>
                  حقّق هدفك
                </span>
              </div>
            </div>

            <div className="relative mx-auto flex min-h-56 w-full max-w-sm items-center justify-center sm:min-h-72 md:min-h-80">
              <div
                aria-hidden="true"
                className="absolute h-48 w-48 rounded-full border border-cyan-300/[0.12] sm:h-64 sm:w-64"
              />
              <div
                aria-hidden="true"
                className="absolute h-36 w-36 rounded-full border border-dashed border-cyan-300/20 sm:h-52 sm:w-52"
              />
              <div className="absolute h-40 w-40 rounded-full bg-cyan-400/[0.12] blur-3xl sm:h-56 sm:w-56" />
              <div className="relative flex h-36 w-36 items-center justify-center rounded-[34px] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/[0.16] via-blue-400/[0.08] to-transparent shadow-2xl shadow-cyan-950/30 backdrop-blur-sm sm:h-44 sm:w-44 sm:rounded-[42px]">
                <div className="absolute inset-2 rounded-[27px] border border-white/[0.06] sm:rounded-[35px]" />
                <span className="select-none text-7xl drop-shadow-[0_0_28px_rgba(103,232,249,0.25)] sm:text-8xl">
                  🐋
                </span>
              </div>

              <div className="absolute right-0 top-5 rounded-2xl border border-white/10 bg-[#0c2135]/90 px-3.5 py-3 shadow-xl backdrop-blur-xl sm:right-1 sm:top-8 sm:px-4">
                <p className="text-[10px] text-slate-400 sm:text-xs">
                  سلاحك الأقوى
                </p>
                <p className="mt-1 text-sm font-black text-cyan-200 sm:text-base">
                  🧠 المعرفة
                </p>
              </div>

              <div className="absolute bottom-4 left-0 rounded-2xl border border-amber-300/15 bg-[#0c2135]/90 px-3.5 py-3 shadow-xl backdrop-blur-xl sm:bottom-7 sm:left-1 sm:px-4">
                <p className="text-[10px] text-slate-400 sm:text-xs">
                  هدفك القادم
                </p>
                <p className="mt-1 text-sm font-black text-amber-200 sm:text-base">
                  🏆 التفوق
                </p>
              </div>

              <div className="absolute bottom-3 right-6 text-xl text-cyan-300/50 sm:right-10">
                ✦
              </div>
              <div className="absolute left-8 top-5 text-sm text-blue-300/60 sm:left-12 sm:top-8">
                ✧
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-white/[0.08] bg-black/10">
            {[
              { icon: "⚔️", title: "المنافسة", subtitle: "تحدّى قدراتك" },
              { icon: "🎯", title: "التركيز", subtitle: "تعلّم باستمرار" },
              { icon: "🚀", title: "التطور", subtitle: "خطوة نحو النجاح" },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`flex items-center justify-center gap-2.5 px-2 py-4 sm:gap-3 sm:py-5 ${
                  index !== 2 ? "border-l border-white/[0.07]" : ""
                }`}
              >
                <span className="text-lg sm:text-2xl">{item.icon}</span>
                <div>
                  <p className="text-[11px] font-black text-white sm:text-sm">
                    {item.title}
                  </p>
                  <p className="mt-1 hidden text-[10px] text-slate-500 sm:block sm:text-xs">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ArenaChallenges />

        <section>
          <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.2em] text-cyan-300 sm:text-xs">
                YOUR JOURNEY
              </p>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                رحلتك نحو القمّة
              </h2>
              <p className="mt-2 text-xs leading-6 text-slate-400 sm:text-sm">
                ثلاث خطوات تخليك تتقدّم كل يوم.
              </p>
            </div>
            <span className="hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-400 sm:block">
              MARIS ACADEMY ²⁰²⁷
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-5 shadow-lg shadow-black/5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-xl ${feature.glow} sm:p-6`}
              >
                <span className="absolute left-4 top-4 text-xs font-black tracking-widest text-white/15">
                  {feature.number}
                </span>
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition duration-300 group-hover:scale-105 ${feature.iconBg}`}
                >
                  {feature.icon}
                </div>
                <h3 className={`text-lg font-black text-white ${feature.accent}`}>
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
                <div className="mt-5 h-px w-full bg-gradient-to-l from-white/10 via-white/[0.04] to-transparent" />
                <span className="mt-4 block text-[10px] font-bold tracking-[0.15em] text-slate-500">
                  MARIS ARENA PRO
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-l from-[#0b263c] via-[#0a1c30] to-[#091727] p-5 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full bg-cyan-400/[0.08] blur-3xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-cyan-300">
                <span>🌊</span>
                <span>استعد قبل المنافسة</span>
              </div>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                كل بطل يبدأ بالتحضير
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                راجع دروسك، جرّب الاختبارات، وطوّر معلوماتك. كل دقيقة
                تستثمرها اليوم تقدر تصنع الفرق في نتيجتك غدوة.
              </p>
            </div>
            <div className="hidden shrink-0 text-5xl opacity-80 sm:block">
              🧭
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            {RESOURCES.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className={`group flex min-h-28 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/15 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.04] ${resource.accent}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-2xl transition group-hover:scale-105">
                  {resource.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white">
                    {resource.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {resource.description}
                  </p>
                  <p className="mt-2 text-xs font-bold text-cyan-300">
                    {resource.action}{" "}
                    <span className="inline-block transition-transform group-hover:-translate-x-1">
                      ←
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pb-2 text-center">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-600 sm:text-xs">
            BUILT FOR THE NEXT GENERATION
          </p>
          <p className="mt-2 text-xs text-slate-500">
            MARIS ACADEMY <span className="text-cyan-300">²⁰²⁷</span> ·
            المعرفة تصنع الفرق
          </p>
        </footer>
      </div>
    </main>
  );
}
