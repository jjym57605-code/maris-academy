
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
};

type ChallengeStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "finished"
  | "cancelled";

type ArenaChallenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: "personal" | "official";
  created_by: string | null;
  subject_id: string;
  stream: string | null;
  question_count: number;
  duration_seconds: number;
  max_participants: number;
  access_code: string;
  status: ChallengeStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type ChallengeForm = {
  title: string;
  description: string;
  subject_id: string;
  stream: string;
  duration_minutes: number;
  max_participants: number;
  starts_at: string;
  ends_at: string;
  selected_questions: string[];
};

const STREAMS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
  "تسيير واقتصاد",
  "آداب وفلسفة",
  "لغات أجنبية",
];

const EMPTY_FORM: ChallengeForm = {
  title: "",
  description: "",
  subject_id: "",
  stream: "",
  duration_minutes: 10,
  max_participants: 30,
  starts_at: "",
  ends_at: "",
  selected_questions: [],
};

const CHALLENGE_COLUMNS =
  "id, title, description, challenge_type, created_by, subject_id, stream, question_count, duration_seconds, max_participants, access_code, status, starts_at, ends_at, created_at";

const STATUS_INFO: Record<
  ChallengeStatus,
  { label: string; color: string; dot: string }
> = {
  draft: {
    label: "مسودة",
    color: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  open: {
    label: "مفتوح للتسجيل",
    color: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  in_progress: {
    label: "جارٍ الآن",
    color: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    dot: "bg-cyan-400",
  },
  finished: {
    label: "منتهٍ",
    color: "border-slate-400/20 bg-slate-400/10 text-slate-300",
    dot: "bg-slate-400",
  },
  cancelled: {
    label: "ملغى",
    color: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
};

function makeAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "تاريخ غير صالح";

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "وقع خطأ غير متوقع. حاول مرة أخرى.";
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const info = STATUS_INFO[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${info.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
  accent = "cyan",
}: {
  label: string;
  value: number;
  icon: string;
  description: string;
  accent?: "cyan" | "emerald" | "amber" | "violet";
}) {
  const accents = {
    cyan: "border-cyan-400/20 from-cyan-400/10",
    emerald: "border-emerald-400/20 from-emerald-400/10",
    amber: "border-amber-400/20 from-amber-400/10",
    violet: "border-violet-400/20 from-violet-400/10",
  };

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accents[accent]} to-transparent p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-xl">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export default function AdminArenaChallengesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyChallengeId, setBusyChallengeId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [challenges, setChallenges] = useState<ArenaChallenge[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ChallengeForm>({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionDifficulty, setQuestionDifficulty] = useState("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = useMemo(() => getSupabase(), []);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [subjectResult, questionResult, challengeResult] =
        await Promise.all([
          supabase
            .from("subjects")
            .select("id, name, stream")
            .order("name", { ascending: true }),

          supabase
            .from("arena_questions")
            .select(
              "id, subject_id, stream, question_text, options, difficulty, is_published"
            )
            .eq("is_published", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("arena_challenges")
            .select(CHALLENGE_COLUMNS)
            .order("created_at", { ascending: false }),
        ]);

      if (subjectResult.error) throw subjectResult.error;
      if (questionResult.error) throw questionResult.error;
      if (challengeResult.error) throw challengeResult.error;

      setSubjects((subjectResult.data || []) as Subject[]);

      setQuestions(
        (questionResult.data || []).map((question) => ({
          ...question,
          options: Array.isArray(question.options)
            ? question.options
            : [],
        })) as ArenaQuestion[]
      );

      setChallenges((challengeResult.data || []) as ArenaChallenge[]);
    } catch (loadError) {
      console.error(loadError);
      setError(`تعذر تحميل بيانات الساحة: ${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedSubject = subjects.find(
    (subject) => subject.id === form.subject_id
  );

  const availableQuestions = useMemo(() => {
    return questions.filter((question) => {
      const subjectMatches = question.subject_id === form.subject_id;

      const streamMatches =
        !form.stream ||
        !question.stream ||
        question.stream === form.stream;

      const searchMatches = question.question_text
        .toLocaleLowerCase()
        .includes(questionSearch.trim().toLocaleLowerCase());

      const difficultyMatches =
        questionDifficulty === "all" ||
        question.difficulty === questionDifficulty;

      return (
        subjectMatches &&
        streamMatches &&
        searchMatches &&
        difficultyMatches
      );
    });
  }, [questions, form.subject_id, form.stream, questionSearch, questionDifficulty]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((challenge) => {
      const searchMatches = [
        challenge.title,
        challenge.access_code,
        challenge.description || "",
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase());

      const statusMatches =
        statusFilter === "all" || challenge.status === statusFilter;

      const streamMatches =
        streamFilter === "all" || challenge.stream === streamFilter;

      return searchMatches && statusMatches && streamMatches;
    });
  }, [challenges, search, statusFilter, streamFilter]);

  const stats = useMemo(
    () => ({
      total: challenges.length,
      open: challenges.filter((item) => item.status === "open").length,
      running: challenges.filter((item) => item.status === "in_progress")
        .length,
      drafts: challenges.filter((item) => item.status === "draft").length,
    }),
    [challenges]
  );

  function openCreateForm() {
    setForm({ ...EMPTY_FORM });
    setQuestionSearch("");
    setQuestionDifficulty("all");
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeCreateForm() {
    if (saving) return;
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
  }

  function updateForm<K extends keyof ChallengeForm>(
    key: K,
    value: ChallengeForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleQuestion(questionId: string) {
    setForm((current) => {
      const exists = current.selected_questions.includes(questionId);

      if (exists) {
        return {
          ...current,
          selected_questions: current.selected_questions.filter(
            (id) => id !== questionId
          ),
        };
      }

      if (current.selected_questions.length >= 100) {
        setError("ما تقدرش تزيد أكثر من 100 سؤال في التحدي الواحد.");
        return current;
      }

      return {
        ...current,
        selected_questions: [...current.selected_questions, questionId],
      };
    });

    setError("");
  }

  function selectVisibleQuestions() {
    const visibleIds = availableQuestions.map((question) => question.id);

    setForm((current) => {
      const merged = new Set([
        ...current.selected_questions,
        ...visibleIds,
      ]);

      if (merged.size > 100) {
        setError("اختيار الأسئلة يتجاوز الحد الأقصى، وهو 100 سؤال.");
        return current;
      }

      setError("");

      return {
        ...current,
        selected_questions: Array.from(merged),
      };
    });
  }

  function clearSelectedQuestions() {
    setForm((current) => ({ ...current, selected_questions: [] }));
    setError("");
  }

  async function createChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    if (!form.title.trim()) {
      setError("اكتب عنوان التحدي.");
      return;
    }

    if (!form.subject_id) {
      setError("اختار المادة.");
      return;
    }

    if (
      form.selected_questions.length < 1 ||
      form.selected_questions.length > 100
    ) {
      setError("اختار بين سؤال واحد و100 سؤال.");
      return;
    }

    if (
      form.duration_minutes < 0.5 ||
      form.duration_minutes > 120
    ) {
      setError("مدة التحدي لازم تكون بين 30 ثانية وساعتين.");
      return;
    }

    if (
      form.max_participants < 2 ||
      form.max_participants > 10000
    ) {
      setError("عدد المشاركين لازم يكون بين 2 و10000.");
      return;
    }

    const startsAt = form.starts_at
      ? new Date(form.starts_at).toISOString()
      : null;

    const endsAt = form.ends_at
      ? new Date(form.ends_at).toISOString()
      : null;

    if (form.starts_at && Number.isNaN(Date.parse(form.starts_at))) {
      setError("وقت البداية غير صالح.");
      return;
    }

    if (form.ends_at && Number.isNaN(Date.parse(form.ends_at))) {
      setError("وقت النهاية غير صالح.");
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError("وقت النهاية لازم يكون بعد وقت البداية.");
      return;
    }

    const selectedQuestions = questions.filter((question) =>
      form.selected_questions.includes(question.id)
    );

    if (selectedQuestions.length !== form.selected_questions.length) {
      setError("بعض الأسئلة المختارة لم تعد متاحة. حدّث الصفحة وحاول مجددًا.");
      return;
    }

    if (
      selectedQuestions.some(
        (question) =>
          question.subject_id !== form.subject_id ||
          (form.stream &&
            question.stream &&
            question.stream !== form.stream)
      )
    ) {
      setError("تأكد أن جميع الأسئلة تنتمي للمادة والشعبة المختارتين.");
      return;
    }

    setSaving(true);

    let challengeId: string | null = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("لازم تكون مسجّل الدخول لإنشاء التحدي.");
      }

      const accessCode = makeAccessCode();

      const { data: createdChallenge, error: createError } = await supabase
        .from("arena_challenges")
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          challenge_type: "official",
          created_by: user.id,
          subject_id: form.subject_id,
          stream: form.stream || selectedSubject?.stream || null,
          question_count: form.selected_questions.length,
          duration_seconds: Math.round(form.duration_minutes * 60),
          max_participants: Math.round(form.max_participants),
          access_code: accessCode,
          status: "draft",
          starts_at: startsAt,
          ends_at: endsAt,
          prizes: [],
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) throw createError;

      challengeId = createdChallenge.id;

      const orderedQuestions = form.selected_questions.map(
        (questionId, index) => ({
          challenge_id: createdChallenge.id,
          question_id: questionId,
          question_order: index + 1,
        })
      );

      const { error: linkError } = await supabase
        .from("arena_challenge_questions")
        .insert(orderedQuestions);

      if (linkError) {
        await supabase
          .from("arena_challenge_questions")
          .delete()
          .eq("challenge_id", createdChallenge.id);

        await supabase
          .from("arena_challenges")
          .delete()
          .eq("id", createdChallenge.id);

        challengeId = null;
        throw new Error(
          `تعذر ربط الأسئلة بالتحدي. لم نكمل إنشاءه: ${linkError.message}`
        );
      }

      setSuccess(
        `تم إنشاء التحدي "${form.title.trim()}" كمسودة. رمز الدخول: ${accessCode}`
      );

      setShowForm(false);
      setForm({ ...EMPTY_FORM });

      await loadData();
    } catch (createError) {
      console.error("Arena challenge creation failed:", {
        challengeId,
        error: createError,
      });

      setError(`تعذر إنشاء التحدي: ${getErrorMessage(createError)}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateChallengeStatus(
    challenge: ArenaChallenge,
    nextStatus: "open" | "finished" | "cancelled"
  ) {
    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    const messages = {
      open: "فتح التسجيل في هذا التحدي؟",
      finished: "إنهاء التحدي؟ سيتم استدعاء إجراء الإنهاء الموجود في قاعدة البيانات.",
      cancelled: "إلغاء هذا التحدي؟",
    };

    if (!window.confirm(messages[nextStatus])) return;

    setError("");
    setSuccess("");
    setBusyChallengeId(challenge.id);

    try {
      if (nextStatus === "finished") {
        const { data, error: closeError } = await supabase.rpc(
          "arena_close_challenge",
          { p_challenge_id: challenge.id }
        );

        if (closeError) throw closeError;

        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          data.success === false
        ) {
          throw new Error(
            "قاعدة البيانات لم تسمح بإنهاء التحدي. تحقق من حالة التحدي."
          );
        }
      } else {
        const updatePayload: {
          status: "open" | "cancelled";
          updated_at: string;
          starts_at?: string;
        } = {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };

        if (nextStatus === "open" && !challenge.starts_at) {
          updatePayload.starts_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from("arena_challenges")
          .update(updatePayload)
          .eq("id", challenge.id);

        if (updateError) throw updateError;
      }

      setSuccess(
        nextStatus === "open"
          ? "تم فتح التسجيل في التحدي."
          : nextStatus === "finished"
            ? "تم إرسال طلب إنهاء التحدي."
            : "تم إلغاء التحدي."
      );

      await loadData();
    } catch (actionError) {
      console.error(actionError);
      setError(`تعذر تحديث التحدي: ${getErrorMessage(actionError)}`);
    } finally {
      setBusyChallengeId(null);
    }
  }

  async function copyAccessCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess(`تم نسخ رمز الدخول: ${code}`);
      setError("");
    } catch {
      setSuccess(`رمز الدخول: ${code}`);
      setError("تعذر النسخ التلقائي. انسخ الرمز يدويًا.");
    }
  }

  function subjectName(subjectId: string) {
    return (
      subjects.find((subject) => subject.id === subjectId)?.name ||
      "مادة غير معروفة"
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#050c17] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/[0.08] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/admin" className="transition hover:text-cyan-300">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <Link
                href="/admin/arena"
                className="transition hover:text-cyan-300"
              >
                بنك الأسئلة
              </Link>
              <span>/</span>
              <span className="text-cyan-300">إدارة التحديات</span>
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-blue-600/10 text-3xl shadow-lg shadow-cyan-950/20">
                🐋
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black tracking-[0.2em] text-cyan-300">
                    MARIS ARENA
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200">
                    CONTROL CENTER
                  </span>
                </div>

                <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                  مركز إدارة التحديات
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              أنشئ تحديات البكالوريا، اربطها ببنك الأسئلة، ونظّم المنافسة
              بين الطلاب من مكان واحد.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/arena"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
            >
              <span>❓</span>
              بنك الأسئلة
            </Link>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              تحديث
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-5 font-black text-[#04111e] shadow-lg shadow-cyan-950/30 transition hover:brightness-110"
            >
              <span className="text-xl">＋</span>
              إنشاء تحدٍّ
            </button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-l from-[#0d2841] via-[#0a1c30] to-[#081321] p-5 sm:p-8">
          <div className="pointer-events-none absolute -left-8 top-0 text-[130px] opacity-[0.05]">
            🐋
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                MARIS COMPETITION SYSTEM
              </div>

              <h2 className="max-w-2xl text-2xl font-black leading-tight sm:text-3xl">
                كل تحدٍّ جديد، فرصة جديدة للتفوّق.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80">
                اختار المادة والشعبة، حدّد الأسئلة والمدة، وأنشئ تحديًا
                جاهزًا للفتح عند الحاجة. كل تحدٍّ يُحفظ في قاعدة البيانات
                برمز دخول خاص به.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-400">الأسئلة المنشورة</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">
                  {questions.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-400">المواد المتاحة</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {subjects.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4 text-sm leading-6 text-red-200"
          >
            <span className="text-lg">⚠️</span>
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-200/70 hover:text-white"
              aria-label="إغلاق رسالة الخطأ"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm leading-6 text-emerald-200"
          >
            <span className="text-lg">✓</span>
            <p className="min-w-0 flex-1">{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="shrink-0 text-emerald-200/70 hover:text-white"
              aria-label="إغلاق رسالة النجاح"
            >
              ✕
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="إجمالي التحديات"
            value={stats.total}
            icon="⚔️"
            description="كل التحديات المسجلة"
            accent="cyan"
          />
          <StatCard
            label="مفتوحة للتسجيل"
            value={stats.open}
            icon="🌊"
            description="تحديات تستقبل المشاركين"
            accent="emerald"
          />
          <StatCard
            label="تحديات جارية"
            value={stats.running}
            icon="🎯"
            description="المنافسات قيد التنفيذ"
            accent="violet"
          />
          <StatCard
            label="المسودات"
            value={stats.drafts}
            icon="📝"
            description="تحديات لم تُفتح بعد"
            accent="amber"
          />
        </section>

        {showForm && (
          <section
            id="create-challenge"
            className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#091523] shadow-2xl shadow-black/20"
          >
            <div className="border-b border-white/[0.07] bg-gradient-to-l from-cyan-400/[0.08] to-transparent p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-xs font-black tracking-widest text-cyan-300">
                    NEW CHALLENGE
                  </div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    إنشاء تحدٍّ جديد
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    عمّر المعلومات، اختار الأسئلة، ثم احفظ التحدي كمسودة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={saving}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                  aria-label="إغلاق النموذج"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={createChallenge} className="space-y-7 p-5 sm:p-7">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 font-black text-cyan-300">
                    01
                  </span>
                  <div>
                    <h3 className="font-black">المعلومات الأساسية</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      عرّف التحدي والمواد المستهدفة.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="عنوان التحدي">
                    <input
                      required
                      maxLength={150}
                      value={form.title}
                      onChange={(event) =>
                        updateForm("title", event.target.value)
                      }
                      placeholder="مثال: تحدي الفيزياء — الفصل الأول"
                      className="arena-input"
                    />
                  </Field>

                  <Field label="الشعبة">
                    <select
                      value={form.stream}
                      onChange={(event) => {
                        const nextStream = event.target.value;

                        setForm((current) => ({
                          ...current,
                          stream: nextStream,
                          subject_id: "",
                          selected_questions: [],
                        }));
                      }}
                      className="arena-input"
                    >
                      <option value="">كل الشعب / غير محددة</option>
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
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          subject_id: event.target.value,
                          selected_questions: [],
                        }));
                      }}
                      className="arena-input"
                    >
                      <option value="">اختار المادة</option>
                      {subjects
                        .filter(
                          (subject) =>
                            !form.stream ||
                            !subject.stream ||
                            subject.stream === form.stream
                        )
                        .map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                            {subject.stream ? ` — ${subject.stream}` : ""}
                          </option>
                        ))}
                    </select>
                  </Field>

                  <Field
                    label="وصف التحدي"
                    hint="اختياري: اكتب تعليمات قصيرة للمشاركين."
                  >
                    <input
                      maxLength={500}
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      placeholder="وصف مختصر للتحدي..."
                      className="arena-input"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-white/[0.07] pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 font-black text-cyan-300">
                    02
                  </span>
                  <div>
                    <h3 className="font-black">إعدادات المنافسة</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      اضبط الوقت والعدد والجدولة.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="مدة التحدي بالدقائق"
                    hint="من 0.5 دقيقة إلى 120 دقيقة."
                  >
                    <input
                      type="number"
                      min={0.5}
                      max={120}
                      step={0.5}
                      required
                      value={form.duration_minutes}
                      onChange={(event) =>
                        updateForm(
                          "duration_minutes",
                          Number(event.target.value)
                        )
                      }
                      className="arena-input"
                    />
                  </Field>

                  <Field
                    label="الحد الأقصى للمشاركين"
                    hint="من مشاركين اثنين إلى 10000."
                  >
                    <input
                      type="number"
                      min={2}
                      max={10000}
                      step={1}
                      required
                      value={form.max_participants}
                      onChange={(event) =>
                        updateForm(
                          "max_participants",
                          Number(event.target.value)
                        )
                      }
                      className="arena-input"
                    />
                  </Field>

                  <Field
                    label="تاريخ البداية"
                    hint="اختياري. اتركه فارغًا لضبط البداية عند فتح التسجيل."
                  >
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(event) =>
                        updateForm("starts_at", event.target.value)
                      }
                      className="arena-input"
                    />
                  </Field>

                  <Field
                    label="تاريخ النهاية"
                    hint="اختياري. إذا حددته، لازم يكون بعد البداية."
                  >
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(event) =>
                        updateForm("ends_at", event.target.value)
                      }
                      className="arena-input"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-white/[0.07] pt-6">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 font-black text-cyan-300">
                      03
                    </span>
                    <div>
                      <h3 className="font-black">اختيار أسئلة التحدي</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        تظهر الأسئلة المنشورة المناسبة للمادة والشعبة.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2.5">
                    <span className="text-xs text-slate-400">المختارة</span>
                    <span className="text-lg font-black text-cyan-300">
                      {form.selected_questions.length}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                </div>

                {!form.subject_id ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                    <div className="text-3xl">📚</div>
                    <p className="mt-3 font-bold">
                      اختار المادة أولًا
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      من بعد راح يظهرولك الأسئلة المنشورة الخاصة بها.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_190px_auto_auto]">
                      <input
                        value={questionSearch}
                        onChange={(event) =>
                          setQuestionSearch(event.target.value)
                        }
                        placeholder="ابحث داخل نص السؤال..."
                        className="arena-input"
                      />

                      <select
                        value={questionDifficulty}
                        onChange={(event) =>
                          setQuestionDifficulty(event.target.value)
                        }
                        className="arena-input"
                      >
                        <option value="all">كل مستويات الصعوبة</option>
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>

                      <button
                        type="button"
                        onClick={selectVisibleQuestions}
                        disabled={availableQuestions.length === 0}
                        className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/15 disabled:opacity-40"
                      >
                        اختيار الظاهر
                      </button>

                      <button
                        type="button"
                        onClick={clearSelectedQuestions}
                        disabled={form.selected_questions.length === 0}
                        className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
                      >
                        إلغاء الاختيار
                      </button>
                    </div>

                    {availableQuestions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                        <div className="text-3xl">🔎</div>
                        <p className="mt-3 font-bold">
                          ما لقيناش أسئلة منشورة مطابقة
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          راجع المادة والشعبة أو انشر أسئلة من صفحة بنك
                          الأسئلة.
                        </p>
                        <Link
                          href="/admin/arena"
                          className="mt-4 inline-flex rounded-xl border border-cyan-300/20 px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-cyan-300/10"
                        >
                          الذهاب إلى بنك الأسئلة
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {availableQuestions.map((question, index) => {
                          const checked =
                            form.selected_questions.includes(question.id);

                          return (
                            <label
                              key={question.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                checked
                                  ? "border-cyan-300/40 bg-cyan-300/[0.07]"
                                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQuestion(question.id)}
                                className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-slate-400">
                                    سؤال {index + 1}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-1 ${
                                      question.difficulty === "easy"
                                        ? "bg-emerald-400/10 text-emerald-300"
                                        : question.difficulty === "hard"
                                          ? "bg-red-400/10 text-red-300"
                                          : "bg-amber-400/10 text-amber-300"
                                    }`}
                                  >
                                    {question.difficulty === "easy"
                                      ? "سهل"
                                      : question.difficulty === "hard"
                                        ? "صعب"
                                        : "متوسط"}
                                  </span>
                                </div>

                                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-slate-200">
                                  {question.question_text}
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                  {question.options.length} اختيارات
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4">
                      <p className="text-sm text-slate-400">
                        ترتيب الأسئلة في التحدي يتبع ترتيب اختيارك.
                      </p>
                      <p className="text-sm font-bold text-cyan-200">
                        {form.selected_questions.length} سؤال مختار
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-slate-500">
                  سيُحفظ التحدي كمسودة، ولن يُفتح التسجيل تلقائيًا.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeCreateForm}
                    disabled={saving}
                    className="min-h-12 rounded-xl border border-white/10 px-5 font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !form.subject_id ||
                      form.selected_questions.length === 0
                    }
                    className="min-h-12 rounded-xl bg-cyan-300 px-6 font-black text-[#04111e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "جاري إنشاء التحدي..." : "✓ حفظ التحدي كمسودة"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-black tracking-widest text-cyan-300">
                CHALLENGE MANAGEMENT
              </p>
              <h2 className="text-xl font-black sm:text-2xl">
                التحديات المسجلة
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                راجع الحالة ورمز الدخول وتاريخ كل تحدٍّ.
              </p>
            </div>

            <span className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-400">
              النتائج:{" "}
              <strong className="text-white">
                {filteredChallenges.length}
              </strong>
            </span>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-white/[0.07] bg-[#091523]/80 p-4 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالعنوان أو رمز الدخول..."
              className="arena-input"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="arena-input"
            >
              <option value="all">جميع الحالات</option>
              <option value="draft">مسودات</option>
              <option value="open">مفتوحة للتسجيل</option>
              <option value="in_progress">جارية</option>
              <option value="finished">منتهية</option>
              <option value="cancelled">ملغاة</option>
            </select>

            <select
              value={streamFilter}
              onChange={(event) => setStreamFilter(event.target.value)}
              className="arena-input"
            >
              <option value="all">جميع الشعب</option>
              {STREAMS.map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/[0.07] bg-[#091523]/80 p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
              <p className="mt-4 text-sm text-slate-400">
                جاري تحميل بيانات MARIS ARENA...
              </p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#091523]/70 px-5 py-14 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/10 bg-cyan-300/[0.05] text-4xl">
                ⚔️
              </div>
              <h3 className="mt-5 text-xl font-black">
                {challenges.length === 0
                  ? "الساحة تستنى أول تحدٍّ"
                  : "ما لقيناش تحديات مطابقة"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                {challenges.length === 0
                  ? "أنشئ أول تحدٍّ رسمي، اختار أسئلته، ومن بعد افتح التسجيل وقت ما تكون واجد."
                  : "بدّل خيارات البحث أو التصفية باش تظهرلك التحديات."}
              </p>

              {challenges.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-6 rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#04111e] transition hover:bg-cyan-200"
                >
                  ＋ إنشاء أول تحدٍّ
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredChallenges.map((challenge) => {
                const busy = busyChallengeId === challenge.id;
                const status = STATUS_INFO[challenge.status];

                return (
                  <article
                    key={challenge.id}
                    className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0b1929] to-[#08121f] transition hover:border-cyan-300/20"
                  >
                    <div className="h-1 bg-gradient-to-l from-cyan-300/70 via-blue-500/40 to-transparent" />

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-2xl">
                            ⚔️
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-black leading-7 text-white">
                              {challenge.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {subjectName(challenge.subject_id)}
                              {challenge.stream ? ` · ${challenge.stream}` : ""}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={challenge.status} />
                      </div>

                      {challenge.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                          {challenge.description}
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                          <p className="text-[11px] text-slate-500">الأسئلة</p>
                          <p className="mt-2 font-black text-cyan-200">
                            {challenge.question_count}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                          <p className="text-[11px] text-slate-500">المدة</p>
                          <p className="mt-2 font-black text-white">
                            {challenge.duration_seconds >= 3600
                              ? `${Math.floor(challenge.duration_seconds / 3600)} س ${Math.floor((challenge.duration_seconds % 3600) / 60)} د`
                              : challenge.duration_seconds % 60 === 0
                                ? `${challenge.duration_seconds / 60} د`
                                : `${Math.floor(challenge.duration_seconds / 60)} د ${challenge.duration_seconds % 60} ث`}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                          <p className="text-[11px] text-slate-500">المقاعد</p>
                          <p className="mt-2 font-black text-white">
                            {challenge.max_participants.toLocaleString("ar-DZ")}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                          <p className="text-[11px] text-slate-500">النوع</p>
                          <p className="mt-2 font-black text-white">
                            {challenge.challenge_type === "official"
                              ? "رسمي"
                              : "شخصي"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] text-slate-500">
                              رمز الدخول
                            </p>
                            <p
                              dir="ltr"
                              className="mt-1 font-mono text-xl font-black tracking-[0.2em] text-cyan-200"
                            >
                              {challenge.access_code}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void copyAccessCode(challenge.access_code)
                            }
                            className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/10"
                          >
                            نسخ الرمز
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        <p>
                          <span className="text-slate-400">البداية:</span>{" "}
                          {formatDate(challenge.starts_at)}
                        </p>
                        <p>
                          <span className="text-slate-400">النهاية:</span>{" "}
                          {formatDate(challenge.ends_at)}
                        </p>
                        <p>
                          <span className="text-slate-400">تاريخ الإنشاء:</span>{" "}
                          {formatDate(challenge.created_at)}
                        </p>
                      </div>

                      {challenge.status === "draft" && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.07] pt-4 sm:flex-row">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void updateChallengeStatus(challenge, "open")
                            }
                            className="min-h-11 flex-1 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
                          >
                            {busy ? "جاري التنفيذ..." : "فتح التسجيل"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void updateChallengeStatus(
                                challenge,
                                "cancelled"
                              )
                            }
                            className="min-h-11 rounded-xl border border-red-400/15 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400/[0.07] disabled:opacity-50"
                          >
                            إلغاء التحدي
                          </button>
                        </div>
                      )}

                      {(challenge.status === "open" ||
                        challenge.status === "in_progress") && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.07] pt-4 sm:flex-row">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void updateChallengeStatus(
                                challenge,
                                "finished"
                              )
                            }
                            className="min-h-11 flex-1 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-[#04111e] transition hover:bg-cyan-200 disabled:opacity-50"
                          >
                            {busy ? "جاري التنفيذ..." : "إنهاء التحدي"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void updateChallengeStatus(
                                challenge,
                                "cancelled"
                              )
                            }
                            className="min-h-11 rounded-xl border border-red-400/15 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400/[0.07] disabled:opacity-50"
                          >
                            إلغاء التحدي
                          </button>
                        </div>
                      )}

                      {challenge.status === "finished" && (
                        <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-400/10 bg-white/[0.025] p-3 text-xs text-slate-400">
                          <span>✓</span>
                          تم إنهاء التحدي.
                        </div>
                      )}

                      {challenge.status === "cancelled" && (
                        <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.03] p-3 text-xs text-red-300/80">
                          <span>⊘</span>
                          هذا التحدي ملغى.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="border-t border-white/[0.07] py-5 text-center">
          <p className="text-xs text-slate-600">
            🐋 MARIS ACADEMY ²⁰²⁷ · ARENA CONTROL CENTER
          </p>
        </footer>
      </div>

      <style jsx>{`
        .arena-input {
          width: 100%;
          min-width: 0;
          min-height: 46px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 0.8rem;
          background: #071321;
          color: #f1f5f9;
          padding: 0.75rem 0.9rem;
          outline: none;
          font-size: 0.875rem;
          transition:
            border-color 150ms ease,
            background 150ms ease;
        }

        .arena-input:focus {
          border-color: rgba(103, 232, 249, 0.55);
          background: #0a1929;
        }

        .arena-input::placeholder {
          color: #64748b;
        }

        .arena-input:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .arena-input option {
          background: #071321;
          color: white;
        }

        .arena-input[type="datetime-local"] {
          color-scheme: dark;
        }
      `}</style>
    </main>
  );
}
