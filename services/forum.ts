
import type { SupabaseClient } from "@supabase/supabase-js";

export type ForumAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  maris_id: string;
};

export type ForumComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: ForumAuthor | null;
};

export type ForumPost = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: ForumAuthor | null;
  comments: ForumComment[];
  likes_count: number;
  liked_by_me: boolean;
};

export const FORUM_CATEGORIES = [
  "عام",
  "الرياضيات",
  "الفيزياء",
  "الهندسة المدنية",
  "اللغة العربية",
  "اللغة الفرنسية",
  "اللغة الإنجليزية",
  "التاريخ والجغرافيا",
  "الفلسفة",
  "العلوم الإسلامية",
  "لغات أجنبية",
  "نصائح الدراسة",
] as const;

export async function getForumPosts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ForumPost[]> {
  const { data, error } = await supabase
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
      updated_at,
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
        updated_at,
        author:profiles!forum_comments_author_id_fkey(
          id,
          first_name,
          last_name,
          maris_id
        )
      ),
      likes:forum_likes(
        id,
        user_id
      )
    `)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET FORUM POSTS ERROR:", error);
    throw error;
  }

  return (data ?? []).map((post: any) => {
    const likes = Array.isArray(post.likes) ? post.likes : [];

    return {
      id: post.id,
      author_id: post.author_id,
      title: post.title,
      content: post.content,
      category: post.category,
      is_pinned: post.is_pinned,
      is_locked: post.is_locked,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: post.author ?? null,
      comments: Array.isArray(post.comments)
        ? [...post.comments].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
        : [],
      likes_count: likes.length,
      liked_by_me: likes.some(
        (like: any) => like.user_id === userId,
      ),
    };
  });
}

export async function createForumPost(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  content: string,
  category: string,
) {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle) {
    throw new Error("عنوان المنشور مطلوب.");
  }

  if (!cleanContent) {
    throw new Error("محتوى المنشور مطلوب.");
  }

  if (cleanTitle.length > 150) {
    throw new Error("عنوان المنشور طويل جدًا.");
  }

  if (cleanContent.length > 5000) {
    throw new Error("محتوى المنشور طويل جدًا.");
  }

  const { error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: userId,
      title: cleanTitle,
      content: cleanContent,
      category,
    });

  if (error) {
    console.error("CREATE FORUM POST ERROR:", error);
    throw error;
  }
}

export async function addForumComment(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  content: string,
) {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error("التعليق فارغ.");
  }

  if (cleanContent.length > 3000) {
    throw new Error("التعليق طويل جدًا.");
  }

  const { error } = await supabase
    .from("forum_comments")
    .insert({
      post_id: postId,
      author_id: userId,
      content: cleanContent,
    });

  if (error) {
    console.error("ADD FORUM COMMENT ERROR:", error);

    if (
      error.code === "42501" ||
      error.message?.toLowerCase().includes("row-level security") ||
      error.message?.toLowerCase().includes("rls")
    ) {
      throw new Error(
        "🔒 هذا المنشور مقفول من الإدارة ولا يمكن إضافة تعليقات جديدة.",
      );
    }

    throw error;
  }
}

export async function toggleForumLike(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  liked: boolean,
) {
  if (liked) {
    const { error } = await supabase
      .from("forum_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) {
      console.error("REMOVE FORUM LIKE ERROR:", error);
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("forum_likes")
    .insert({
      post_id: postId,
      user_id: userId,
    });

  if (error) {
    console.error("ADD FORUM LIKE ERROR:", error);
    throw error;
  }
}

export async function reportForumPost(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  reason: string,
) {
  const cleanReason = reason.trim();

  if (!cleanReason) {
    throw new Error("سبب البلاغ مطلوب.");
  }

  const { error } = await supabase
    .from("forum_reports")
    .insert({
      post_id: postId,
      reporter_id: userId,
      reason: cleanReason,
    });

  if (error) {
    console.error("REPORT FORUM POST ERROR:", error);
    throw error;
  }
}

