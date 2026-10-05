"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import {
  addReelComment,
  deleteReelComment,
  getPublishedReels,
  getReelComments,
  getReelLikeStates,
  incrementReelView,
  toggleReelLike,
  type Reel,
  type ReelComment,
  type ReelLikeState,
} from "@/services/reels";

interface ReelCardProps {
  reel: Reel;
  likeState: ReelLikeState;
  onLikeChange: (reelId: string, liked: boolean) => void;
  onCommentCountChange: (reelId: string, count: number) => void;
}

function ReelCard({
  reel,
  likeState,
  onLikeChange,
  onCommentCountChange,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const viewedRef = useRef(false);
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [muted, setMuted] = useState(true);
  const [isLiking, setIsLiking] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          video.play().catch(() => {});

          if (!viewedRef.current && !viewTimerRef.current) {
            viewTimerRef.current = setTimeout(async () => {
              try {
                const supabase = getSupabase();

                if (supabase) {
                  await incrementReelView(supabase, reel.id);
                  viewedRef.current = true;
                }
              } catch (err) {
                console.error("Reel view error:", err);
              } finally {
                viewTimerRef.current = null;
              }
            }, 3000);
          }
        } else {
          video.pause();

          if (viewTimerRef.current) {
            clearTimeout(viewTimerRef.current);
            viewTimerRef.current = null;
          }
        }
      },
      {
        threshold: [0.65],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();

      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [reel.id]);

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleLike = async () => {
    if (isLiking) return;

    const supabase = getSupabase();

    if (!supabase) {
      console.error("Supabase client is unavailable.");
      return;
    }

    setIsLiking(true);

    try {
      const liked = await toggleReelLike(supabase, reel.id);

      onLikeChange(reel.id, liked);
    } catch (err) {
      console.error("Reel like error:", err);

      const message =
        err instanceof Error ? err.message : "تعذر تنفيذ الإعجاب";

      if (message.includes("تسجيل الدخول")) {
        alert("سجّل الدخول أولاً باش تقدر تدير إعجاب ❤️");
      }
    } finally {
      setIsLiking(false);
    }
  };

  const openComments = async () => {
    setCommentsOpen(true);

    if (commentsLoaded) {
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    setCommentsLoading(true);

    try {
      const data = await getReelComments(supabase, reel.id);

      setComments(data);
      setCommentsLoaded(true);
      onCommentCountChange(reel.id, data.length);
    } catch (err) {
      console.error("Comments loading error:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (commentSending) return;

    const cleanText = commentText.trim();

    if (!cleanText) return;

    if (cleanText.length > 500) {
      alert("التعليق طويل بزاف. الحد الأقصى 500 حرف.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    setCommentSending(true);

    try {
      const newComment = await addReelComment(
        supabase,
        reel.id,
        cleanText
      );

      setComments((current) => [newComment, ...current]);
      setCommentText("");

      onCommentCountChange(
        reel.id,
        comments.length + 1
      );
    } catch (err) {
      console.error("Add comment error:", err);

      const message =
        err instanceof Error ? err.message : "تعذر إضافة التعليق";

      if (message.includes("تسجيل الدخول")) {
        alert("سجّل الدخول أولاً باش تقدر تعلق 💬");
      } else {
        alert(message);
      }
    } finally {
      setCommentSending(false);
    }
  };

  const handleDeleteComment = async (
    commentId: string
  ) => {
    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    try {
      await deleteReelComment(
        supabase,
        commentId
      );

      setComments((current) => {
        const updated = current.filter(
          (comment) => comment.id !== commentId
        );

        onCommentCountChange(
          reel.id,
          updated.length
        );

        return updated;
      });
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  return (
    <article className="relative h-[calc(100vh-110px)] min-h-[600px] w-full snap-start overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url ?? undefined}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />

      {reel.subject && (
        <div className="absolute right-4 top-4 z-10">
          <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            📚 {reel.subject.name}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-lg backdrop-blur-md transition hover:bg-black/70"
        aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* Actions */}
      <div className="absolute bottom-32 left-4 z-20 flex flex-col gap-3">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isLiking}
          className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:bg-black/70 ${
            likeState.liked ? "text-red-500" : "text-white"
          } ${isLiking ? "cursor-wait opacity-60" : ""}`}
          aria-label={likeState.liked ? "إزالة الإعجاب" : "إعجاب"}
        >
          <span className="text-2xl leading-none">
            {likeState.liked ? "❤️" : "🤍"}
          </span>

          <span className="mt-1 text-[10px] font-bold text-white/80">
            {likeState.count}
          </span>
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={openComments}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
          aria-label="التعليقات"
        >
          <span className="text-2xl leading-none">
            💬
          </span>

          <span className="mt-1 text-[10px] font-bold text-white/80">
            {commentsLoaded
              ? comments.length
              : "…"}
          </span>
        </button>
      </div>

      {/* Comments panel */}
      {commentsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[72%] rounded-t-[2rem] border-t border-white/10 bg-slate-950/95 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-base font-extrabold text-white">
                💬 التعليقات
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {comments.length} تعليق
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCommentsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="إغلاق التعليقات"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[calc(72vh-150px)] overflow-y-auto px-5 py-4">
            {commentsLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">
                جاري تحميل التعليقات...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl">💬</div>

                <p className="mt-3 text-sm font-bold text-white">
                  مازال ما كاين حتى تعليق
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  كن أول واحد يعلق!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onDelete={handleDeleteComment}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                maxLength={500}
                rows={2}
                placeholder="اكتب تعليقك..."
                className="min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />

              <button
                type="button"
                onClick={handleAddComment}
                disabled={
                  commentSending ||
                  !commentText.trim()
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-lg text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="إرسال التعليق"
              >
                {commentSending ? "…" : "➤"}
              </button>
            </div>

            <div className="mt-1 text-left text-[10px] text-slate-600">
              {commentText.length}/500
            </div>
          </div>
        </div>
      )}

      {/* Reel info */}
      <div className="absolute bottom-0 right-0 z-10 w-full p-5 sm:p-7">
        <div className="max-w-[90%]">
          <h2 className="text-xl font-extrabold leading-8 text-white drop-shadow-lg sm:text-2xl">
            {reel.title}
          </h2>

          {reel.description && (
            <p className="mt-2 text-sm leading-6 text-white/75 drop-shadow-lg">
              {reel.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-white/60">
            <span>🌊 MARIS ACADEMY</span>

            <span>
              👁️ {reel.views_count}
            </span>

            <span>
              ❤️ {likeState.count}
            </span>

            <span>
              💬 {commentsLoaded ? comments.length : 0}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 z-10 hidden animate-bounce text-xl text-white/60 sm:block">
        ↓
      </div>
    </article>
  );
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: ReelComment;
  onDelete: (commentId: string) => void;
}) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function checkOwner() {
      const supabase = getSupabase();

      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id === comment.user_id) {
        setIsOwner(true);
      }
    }

    checkOwner();
  }, [comment.user_id]);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
          👤
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300">
              طالب MARIS
            </span>

            {isOwner && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="text-[11px] font-semibold text-red-400/70 transition hover:text-red-400"
              >
                حذف
              </button>
            )}
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/90">
            {comment.content}
          </p>

          <p className="mt-2 text-[10px] text-slate-600">
            {new Date(comment.created_at).toLocaleString("ar-DZ")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[] | null>(null);

  const [likeStates, setLikeStates] = useState<
    Record<string, ReelLikeState>
  >({});

  const [commentCounts, setCommentCounts] = useState<
    Record<string, number>
  >({});

  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadReels() {
      const supabase = getSupabase();

      if (!supabase) {
        setError(true);
        return;
      }

      try {
        const data = await getPublishedReels(supabase);

        setReels(data);

        const states = await getReelLikeStates(
          supabase,
          data.map((reel) => reel.id)
        );

        setLikeStates(states);

        const counts: Record<string, number> = {};

        for (const reel of data) {
          const { count } = await supabase
            .from("reel_comments")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("reel_id", reel.id);

          counts[reel.id] = count ?? 0;
        }

        setCommentCounts(counts);
      } catch (err) {
        console.error("Reels error:", err);
        setError(true);
      }
    }

    loadReels();
  }, []);

  const handleLikeChange = (
    reelId: string,
    liked: boolean
  ) => {
    setLikeStates((current) => {
      const previous = current[reelId] ?? {
        count: 0,
        liked: false,
      };

      return {
        ...current,
        [reelId]: {
          liked,
          count: Math.max(
            0,
            previous.count + (liked ? 1 : -1)
          ),
        },
      };
    });
  };

  const handleCommentCountChange = (
    reelId: string,
    count: number
  ) => {
    setCommentCounts((current) => ({
      ...current,
      [reelId]: count,
    }));
  };

  if (error) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-red-400/5 p-8 text-center">
          <div className="mb-4 text-5xl">⚠️</div>

          <h1 className="text-xl font-extrabold text-white">
            تعذر تحميل الريلز
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            حاول تحديث الصفحة مرة أخرى.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6 w-full"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  if (!reels) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center"
      >
        <div className="text-center">
          <div className="mb-4 animate-pulse text-5xl">
            🎬
          </div>

          <p className="text-sm font-semibold text-slate-400">
            جاري تحميل الريلز...
          </p>
        </div>
      </main>
    );
  }

  if (reels.length === 0) {
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4"
      >
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center">
          <div className="mb-5 text-7xl">🎬</div>

          <h1 className="text-2xl font-extrabold text-white">
            الريلزات قادمة قريبًا
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
            هنا راح تلقى محتوى تعليمي قصير ومفيد من MARIS ACADEMY.
          </p>

          <Link
            href="/courses"
            className="btn-primary mt-6 inline-flex"
          >
            📚 تصفح الدورات
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="w-full">
      <div className="mx-auto w-full max-w-[560px] px-2 sm:px-4">
        <div className="flex items-center justify-between gap-3 py-4">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <span>→</span>
            <span>العودة</span>
          </Link>

          <div className="min-w-0 text-right">
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              🎬 ريلزات المنصة
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              اسحب للأعلى لمشاهدة المزيد
            </p>
          </div>
        </div>

        <div className="h-[calc(100vh-100px)] snap-y snap-mandatory space-y-3 overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels.map((reel) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              likeState={
                likeStates[reel.id] ?? {
                  count: 0,
                  liked: false,
                }
              }
              onLikeChange={handleLikeChange}
              onCommentCountChange={
                handleCommentCountChange
              }
            />
          ))}
        </div>
      </div>
    </main>
  );
}