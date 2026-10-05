"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  getCompletedLessonIds,
  getCourse,
  getCourseLessons,
} from "@/services/courses";
import { completeLesson } from "@/services/lessons";
import type { Course, Lesson, Subject } from "@/types/database";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  Spinner,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════
// صفحة الدرس — المحتوى + المصادر + تسجيل التقدم الحقيقي
// ══════════════════════════════════════════════════════

export default function LessonPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const { courseId, lessonId } = params;

  const [course, setCourse] = useState<
    (Course & { subject: Subject | null }) | null
  >(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setError(false);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [courseData, lessonsData, completedIds] = await Promise.all([
        getCourse(supabase, courseId),
        getCourseLessons(supabase, courseId),
        getCompletedLessonIds(supabase, user.id),
      ]);

      const current = lessonsData.find((l) => l.id === lessonId) ?? null;
      setCourse(courseData);
      setLessons(lessonsData);
      setLesson(current);
      setCompleted(current ? completedIds.has(current.id) : false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete() {
    const supabase = getSupabase();
    if (!supabase || !lesson) return;
    setCompleting(true);
    setNotice(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const result = await completeLesson(supabase, user.id, lesson.id);
      setCompleted(true);
      setNotice(
        result.alreadyCompleted
          ? "هذا الدرس مكتمل من قبل."
          : "أحسنت! تم تسجيل إتمام الدرس وكسبت 20 XP."
      );
    } catch {
      setNotice("حدث خطأ أثناء حفظ التقدم. حاول مرة أخرى.");
    } finally {
      setCompleting(false);
    }
  }

  if (error) return <ErrorState onRetry={load} />;
  if (loading) return <Spinner />;

  if (!lesson || !course) {
    return (
      <EmptyState
        icon="🔎"
        title="هذا الدرس غير موجود."
        action={
          <Link href={`/courses/${courseId}`} className="btn-secondary">
            العودة إلى الدورة
          </Link>
        }
      />
    );
  }

  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const lessonHref = (l: Lesson) => `/courses/${courseId}/lessons/${l.id}`;

  return (
    <div className="space-y-6">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-cyan-300 transition-colors hover:text-cyan-200 min-h-[44px]"
      >
        ← العودة إلى الدورة
      </Link>

      <header className="animate-fade-up">
        <p className="text-sm font-bold text-cyan-300">{course.title}</p>
        <h1 className="mt-2 break-words text-2xl font-extrabold leading-snug text-white sm:text-3xl">
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm text-foam/50">
          الدرس {index + 1} من {lessons.length}
          {completed && " · مكتمل ✓"}
        </p>
      </header>

      {/* ═══ محتوى الدرس ═══ */}
      <GlassCard className="p-6 sm:p-8">
        {lesson.content ? (
          <div className="whitespace-pre-line break-words leading-loose text-foam/85">
            {lesson.content}
          </div>
        ) : (
          <p className="py-6 text-center text-foam/50">
            لا يوجد محتوى لهذا الدرس بعد.
          </p>
        )}
      </GlassCard>

      {/* ═══ المصادر ═══ */}
      <GlassCard className="p-6">
        <h2 className="mb-3 text-lg font-extrabold text-white">المصادر</h2>
        {lesson.resources && lesson.resources.length > 0 ? (
          <ul className="space-y-2">
            {lesson.resources.map((resource, i) => (
              <li key={i}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-cyan-300 transition-colors hover:text-cyan-200 min-h-[44px]"
                >
                  🔗 {resource.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foam/40">لا توجد مصادر لهذا الدرس.</p>
        )}
      </GlassCard>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-bold",
            notice.includes("أحسنت") || notice.includes("مكتمل من قبل")
              ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
              : "border-red-400/30 bg-red-500/10 text-red-300"
          )}
        >
          {notice}
        </p>
      )}

      {/* ═══ التنقل بين الدروس ═══ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {prev ? (
          <Link href={lessonHref(prev)} className="btn-secondary w-full">
            ← الدرس السابق
          </Link>
        ) : (
          <span className="btn-secondary w-full cursor-not-allowed opacity-40">
            ← الدرس السابق
          </span>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={completed || completing}
          className={cn(
            "btn-primary w-full",
            completed && "!from-teal-500 !to-teal-400"
          )}
        >
          {completed ? "تم الإتمام ✓" : completing ? "جارٍ الحفظ…" : "إتمام الدرس"}
        </button>

        {next ? (
          <Link href={lessonHref(next)} className="btn-secondary w-full">
            الدرس التالي ←
          </Link>
        ) : (
          <span className="btn-secondary w-full cursor-not-allowed opacity-40">
            الدرس التالي ←
          </span>
        )}
      </div>
    </div>
  );
}
