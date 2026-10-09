
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Subject = "history" | "geography";
type CardType = "term" | "personality" | "date";
type PersonalityGroup = "western" | "eastern" | "third_world";
type ProgressStatus = "new" | "learning" | "known";
type SlideDirection = -1 | 1;

type Flashcard = {
  id: string;
  subject: Subject;
  card_type: CardType;
  title: string;
  front_content: string;
  back_content: string;
  image_url: string | null;
  sort_order: number;
  unit_name: string | null;
  personality_group: string | null;
  unit_number: number | null;
};

type CardProgress = {
  flashcard_id: string;
  status: ProgressStatus;
  review_count: number;
};

const SUBJECT_NAMES: Record<Subject, string> = {
  history: "التاريخ",
  geography: "الجغرافيا",
};

const TYPE_INFO: Record<CardType, { title: string; icon: string }> = {
  term: { title: "المصطلحات", icon: "📚" },
  personality: { title: "الشخصيات", icon: "👤" },
  date: { title: "التواريخ", icon: "📅" },
};

const PERSONALITY_GROUPS: Record<PersonalityGroup, string> = {
  western: "المعسكر الغربي",
  eastern: "المعسكر الشرقي",
  third_world: "العالم الثالث",
};

const SLIDE_DURATION = 720;

export default function FlashcardStudyPage() {
  const params = useParams<{ subject: string; type: string }>();

  const subjectParam = params.subject;
  const typeParam = params.type;

  const validSubject =
    subjectParam === "history" || subjectParam === "geography";

  const validType =
    typeParam === "term" ||
    typeParam === "personality" ||
    typeParam === "date";

  const validCombination =
    validSubject &&
    validType &&
    (subjectParam === "history" || typeParam === "term");

  const subject = validSubject ? (subjectParam as Subject) : null;
  const cardType = validType ? (typeParam as CardType) : null;

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] =
    useState("all");
  const [slideDirection, setSlideDirection] =
    useState<SlideDirection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const slideLockRef = useRef(false);

  const isSliding = slideDirection !== null;

  // إرجاع اسم الوحدة، مع دعم البطاقات القديمة التي تستعمل رقم الوحدة.
  function getCardUnitName(card: Flashcard): string {
    return (
      card.unit_name?.trim() ||
      (card.unit_number !== null ? `الوحدة ${card.unit_number}` : "")
    );
  }

  // استخراج أسماء الوحدات الموجودة فعليًا في البطاقات المنشورة.
  const units = Array.from(
    new Set(
      cards
        .map(getCardUnitName)
        .filter((unitName) => unitName.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ar"));

  // تصفية البطاقات حسب الوحدة والمعسكر عند مراجعة الشخصيات.
  const filteredCards = cards.filter((card) => {
    const matchesUnit =
      selectedUnit === "all" || getCardUnitName(card) === selectedUnit;

    const matchesGroup =
      cardType !== "personality" ||
      selectedPersonalityGroup === "all" ||
      card.personality_group === selectedPersonalityGroup;

    return matchesUnit && matchesGroup;
  });

  const loadCards = useCallback(async () => {
    if (!validCombination || !subject || !cardType) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        setError("خدمة قاعدة البيانات غير متاحة حاليًا.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("سجّل الدخول باش تقدر تستعمل حفظني.");
        return;
      }

      const { data: cardsData, error: cardsError } = await supabase
        .from("flashcards")
        .select(
          "id, subject, card_type, title, front_content, back_content, image_url, sort_order, unit_name, personality_group, unit_number"
        )
        .eq("subject", subject)
        .eq("card_type", cardType)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cardsError) throw cardsError;

      const loadedCards = (cardsData ?? []) as Flashcard[];

      setCards(loadedCards);
      setSelectedUnit("all");
      setSelectedPersonalityGroup("all");
      setIndex(0);
      setFlipped(false);
      setSlideDirection(null);
      slideLockRef.current = false;
      setNotice(null);

      if (loadedCards.length === 0) {
        setProgress({});
        return;
      }

      const { data: progressData, error: progressError } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id, status, review_count")
        .eq("user_id", user.id)
        .in(
          "flashcard_id",
          loadedCards.map((card) => card.id)
        );

      if (progressError) throw progressError;

      const progressMap: Record<string, CardProgress> = {};

      for (const item of (progressData ?? []) as CardProgress[]) {
        progressMap[item.flashcard_id] = item;
      }

      setProgress(progressMap);
    } catch (err) {
      console.error("Flashcards loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل البطاقات."
      );
    } finally {
      setLoading(false);
    }
  }, [subjectParam, typeParam, validCombination, subject, cardType]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  // إعادة العرض من البطاقة الأولى عند تغيير الوحدة أو المعسكر.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setSlideDirection(null);
    slideLockRef.current = false;
    setNotice(null);
    setError(null);
  }, [selectedUnit, selectedPersonalityGroup]);

  // حركة الانتقال ثلاثية الأبعاد بين البطاقات.
  useEffect(() => {
    if (slideDirection === null) return;

    let cancelled = false;
    let frameId = 0;
    let finishTimeout = 0;

    let sceneAnimation: Animation | undefined;
    let previewAnimation: Animation | undefined;

    const direction = slideDirection;
    const sign = direction === 1 ? 1 : -1;

    const finishSlide = () => {
      if (cancelled) return;

      setIndex((current) =>
        Math.max(
          0,
          Math.min(filteredCards.length - 1, current + direction)
        )
      );

      setFlipped(false);
      setNotice(null);
      setError(null);
      setSlideDirection(null);
      slideLockRef.current = false;
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      const scene = sceneRef.current;
      const preview = previewRef.current;

      if (!scene || !preview) {
        finishSlide();
        return;
      }

      sceneAnimation = scene.animate(
        [
          {
            opacity: 1,
            transform:
              "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)",
            filter: "brightness(1)",
          },
          {
            opacity: 1,
            transform: `translate3d(${sign * 5}%, -2%, 75px) rotateY(${-sign * 10}deg) rotateZ(${sign * 4}deg) scale(1.025)`,
            filter: "brightness(1.12)",
            offset: 0.2,
          },
          {
            opacity: 0.92,
            transform: `translate3d(${sign * 43}%, -1%, 20px) rotateY(${-sign * 30}deg) rotateZ(${sign * 12}deg) scale(0.9)`,
            filter: "brightness(0.88)",
            offset: 0.58,
          },
          {
            opacity: 0,
            transform: `translate3d(${sign * 125}%, 8%, -120px) rotateY(${-sign * 48}deg) rotateZ(${sign * 22}deg) scale(0.65)`,
            filter: "brightness(0.62)",
          },
        ],
        {
          duration: SLIDE_DURATION,
          easing: "cubic-bezier(0.55, 0.05, 0.85, 0.35)",
          fill: "forwards",
        }
      );

      previewAnimation = preview.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${-sign * 78}%, 12%, -240px) rotateY(${sign * 48}deg) rotateZ(${-sign * 18}deg) scale(0.6)`,
            filter: "brightness(0.55)",
            offset: 0,
          },
          {
            opacity: 1,
            transform: `translate3d(${-sign * 38}%, 3%, -100px) rotateY(${sign * 27}deg) rotateZ(${-sign * 10}deg) scale(0.79)`,
            filter: "brightness(0.8)",
            offset: 0.3,
          },
          {
            opacity: 1,
            transform: `translate3d(${sign * 6}%, -2%, 55px) rotateY(${-sign * 7}deg) rotateZ(${sign * 3}deg) scale(1.025)`,
            filter: "brightness(1.08)",
            offset: 0.66,
          },
          {
            opacity: 1,
            transform:
              "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)",
            filter: "brightness(1)",
          },
        ],
        {
          duration: SLIDE_DURATION,
          easing: "cubic-bezier(0.18, 0.78, 0.22, 1)",
          fill: "forwards",
        }
      );

      finishTimeout = window.setTimeout(finishSlide, SLIDE_DURATION);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(finishTimeout);
      sceneAnimation?.cancel();
      previewAnimation?.cancel();
    };
  }, [slideDirection, filteredCards.length]);

  async function saveProgress(status: "learning" | "known") {
    const card = filteredCards[index];

    if (!card || saving || isSliding) return;

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      const supabase = getSupabase();

      if (!supabase) {
        setError("خدمة قاعدة البيانات غير متاحة حاليًا.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("انتهت جلسة تسجيل الدخول. سجّل الدخول مجددًا.");
        return;
      }

      const current = progress[card.id];
      const nextReviewCount = (current?.review_count ?? 0) + 1;
      const now = new Date().toISOString();

      const { error: saveError } = await supabase
        .from("flashcard_progress")
        .upsert(
          {
            user_id: user.id,
            flashcard_id: card.id,
            status,
            review_count: nextReviewCount,
            last_reviewed_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,flashcard_id" }
        );

      if (saveError) throw saveError;

      setProgress((previous) => ({
        ...previous,
        [card.id]: {
          flashcard_id: card.id,
          status,
          review_count: nextReviewCount,
        },
      }));

      setNotice(
        status === "known"
          ? "ممتاز! تسجّلت البطاقة ضمن البطاقات اللي حفظتها 🌟"
          : "تسجّلت للمراجعة، تقدر ترجع لها من بعد 📖"
      );
    } catch (err) {
      console.error("Flashcard progress error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "ما قدرناش نسجّلو التقدّم. حاول مرة أخرى."
      );
    } finally {
      setSaving(false);
    }
  }

  function moveCard(direction: SlideDirection) {
    if (slideLockRef.current || isSliding) return;

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= filteredCards.length) return;

    slideLockRef.current = true;
    setNotice(null);
    setError(null);
    setSlideDirection(direction);
  }

  if (!validCombination || !subject || !cardType) {
    return (
      <div
        dir="rtl"
        className="rounded-3xl border border-white/10 p-8 text-center text-white"
      >
        <div className="text-4xl">🔎</div>
        <h1 className="mt-4 text-xl font-black">القسم غير موجود</h1>
        <Link
          href="/flashcards"
          className="mt-5 inline-flex rounded-xl bg-cyan-400/10 px-4 py-3 font-bold text-cyan-300"
        >
          العودة إلى حفظني
        </Link>
      </div>
    );
  }

  const currentCard = filteredCards[index];

  const previewCard =
    isSliding && slideDirection !== null
      ? filteredCards[index + slideDirection]
      : null;

  const knownCount = filteredCards.filter(
    (card) => progress[card.id]?.status === "known"
  ).length;

  const learningCount = filteredCards.filter(
    (card) => progress[card.id]?.status === "learning"
  ).length;

  if (loading) {
    return (
      <div dir="rtl" className="animate-pulse space-y-5 text-white">
        <div className="h-6 w-36 rounded-lg bg-white/10" />
        <div className="h-12 w-64 rounded-xl bg-white/10" />
        <div className="mx-auto aspect-square w-full max-w-[520px] rounded-3xl border border-cyan-300/10 bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full text-white">
      <style jsx>{`
        .maris-scene {
          position: relative;
          z-index: 2;
          perspective: 1400px;
          -webkit-perspective: 1400px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transform-origin: center center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .maris-flipper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 850ms cubic-bezier(0.2, 0.75, 0.25, 1);
          will-change: transform;
        }

        .maris-flipper.is-flipped {
          transform: rotateY(180deg);
        }

        .maris-face {
          position: absolute;
          inset: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
          padding: 22px;
          text-align: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          isolation: isolate;
        }

        .maris-front {
          transform: rotateY(0deg) translateZ(1px);
          background:
            radial-gradient(
              circle at 12% 12%,
              rgba(34, 211, 238, 0.22),
              transparent 35%
            ),
            radial-gradient(
              circle at 90% 88%,
              rgba(14, 165, 233, 0.22),
              transparent 38%
            ),
            linear-gradient(145deg, #0c344d 0%, #062339 48%, #041426 100%);
          border: 1px solid rgba(103, 232, 249, 0.75);
          box-shadow:
            inset 0 0 35px rgba(34, 211, 238, 0.1),
            0 0 14px rgba(34, 211, 238, 0.3),
            0 0 38px rgba(14, 165, 233, 0.14);
        }

        .maris-back {
          transform: rotateY(180deg) translateZ(1px);
          background:
            radial-gradient(
              circle at 85% 15%,
              rgba(45, 212, 191, 0.23),
              transparent 36%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(59, 130, 246, 0.24),
              transparent 40%
            ),
            linear-gradient(145deg, #073d4a 0%, #082a40 52%, #041729 100%);
          border: 1px solid rgba(94, 234, 212, 0.85);
          box-shadow:
            inset 0 0 38px rgba(45, 212, 191, 0.1),
            0 0 16px rgba(45, 212, 191, 0.35),
            0 0 42px rgba(14, 165, 233, 0.18);
        }

        .maris-face::before {
          content: "";
          position: absolute;
          inset: -45%;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 38%,
            rgba(255, 255, 255, 0.055) 47%,
            rgba(103, 232, 249, 0.13) 50%,
            rgba(255, 255, 255, 0.035) 53%,
            transparent 62%
          );
          transform: translateX(-65%) rotate(12deg);
          animation: maris-shimmer 8s ease-in-out infinite;
        }

        .maris-face::after {
          content: "";
          position: absolute;
          inset: 10px;
          z-index: -1;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 25px;
        }

        .maris-orb {
          position: absolute;
          width: 130px;
          height: 130px;
          border-radius: 9999px;
          background: rgba(34, 211, 238, 0.14);
          filter: blur(38px);
          pointer-events: none;
          animation: maris-float 7s ease-in-out infinite alternate;
        }

        .maris-title {
          text-shadow:
            0 0 15px rgba(103, 232, 249, 0.2),
            0 2px 14px rgba(0, 0, 0, 0.3);
        }

        .maris-card-stage {
          position: relative;
          isolation: isolate;
          overflow: visible;
          perspective: 1400px;
          -webkit-perspective: 1400px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }

        .maris-preview-card {
          position: absolute;
          inset: 0;
          z-index: 3;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 22px;
          border: 1px solid rgba(103, 232, 249, 0.8);
          border-radius: 28px;
          text-align: center;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(34, 211, 238, 0.25),
              transparent 40%
            ),
            linear-gradient(145deg, #0b3048, #041426 85%);
          box-shadow:
            0 30px 65px rgba(0, 0, 0, 0.5),
            0 0 35px rgba(34, 211, 238, 0.28),
            inset 0 0 30px rgba(34, 211, 238, 0.1);
          opacity: 0;
          pointer-events: none;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        @keyframes maris-shimmer {
          0%,
          30% {
            transform: translateX(-65%) rotate(12deg);
          }
          65%,
          100% {
            transform: translateX(65%) rotate(12deg);
          }
        }

        @keyframes maris-float {
          from {
            transform: translate3d(-8px, -5px, 0);
          }
          to {
            transform: translate3d(15px, 12px, 0);
          }
        }
      `}</style>

      <Link
        href={`/flashcards/${subject}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
      >
        <span>→</span>
        العودة إلى أقسام {SUBJECT_NAMES[subject]}
      </Link>

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#071b2d]/95 via-[#08283d]/90 to-[#063247]/80 p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <span className="relative inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-300">
          {TYPE_INFO[cardType].icon} {TYPE_INFO[cardType].title}
        </span>

        <h1 className="relative mt-4 text-2xl font-black sm:text-3xl">
          {SUBJECT_NAMES[subject]} — {TYPE_INFO[cardType].title}
        </h1>

        <p className="relative mt-2 text-sm leading-7 text-slate-300">
          اقرا السؤال، جرّب تجاوب وحدك، واضغط على اقلب البطاقة باش تشوف الإجابة
          بحركة ثلاثية الأبعاد.
        </p>

        {cards.length > 0 && (
          <div className="relative mt-5 space-y-4">
            <div>
              <label
                htmlFor="flashcard-unit"
                className="mb-2 block text-sm font-bold text-cyan-100"
              >
                📖 اختار الوحدة اللي حاب تراجعها
              </label>

              <select
                id="flashcard-unit"
                value={selectedUnit}
                onChange={(event) => setSelectedUnit(event.target.value)}
                className="w-full rounded-xl border border-cyan-300/20 bg-[#061d30] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
              >
                <option value="all">كل الوحدات</option>
                {units.map((unitName) => (
                  <option key={unitName} value={unitName}>
                    {unitName}
                  </option>
                ))}
              </select>
            </div>

            {cardType === "personality" && (
              <div>
                <label
                  htmlFor="flashcard-personality-group"
                  className="mb-2 block text-sm font-bold text-cyan-100"
                >
                  🌍 اختار المعسكر
                </label>

                <select
                  id="flashcard-personality-group"
                  value={selectedPersonalityGroup}
                  onChange={(event) =>
                    setSelectedPersonalityGroup(event.target.value)
                  }
                  className="w-full rounded-xl border border-cyan-300/20 bg-[#061d30] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
                >
                  <option value="all">كل الشخصيات</option>
                  <option value="western">المعسكر الغربي</option>
                  <option value="eastern">المعسكر الشرقي</option>
                  <option value="third_world">العالم الثالث</option>
                </select>
              </div>
            )}

            <p className="text-xs leading-6 text-slate-400">
              {selectedUnit === "all" && selectedPersonalityGroup === "all"
                ? "تظهر هنا جميع البطاقات المنشورة في هذا القسم."
                : `عدد البطاقات المطابقة لاختياراتك: ${filteredCards.length}.`}
            </p>
          </div>
        )}

        {cards.length > 0 && (
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-cyan-400/15 bg-black/15 p-3 text-center">
              <div className="text-xs text-slate-400">عدد البطاقات</div>
              <div className="mt-1 text-xl font-black text-cyan-300">
                {filteredCards.length}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/15 bg-black/15 p-3 text-center">
              <div className="text-xs text-slate-400">حفظتها</div>
              <div className="mt-1 text-xl font-black text-emerald-300">
                {knownCount}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-black/15 p-3 text-center">
              <div className="text-xs text-slate-400">للمراجعة</div>
              <div className="mt-1 text-xl font-black text-amber-300">
                {learningCount}
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/5 p-4 text-sm leading-7 text-red-200"
        >
          {error}
        </div>
      )}

      {filteredCards.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="text-5xl">
            {cards.length === 0 ? "🗂️" : "📚"}
          </div>

          <h2 className="mt-5 text-xl font-black">
            {cards.length === 0
              ? "البطاقات قيد التجهيز"
              : "ما كاين حتى بطاقة تطابق اختياراتك"}
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-400">
            {cards.length === 0
              ? "ما زال ما تنشرت حتى بطاقة في هذا القسم. كي يضيفها المسؤول من لوحة الإدارة، راح تظهر هنا تلقائيًا."
              : "جرّب تختار وحدة أخرى أو تعرض كل الوحدات والشخصيات."}
          </p>

          {cards.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedUnit("all");
                setSelectedPersonalityGroup("all");
              }}
              className="mt-5 inline-flex rounded-xl bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/15"
            >
              عرض كل البطاقات
            </button>
          )}

          <div>
            <Link
              href={`/flashcards/${subject}`}
              className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5"
            >
              العودة إلى الأقسام
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mx-auto mb-3 flex w-full max-w-[520px] items-center justify-between gap-3 text-sm">
            <span className="font-bold text-slate-300">
              البطاقة {index + 1} من {filteredCards.length}
            </span>
            <span className="text-xs text-cyan-200">
              {Math.round(((index + 1) / filteredCards.length) * 100)}٪
            </span>
          </div>

          <div className="mx-auto mb-6 h-2 w-full max-w-[520px] overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-all duration-500"
              style={{
                width: `${((index + 1) / filteredCards.length) * 100}%`,
              }}
            />
          </div>

          <div className="maris-card-stage mx-auto mb-6 w-full max-w-[520px]">
            {previewCard && slideDirection !== null && (
              <div
                ref={previewRef}
                key={previewCard.id}
                className="maris-preview-card"
                aria-hidden="true"
              >
                <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
                  ◉{" "}
                  {slideDirection === 1
                    ? "البطاقة الموالية"
                    : "البطاقة السابقة"}
                </span>

                <div className="my-5 h-px w-20 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

                <h2 className="maris-title w-full break-words text-2xl font-black leading-relaxed text-white sm:text-3xl">
                  {previewCard.title}
                </h2>

                <div className="my-4 text-xl text-cyan-300">⚓</div>

                <p className="line-clamp-5 w-full whitespace-pre-wrap break-words text-base font-semibold leading-8 text-slate-200">
                  {previewCard.front_content}
                </p>

                <div className="mt-5 text-[10px] font-black tracking-[0.2em] text-cyan-100/50 sm:text-xs">
                  MARIS ACADEMY ²⁰²⁷
                </div>
              </div>
            )}

            <div
              ref={sceneRef}
              key={currentCard.id}
              className="maris-scene aspect-square w-full"
            >
              <div
                className={`maris-flipper ${flipped ? "is-flipped" : ""}`}
              >
                <article className="maris-face maris-front">
                  <div className="maris-orb -left-12 -top-12" />
                  <div className="maris-orb -bottom-16 -right-12 bg-blue-400/15" />

                  <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center">
                    <span className="shrink-0 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-xs font-black tracking-wide text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] sm:text-sm">
                      ◉ الوجه الأمامي
                    </span>

                    <div className="my-4 h-px w-20 shrink-0 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

                    <h2 className="maris-title w-full shrink-0 break-words text-2xl font-black leading-relaxed text-white sm:text-3xl">
                      {currentCard.title}
                    </h2>

                    <div className="my-3 flex shrink-0 items-center gap-3 text-cyan-300/80">
                      <span className="h-px w-8 bg-cyan-300/50" />
                      <span className="text-xl">⚓</span>
                      <span className="h-px w-8 bg-cyan-300/50" />
                    </div>

                    <div className="w-full min-h-0 flex-1 overflow-y-auto px-1">
                      <p className="whitespace-pre-wrap break-words text-lg font-semibold leading-9 text-slate-100 sm:text-xl sm:leading-10">
                        {currentCard.front_content}
                      </p>
                    </div>

                    <div className="mt-3 flex shrink-0 items-center gap-2 pt-2 text-[10px] font-black tracking-[0.2em] text-cyan-100/50 sm:text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
                      MARIS ACADEMY ²⁰²⁷
                    </div>
                  </div>
                </article>

                <article className="maris-face maris-back">
                  <div className="maris-orb -right-12 -top-12 bg-teal-300/15" />
                  <div className="maris-orb -bottom-16 -left-12" />

                  <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center">
                    <span className="shrink-0 rounded-full border border-teal-200/30 bg-teal-300/10 px-4 py-2 text-xs font-black tracking-wide text-teal-100 shadow-[0_0_18px_rgba(45,212,191,0.12)] sm:text-sm">
                      ◉ الوجه الخلفي
                    </span>

                    <div className="my-4 h-px w-20 shrink-0 bg-gradient-to-r from-transparent via-teal-300 to-transparent" />

                    <h2 className="maris-title w-full shrink-0 break-words text-2xl font-black leading-relaxed text-white sm:text-3xl">
                      {currentCard.title}
                    </h2>

                    <div className="my-3 flex shrink-0 items-center gap-3 text-teal-200/80">
                      <span className="h-px w-8 bg-teal-200/50" />
                      <span className="text-xl">✦</span>
                      <span className="h-px w-8 bg-teal-200/50" />
                    </div>

                    <div className="w-full min-h-0 flex-1 overflow-y-auto px-1">
                      <p className="whitespace-pre-wrap break-words text-lg font-semibold leading-9 text-white sm:text-xl sm:leading-10">
                        {currentCard.back_content}
                      </p>

                      {currentCard.image_url && (
                        <img
                          src={currentCard.image_url}
                          alt={currentCard.title}
                          className="mx-auto mt-4 max-h-28 max-w-full rounded-xl border border-teal-200/20 object-contain shadow-[0_0_20px_rgba(45,212,191,0.12)] sm:max-h-32"
                        />
                      )}
                    </div>

                    <div className="mt-3 flex shrink-0 items-center gap-2 pt-2 text-[10px] font-black tracking-[0.2em] text-teal-100/50 sm:text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_#5eead4]" />
                      MARIS ACADEMY ²⁰²⁷
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            disabled={isSliding}
            aria-label={flipped ? "عرض الوجه الأمامي" : "قلب البطاقة"}
            aria-pressed={flipped}
            className="mx-auto mt-5 flex min-h-14 w-full max-w-[520px] items-center justify-center gap-3 rounded-2xl border border-cyan-300/50 bg-gradient-to-r from-[#073047] via-[#07506a] to-[#073047] px-5 py-3 font-black text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.13)] transition duration-300 hover:border-cyan-200 hover:shadow-[0_0_28px_rgba(34,211,238,0.27)] focus:outline-none focus:ring-2 focus:ring-cyan-300/50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            <span className="text-xl transition-transform duration-500">
              🔄
            </span>
            <span>{flipped ? "الرجوع إلى السؤال" : "اقلب البطاقة"}</span>
            <span className="text-cyan-300">✦</span>
          </button>

          <div className="mx-auto mt-4 grid w-full max-w-[520px] grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void saveProgress("learning")}
              disabled={saving || isSliding}
              className="min-h-14 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-400/10 to-orange-400/5 px-3 py-3 font-black text-amber-200 transition hover:border-amber-300/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "📖 نراجعها"}
            </button>

            <button
              type="button"
              onClick={() => void saveProgress("known")}
              disabled={saving || isSliding}
              className="min-h-14 rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-400/10 to-teal-400/5 px-3 py-3 font-black text-emerald-200 transition hover:border-emerald-300/60 hover:shadow-[0_0_20px_rgba(52,211,153,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "✓ حفظتها"}
            </button>
          </div>

          {notice && (
            <p
              role="status"
              className="mx-auto mt-3 max-w-[520px] rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-center text-sm leading-6 text-cyan-200"
            >
              {notice}
            </p>
          )}

          <div className="mx-auto mt-5 flex w-full max-w-[520px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveCard(-1)}
              disabled={index === 0 || isSliding}
              className="min-h-12 rounded-xl border border-cyan-200/15 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-cyan-200/30 hover:bg-cyan-300/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              → السابقة
            </button>

            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-4 py-2 text-xs font-black text-cyan-100/70">
              {index + 1} / {filteredCards.length}
            </span>

            <button
              type="button"
              onClick={() => moveCard(1)}
              disabled={index === filteredCards.length - 1 || isSliding}
              className="min-h-12 rounded-xl border border-cyan-200/15 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-cyan-200/30 hover:bg-cyan-300/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              التالية ←
            </button>
          </div>

          {index === filteredCards.length - 1 && (
            <div className="mx-auto mt-5 max-w-[520px] rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4 text-center">
              <p className="text-sm leading-7 text-slate-300">
                وصلت لآخر بطاقة في هذا القسم. تقدر ترجع للبطاقات السابقة
                وتراجعها وقت ما تحب.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
