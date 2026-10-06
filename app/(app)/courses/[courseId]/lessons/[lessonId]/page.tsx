
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
// صفحة الدرس — فيديو + المحتوى + المصادر + التقدم الحقيقي
// ══════════════════════════════════════════════════════

export default function LessonPage() {
  const params = useParams<{
    courseId: string;
    lessonId: string;
  }>();

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

      const [courseData, lessonsData, completedIds] =
        await Promise.all([
          getCourse(supabase, courseId),
          getCourseLessons(supabase, courseId),
          getCompletedLessonIds(supabase, user.id),
        ]);

      const current =
        lessonsData.find((l) => l.id === lessonId) ?? null;

      setCourse(courseData);
      setLessons(lessonsData);
      setLesson(current);
      setCompleted(
        current ? completedIds.has(current.id) : false
      );
    } catch (err) {
      console.error("Lesson page error:", err);
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

      const result = await completeLesson(
        supabase,
        user.id,
        lesson.id
      );

      setCompleted(true);

      setNotice(
        result.alreadyCompleted
          ? "هذا الدرس مكتمل من قبل."
          : "أحسنت! تم تسجيل إتمام الدرس وكسبت 20 XP."
      );
    } catch {
      setNotice(
        "حدث خطأ أثناء حفظ التقدم. حاول مرة أخرى."
      );
    } finally {
      setCompleting(false);
    }
  }

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (loading) {
    return <Spinner />;
  }

  if (!lesson || !course) {
    return (
      <EmptyState
        icon="🔎"
        title="هذا الدرس غير موجود."
        action={
          <Link
            href={`/courses/${courseId}`}
            className="btn-secondary"
          >
            العودة إلى الدورة
          </Link>
        }
      />
    );
  }

  const index = lessons.findIndex(
    (l) => l.id === lesson.id
  );

  const prev =
    index > 0 ? lessons[index - 1] : null;

  const next =
    index >= 0 && index < lessons.length - 1
      ? lessons[index + 1]
      : null;

  const lessonHref = (l: Lesson) =>
    `/courses/${courseId}/lessons/${l.id}`;

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* العودة إلى الدورة */}
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-cyan-300 transition-colors hover:text-cyan-200"
      >
        ← العودة إلى الدورة
      </Link>

      {/* Header */}
      <header className="animate-fade-up">
        <p className="text-sm font-bold text-cyan-300">
          {course.subject?.name ?? "مادة"} · {course.title}
        </p>

        <h1 className="mt-2 break-words text-2xl font-extrabold leading-snug text-white sm:text-3xl">
          {lesson.title}
        </h1>

        <p className="mt-2 text-sm text-foam/50">
          الدرس {index + 1} من {lessons.length}
          {completed && " · مكتمل ✓"}
        </p>
      </header>

      {/* ═══════════════════════════════════════════════════
          الفيديو
      ═══════════════════════════════════════════════════ */}

      <VideoPlayer videoUrl={lesson.video_url} />

      {/* ═══════════════════════════════════════════════════
          وصف / محتوى الدرس
      ═══════════════════════════════════════════════════ */}

      <GlassCard className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
            📖
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-white">
              حول هذا الدرس
            </h2>

            <p className="text-xs text-foam/40">
              محتوى وملاحظات الدرس
            </p>
          </div>
        </div>

        {lesson.content ? (
          <div className="whitespace-pre-line break-words leading-loose text-foam/85">
            {lesson.content}
          </div>
        ) : (
          <p className="py-6 text-center text-foam/50">
            لا يوجد وصف لهذا الدرس بعد.
          </p>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════════════════
          المصادر
      ═══════════════════════════════════════════════════ */}

      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
            📎
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-white">
              المصادر
            </h2>

            <p className="text-xs text-foam/40">
              ملفات وروابط إضافية
            </p>
          </div>
        </div>

        {lesson.resources &&
        lesson.resources.length > 0 ? (
          <ul className="space-y-2">
            {lesson.resources.map(
              (resource, i) => {
                const item = resource as {
                  url?: string;
                  title?: string;
                };

                if (!item.url) return null;

                return (
                  <li key={i}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 font-bold text-cyan-300 transition-colors hover:text-cyan-200"
                    >
                      🔗{" "}
                      {item.title ||
                        `المصدر ${i + 1}`}
                    </a>
                  </li>
                );
              }
            )}
          </ul>
        ) : (
          <p className="text-sm text-foam/40">
            لا توجد مصادر لهذا الدرس.
          </p>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════════════════
          إشعار إتمام الدرس
      ═══════════════════════════════════════════════════ */}

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-bold",
            notice.includes("أحسنت") ||
              notice.includes("مكتمل من قبل")
              ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
              : "border-red-400/30 bg-red-500/10 text-red-300"
          )}
        >
          {notice}
        </p>
      )}

      {/* ═══════════════════════════════════════════════════
          التنقل + إتمام الدرس
      ═══════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {prev ? (
          <Link
            href={lessonHref(prev)}
            className="btn-secondary w-full"
          >
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
            completed &&
              "!from-teal-500 !to-teal-400"
          )}
        >
          {completed
            ? "تم الإتمام ✓"
            : completing
              ? "جارٍ الحفظ…"
              : "✅ إتمام الدرس"}
        </button>

        {next ? (
          <Link
            href={lessonHref(next)}
            className="btn-secondary w-full"
          >
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

// ══════════════════════════════════════════════════════
// Video Player
// يدعم YouTube + روابط الفيديو المباشرة
// ══════════════════════════════════════════════════════

function VideoPlayer({
  videoUrl,
}: {
  videoUrl: string | null;
}) {
  if (!videoUrl) {
    return (
      <GlassCard className="overflow-hidden p-0">
        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-cyan-500/10 via-slate-950 to-teal-500/10">
          <div className="px-6 text-center">
            <div className="text-5xl">🎥</div>

            <h2 className="mt-4 text-lg font-extrabold text-white">
              الفيديو غير متوفر بعد
            </h2>

            <p className="mt-2 text-sm text-foam/40">
              سيتم إضافة فيديو هذا الدرس قريبًا.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const youtubeId = getYouTubeVideoId(videoUrl);

  // YouTube
  if (youtubeId) {
    return (
      <GlassCard className="overflow-hidden p-0">
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
            title="فيديو الدرس"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </GlassCard>
    );
  }

  // فيديو مباشر
  if (isDirectVideo(videoUrl)) {
    return (
      <GlassCard className="overflow-hidden p-0">
        <div className="aspect-video w-full bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          >
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
        </div>
      </GlassCard>
    );
  }

  // رابط غير معروف
  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="text-5xl">🎥</div>

        <h2 className="mt-4 text-lg font-extrabold text-white">
          فيديو الدرس
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-foam/50">
          الرابط المضاف لا يمكن تشغيله داخل المنصة
          مباشرة. يمكنك فتحه من الزر التالي.
        </p>

        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5"
        >
          ▶️ فتح الفيديو
        </a>
      </div>
    </GlassCard>
  );
}

// ══════════════════════════════════════════════════════
// استخراج YouTube Video ID
// يدعم:
// youtube.com/watch?v=
// youtu.be/
// youtube.com/embed/
// youtube.com/shorts/
// ══════════════════════════════════════════════════════

function getYouTubeVideoId(
  url: string
): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      if (
        parsed.pathname.startsWith("/embed/")
      ) {
        return parsed.pathname
          .split("/embed/")[1]
          ?.split("/")[0] ?? null;
      }

      if (
        parsed.pathname.startsWith("/shorts/")
      ) {
        return parsed.pathname
          .split("/shorts/")[1]
          ?.split("/")[0] ?? null;
      }
    }

    if (hostname === "youtu.be") {
      return parsed.pathname
        .replace("/", "")
        .split("/")[0] || null;
    }

    return null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════
// التحقق من رابط فيديو مباشر
// ══════════════════════════════════════════════════════

function isDirectVideo(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    return (
      pathname.endsWith(".mp4") ||
      pathname.endsWith(".webm") ||
      pathname.endsWith(".ogg") ||
      pathname.endsWith(".mov") ||
      pathname.endsWith(".m4v")
    );
  } catch {
    return false;
  }
}

