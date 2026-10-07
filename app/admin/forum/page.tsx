
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getSupabase } from "@/lib/supabase";

type Author = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  maris_id: string | null;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Author | null;
};

type Post = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  author: Author | null;
  comments: Comment[];
  likes_count: number;
};

type Report = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  created_at: string;
  reporter: Author | null;
  post: {
    id: string;
    title: string;
  } | null;
  comment: {
    id: string;
    content: string;
  } | null;
};

type Filter = "all" | "pinned" | "locked" | "reports";

export default function AdminForumPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadForum = useCallback(async () => {
    try {
      setError("");

      const supabase = getSupabase();

      if (!supabase) {
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminData, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminData !== true) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      const { data: postsData, error: postsError } = await supabase
        .from("forum_posts")
        .select(`
          id,
          author_id,
          title,
          content,
          category,
          is_pinned,
          is_locked,
          created_at,
          author:profiles!forum_posts_author_id_fkey(
            id,
            first_name,
            last_name,
            maris_id
          ),
          comments:forum_comments(
            id,
            post_id,
            author_id,
            content,
            created_at,
            author:profiles!forum_comments_author_id_fkey(
              id,
              first_name,
              last_name,
              maris_id
            )
          ),
          likes:forum_likes(
            id
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const { data: reportsData, error: reportsError } = await supabase
        .from("forum_reports")
        .select(`
          id,
          post_id,
          comment_id,
          reporter_id,
          reason,
          created_at,
          reporter:profiles!forum_reports_reporter_id_fkey(
            id,
            first_name,
            last_name,
            maris_id
          ),
          post:forum_posts(
            id,
            title
          ),
          comment:forum_comments(
            id,
            content
          )
        `)
        .order("created_at", { ascending: false });

      if (reportsError) {
        throw reportsError;
      }

      const normalizedPosts: Post[] = (postsData ?? []).map(
        (post: any) => ({
          id: post.id,
          author_id: post.author_id,
          title: post.title,
          content: post.content,
          category: post.category,
          is_pinned: post.is_pinned,
          is_locked: post.is_locked,
          created_at: post.created_at,
          author: post.author ?? null,
          comments: Array.isArray(post.comments)
            ? [...post.comments].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )
            : [],
          likes_count: Array.isArray(post.likes)
            ? post.likes.length
            : 0,
        })
      );

      setPosts(normalizedPosts);
     setReports(
  (reportsData ?? []).map((report: any) => ({
    id: report.id,
    post_id: report.post_id,
    comment_id: report.comment_id,
    reporter_id: report.reporter_id,
    reason: report.reason,
    created_at: report.created_at,

    reporter: Array.isArray(report.reporter)
      ? report.reporter[0] ?? null
      : report.reporter ?? null,

    post: Array.isArray(report.post)
      ? report.post[0] ?? null
      : report.post ?? null,

    comment: Array.isArray(report.comment)
      ? report.comment[0] ?? null
      : report.comment ?? null,
  }))
);
    } catch (err) {
      console.error("ADMIN FORUM LOAD ERROR:", err);
      setError("حدث خطأ أثناء تحميل إدارة المنتدى.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadForum();
  }, [loadForum]);

  async function updatePost(
    postId: string,
    changes: {
      is_pinned?: boolean;
      is_locked?: boolean;
    }
  ) {
    const supabase = getSupabase();

    if (!supabase) return;

    try {
      setBusyId(postId);
      setError("");

      const { error: updateError } = await supabase
        .from("forum_posts")
        .update(changes)
        .eq("id", postId);

      if (updateError) {
        throw updateError;
      }

      await loadForum();
    } catch (err) {
      console.error("ADMIN FORUM UPDATE ERROR:", err);
      setError("تعذر تحديث المنشور.");
    } finally {
      setBusyId(null);
    }
  }

  async function deletePost(postId: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المنشور؟ سيتم حذف تعليقاته وإعجاباته المرتبطة به."
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) return;

    try {
      setBusyId(postId);
      setError("");

      const { error: deleteError } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", postId);

      if (deleteError) {
        throw deleteError;
      }

      await loadForum();
    } catch (err) {
      console.error("ADMIN FORUM DELETE POST ERROR:", err);
      setError("تعذر حذف المنشور.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التعليق؟"
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) return;

    try {
      setBusyId(commentId);
      setError("");

      const { error: deleteError } = await supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) {
        throw deleteError;
      }

      await loadForum();
    } catch (err) {
      console.error("ADMIN FORUM DELETE COMMENT ERROR:", err);
      setError("تعذر حذف التعليق.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReport(reportId: string) {
    const supabase = getSupabase();

    if (!supabase) return;

    try {
      setBusyId(reportId);
      setError("");

      const { error: deleteError } = await supabase
        .from("forum_reports")
        .delete()
        .eq("id", reportId);

      if (deleteError) {
        throw deleteError;
      }

      await loadForum();
    } catch (err) {
      console.error("ADMIN FORUM DELETE REPORT ERROR:", err);
      setError("تعذر حذف البلاغ.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center px-4"
      >
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
            💬
          </div>

          <p className="text-sm font-medium text-slate-400">
            جاري تحميل إدارة المنتدى...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) return null;

  const visiblePosts =
    filter === "pinned"
      ? posts.filter((post) => post.is_pinned)
      : filter === "locked"
      ? posts.filter((post) => post.is_locked)
      : posts;

  return (
    <main
      dir="rtl"
      className="min-h-full px-4 py-6 text-slate-100 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#071b2d] via-[#08283d] to-[#063247] p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              ← العودة إلى لوحة الإدارة
            </Link>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              <span>💬</span>
              <span>إدارة مجتمع الطلبة</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              💬 إدارة المنتدى
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              إدارة منشورات الطلبة، التعليقات، التثبيت، القفل والبلاغات
              من مكان واحد.
            </p>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* STATS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStat
            icon="💬"
            label="المنشورات"
            value={posts.length}
          />

          <AdminStat
            icon="💭"
            label="التعليقات"
            value={posts.reduce(
              (total, post) => total + post.comments.length,
              0
            )}
          />

          <AdminStat
            icon="📌"
            label="منشورات مثبتة"
            value={posts.filter((post) => post.is_pinned).length}
          />

          <AdminStat
            icon="🚨"
            label="البلاغات"
            value={reports.length}
          />
        </section>

        {/* FILTERS */}
        <section className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-4 shadow-xl shadow-black/10">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              💬 كل المنشورات
            </FilterButton>

            <FilterButton
              active={filter === "pinned"}
              onClick={() => setFilter("pinned")}
            >
              📌 المثبتة
            </FilterButton>

            <FilterButton
              active={filter === "locked"}
              onClick={() => setFilter("locked")}
            >
              🔒 المقفلة
            </FilterButton>

            <FilterButton
              active={filter === "reports"}
              onClick={() => setFilter("reports")}
            >
              🚨 البلاغات ({reports.length})
            </FilterButton>
          </div>
        </section>

        {/* REPORTS */}
        {filter === "reports" ? (
          <section className="space-y-4">
            {reports.length === 0 ? (
              <EmptyBox
                icon="✅"
                title="لا توجد بلاغات"
                description="المنتدى خالٍ حاليًا من البلاغات."
              />
            ) : (
              reports.map((report) => (
                <section
                  key={report.id}
                  className="rounded-3xl border border-red-400/10 bg-[#071b2d]/80 p-5 shadow-xl shadow-black/10"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 inline-flex rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                          🚨 بلاغ
                        </div>

                        <h2 className="text-lg font-bold text-white">
                          {report.post?.title ??
                            "منشور غير متوفر"}
                        </h2>
                      </div>

                      <span className="text-xs text-slate-500">
                        {new Date(
                          report.created_at
                        ).toLocaleString("ar-DZ")}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        سبب البلاغ
                      </p>

                      <p className="mt-2 leading-7 text-slate-300">
                        {report.reason}
                      </p>
                    </div>

                    {report.comment && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          التعليق المبلّغ عنه
                        </p>

                        <p className="mt-2 leading-7 text-slate-300">
                          {report.comment.content}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        المبلّغ:{" "}
                        <span className="text-slate-300">
                          {getAuthorName(report.reporter)}
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {report.post_id && (
                          <Link
                            href="/forum"
                            className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10"
                          >
                            فتح المنتدى
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={busyId === report.id}
                          onClick={() =>
                            deleteReport(report.id)
                          }
                          className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                        >
                          {busyId === report.id
                            ? "جاري..."
                            : "✓ تمت المراجعة"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ))
            )}
          </section>
        ) : (
          /* POSTS */
          <section className="space-y-5">
            {visiblePosts.length === 0 ? (
              <EmptyBox
                icon="💬"
                title="لا توجد منشورات"
                description="لم يتم العثور على منشورات ضمن هذا التصنيف."
              />
            ) : (
              visiblePosts.map((post) => (
                <section
                  key={post.id}
                  className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 shadow-xl shadow-black/10"
                >
                  {/* POST HEADER */}
                  <div className="border-b border-white/5 p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap gap-2">
                            {post.is_pinned && (
                              <span className="badge !border-amber-400/20 !bg-amber-400/10 !text-amber-300">
                                📌 مثبت
                              </span>
                            )}

                            {post.is_locked && (
                              <span className="badge !border-red-400/20 !bg-red-400/10 !text-red-300">
                                🔒 مقفل
                              </span>
                            )}

                            <span className="badge">
                              {post.category}
                            </span>
                          </div>

                          <h2 className="break-words text-xl font-bold text-white">
                            {post.title}
                          </h2>

                          <p className="mt-2 text-xs text-slate-500">
                            بواسطة{" "}
                            <span className="text-cyan-300">
                              {getAuthorName(post.author)}
                            </span>{" "}
                            ·{" "}
                            {post.author?.maris_id ??
                              "بدون MARIS ID"}{" "}
                            ·{" "}
                            {new Date(
                              post.created_at
                            ).toLocaleString("ar-DZ")}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                          <span>❤️ {post.likes_count}</span>
                          <span>💬 {post.comments.length}</span>
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap break-words leading-8 text-slate-300">
                        {post.content}
                      </p>
                    </div>
                  </div>

                  {/* ADMIN ACTIONS */}
                  <div className="flex flex-wrap gap-2 border-b border-white/5 bg-white/[0.015] p-4">
                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() =>
                        updatePost(post.id, {
                          is_pinned: !post.is_pinned,
                        })
                      }
                      className="rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-50"
                    >
                      {post.is_pinned
                        ? "📌 إلغاء التثبيت"
                        : "📌 تثبيت"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() =>
                        updatePost(post.id, {
                          is_locked: !post.is_locked,
                        })
                      }
                      className="rounded-xl border border-violet-400/15 bg-violet-400/5 px-4 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-400/10 disabled:opacity-50"
                    >
                      {post.is_locked
                        ? "🔓 فتح التعليقات"
                        : "🔒 قفل التعليقات"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() => deletePost(post.id)}
                      className="rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                    >
                      {busyId === post.id
                        ? "جاري..."
                        : "🗑️ حذف المنشور"}
                    </button>
                  </div>

                  {/* COMMENTS */}
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">
                        💬 التعليقات ({post.comments.length})
                      </h3>
                    </div>

                    {post.comments.length === 0 ? (
                      <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-slate-500">
                        لا توجد تعليقات على هذا المنشور.
                      </p>
                    ) : (
                      post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-bold text-cyan-300">
                                {getAuthorName(comment.author)}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-600">
                                {comment.author?.maris_id ??
                                  "بدون MARIS ID"}{" "}
                                ·{" "}
                                {new Date(
                                  comment.created_at
                                ).toLocaleString("ar-DZ")}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={
                                busyId === comment.id
                              }
                              onClick={() =>
                                deleteComment(comment.id)
                              }
                              className="shrink-0 rounded-xl border border-red-400/10 bg-red-400/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                            >
                              🗑️ حذف
                            </button>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-300">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function getAuthorName(author: Author | null) {
  if (!author) return "طالب بدون اسم";

  const name = `${author.first_name ?? ""} ${
    author.last_name ?? ""
  }`.trim();

  return name || "طالب بدون اسم";
}

function AdminStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-cyan-300">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-bold text-cyan-300"
          : "rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:border-cyan-400/10 hover:text-slate-300"
      }
    >
      {children}
    </button>
  );
}

function EmptyBox({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-12 text-center shadow-xl shadow-black/10">
      <div className="text-4xl">{icon}</div>

      <h2 className="mt-4 font-bold text-white">
        {title}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

