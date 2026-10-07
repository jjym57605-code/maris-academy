
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";

import {
  addForumComment,
  createForumPost,
  FORUM_CATEGORIES,
  getForumPosts,
  reportForumPost,
  toggleForumLike,
  type ForumPost,
} from "@/services/forum";

import {
  ErrorState,
  GlassCard,
  Spinner,
} from "@/components/ui";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getAuthorName(post: ForumPost) {
  if (!post.author) {
    return "طالب MARIS";
  }

  const name =
    `${post.author.first_name ?? ""} ${post.author.last_name ?? ""}`.trim();

  return name || "طالب MARIS";
}

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("عام");

  const [creating, setCreating] = useState(false);

  const [commentText, setCommentText] = useState<Record<string, string>>(
    {},
  );

  const [commentLoading, setCommentLoading] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>(
    {},
  );

  const [likeLoading, setLikeLoading] = useState<string | null>(null);

  const [reportingPost, setReportingPost] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState("");

  const [message, setMessage] = useState("");

  const loadPosts = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError(true);
      return;
    }

    try {
      setError(false);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setError(true);
        return;
      }

      setUserId(user.id);

      const result = await getForumPosts(supabase, user.id);

      setPosts(result);
    } catch (err) {
      console.error("FORUM LOAD ERROR:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleCreatePost() {
    const supabase = getSupabase();

    if (!supabase || !userId) {
      return;
    }

    try {
      setCreating(true);
      setMessage("");

      await createForumPost(
        supabase,
        userId,
        title,
        content,
        category,
      );

      setTitle("");
      setContent("");
      setCategory("عام");
      setShowCreate(false);

      setMessage("✅ تم نشر منشورك بنجاح.");

      await loadPosts();
    } catch (err) {
      console.error(err);

      setMessage(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ حدث خطأ أثناء نشر المنشور.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleComment(postId: string) {
    const supabase = getSupabase();

    if (!supabase || !userId) {
      return;
    }

    // حماية إضافية من جهة الواجهة:
    // إذا كان المنشور مقفولًا، لا نحاول إرسال التعليق.
    const post = posts.find((item) => item.id === postId);

    if (!post) {
      return;
    }

    if (post.is_locked) {
      setMessage("🔒 هذا المنشور مقفول من الإدارة ولا يمكن إضافة تعليقات جديدة.");
      return;
    }

    const text = commentText[postId]?.trim();

    if (!text) {
      return;
    }

    try {
      setCommentLoading(postId);
      setMessage("");

      await addForumComment(
        supabase,
        userId,
        postId,
        text,
      );

      setCommentText((current) => ({
        ...current,
        [postId]: "",
      }));

      await loadPosts();
    } catch (err) {
      console.error(err);

      setMessage(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ تعذر إضافة التعليق.",
      );
    } finally {
      setCommentLoading(null);
    }
  }

  async function handleLike(post: ForumPost) {
    const supabase = getSupabase();

    if (!supabase || !userId) {
      return;
    }

    try {
      setLikeLoading(post.id);

      await toggleForumLike(
        supabase,
        userId,
        post.id,
        post.liked_by_me,
      );

      await loadPosts();
    } catch (err) {
      console.error(err);

      setMessage("❌ تعذر تحديث الإعجاب.");
    } finally {
      setLikeLoading(null);
    }
  }

  async function handleReport() {
    const supabase = getSupabase();

    if (!supabase || !userId || !reportingPost) {
      return;
    }

    try {
      await reportForumPost(
        supabase,
        userId,
        reportingPost,
        reportReason,
      );

      setReportingPost(null);
      setReportReason("");

      setMessage("✅ تم إرسال البلاغ للإدارة.");
    } catch (err) {
      console.error(err);

      setMessage(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ تعذر إرسال البلاغ.",
      );
    }
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorState onRetry={loadPosts} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      {/* ================================ */}
      {/* HEADER */}
      {/* ================================ */}

      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/10 via-slate-900/70 to-blue-950/40 p-6 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              ← العودة إلى لوحة التحكم
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-3xl">
                💬
              </div>

              <div>
                <h1 className="text-2xl font-black text-white md:text-3xl">
                  منتدى MARIS
                </h1>

                <p className="mt-1 text-sm text-white/55">
                  مساحة للطلاب لطرح الأسئلة، تبادل الأفكار ومساعدة بعضكم.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          >
            {showCreate ? "✕ إلغاء" : "＋ منشور جديد"}
          </button>
        </div>
      </section>

      {/* ================================ */}
      {/* MESSAGE */}
      {/* ================================ */}

      {message && (
        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      )}

      {/* ================================ */}
      {/* CREATE POST */}
      {/* ================================ */}

      {showCreate && (
        <GlassCard className="space-y-5 p-5">
          <div>
            <h2 className="text-xl font-black text-white">
              إنشاء منشور
            </h2>

            <p className="mt-1 text-sm text-white/45">
              شارك سؤالًا أو فكرة مفيدة مع مجتمع MARIS.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              placeholder="عنوان المنشور"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
            >
              {FORUM_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="اكتب محتوى منشورك هنا..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
          />

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-white/35">
              {content.length}/5000
            </span>

            <button
              type="button"
              disabled={
                creating ||
                !title.trim() ||
                !content.trim()
              }
              onClick={handleCreatePost}
              className="rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "جاري النشر..." : "🚀 نشر المنشور"}
            </button>
          </div>
        </GlassCard>
      )}

      {/* ================================ */}
      {/* POSTS */}
      {/* ================================ */}

      {posts.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <div className="text-5xl">🌊</div>

          <h2 className="mt-4 text-xl font-black text-white">
            المنتدى مازال فارغًا
          </h2>

          <p className="mt-2 text-sm text-white/45">
            كن أول طالب يشارك سؤالًا أو فكرة مع مجتمع MARIS.
          </p>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-5 rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
          >
            ＋ إنشاء أول منشور
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => {
            const isCommentsOpen =
              openComments[post.id] ?? false;

            return (
              <GlassCard
                key={post.id}
                className="overflow-hidden"
              >
                {/* POST HEADER */}

                <div className="border-b border-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 font-black text-cyan-300">
                        {getAuthorName(post)
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-bold text-white">
                          {getAuthorName(post)}
                        </p>

                        <p className="text-xs text-white/35">
                          {post.author?.maris_id
                            ? `MARIS ID: ${post.author.maris_id}`
                            : "طالب MARIS"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {post.is_pinned && (
                        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                          📌 مثبت
                        </span>
                      )}

                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                        {post.category}
                      </span>

                      {post.is_locked && (
                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                          🔒 مغلق
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-5 text-xl font-black text-white">
                    {post.title}
                  </h2>

                  <p className="mt-3 whitespace-pre-wrap leading-7 text-white/70">
                    {post.content}
                  </p>

                  <p className="mt-4 text-xs text-white/30">
                    {formatDate(post.created_at)}
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-3">
                  <button
                    type="button"
                    disabled={likeLoading === post.id}
                    onClick={() => handleLike(post)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      post.liked_by_me
                        ? "bg-cyan-400/15 text-cyan-300"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {post.liked_by_me ? "💙" : "🤍"}{" "}
                    {post.likes_count}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((current) => ({
                        ...current,
                        [post.id]: !isCommentsOpen,
                      }))
                    }
                    className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                  >
                    💬 {post.comments.length} تعليق
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReportingPost(post.id);
                      setReportReason("");
                    }}
                    className="mr-auto rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-white/40 transition hover:bg-red-400/10 hover:text-red-300"
                  >
                    🚩 إبلاغ
                  </button>
                </div>

                {/* REPORT */}

                {reportingPost === post.id && (
                  <div className="border-b border-white/5 bg-red-400/5 p-5">
                    <p className="mb-3 font-bold text-white">
                      الإبلاغ عن المنشور
                    </p>

                    <textarea
                      value={reportReason}
                      onChange={(event) =>
                        setReportReason(event.target.value)
                      }
                      rows={3}
                      placeholder="اكتب سبب البلاغ..."
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                    />

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReportingPost(null)}
                        className="rounded-xl px-4 py-2 text-sm text-white/50"
                      >
                        إلغاء
                      </button>

                      <button
                        type="button"
                        onClick={handleReport}
                        disabled={!reportReason.trim()}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                      >
                        إرسال البلاغ
                      </button>
                    </div>
                  </div>
                )}

                {/* COMMENTS */}

                {isCommentsOpen && (
                  <div className="space-y-4 p-5">
                    {post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-cyan-300">
                                {comment.author
                                  ? `${comment.author.first_name} ${comment.author.last_name}`
                                  : "طالب MARIS"}
                              </p>

                              <span className="text-[11px] text-white/25">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                              {comment.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/35">
                        لا توجد تعليقات بعد. كن أول من يجيب.
                      </p>
                    )}

                    {post.is_locked ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-red-400/10 bg-red-400/5 px-4 py-3">
                        <span className="text-xl">🔒</span>

                        <div>
                          <p className="text-sm font-bold text-red-300">
                            التعليقات مقفولة
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            تم إغلاق التعليقات على هذا المنشور من طرف الإدارة.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={commentText[post.id] ?? ""}
                          onChange={(event) =>
                            setCommentText((current) => ({
                              ...current,
                              [post.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey
                            ) {
                              event.preventDefault();
                              handleComment(post.id);
                            }
                          }}
                          placeholder="اكتب تعليقًا..."
                          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
                        />

                        <button
                          type="button"
                          disabled={
                            commentLoading === post.id ||
                            !commentText[post.id]?.trim()
                          }
                          onClick={() => handleComment(post.id)}
                          className="rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
                        >
                          {commentLoading === post.id
                            ? "..."
                            : "إرسال"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </main>
  );
}
