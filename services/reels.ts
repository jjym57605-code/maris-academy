import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subject } from "@/types/database";

export interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  is_published: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  subject: Subject | null;
}

export interface ReelLikeState {
  count: number;
  liked: boolean;
}

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export async function getPublishedReels(
  supabase: SupabaseClient
): Promise<Reel[]> {
  const { data, error } = await supabase
    .from("reels")
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Reel[];
}

export async function incrementReelView(
  supabase: SupabaseClient,
  reelId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_reel_view", {
    p_reel_id: reelId,
  });

  if (error) {
    throw error;
  }
}

export async function getReelLikeStates(
  supabase: SupabaseClient,
  reelIds: string[]
): Promise<Record<string, ReelLikeState>> {
  const states: Record<string, ReelLikeState> = {};

  for (const reelId of reelIds) {
    states[reelId] = {
      count: 0,
      liked: false,
    };
  }

  if (reelIds.length === 0) {
    return states;
  }

  const { data: likes, error: likesError } = await supabase
    .from("reel_likes")
    .select("reel_id, user_id")
    .in("reel_id", reelIds);

  if (likesError) {
    throw likesError;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const like of likes ?? []) {
    if (!states[like.reel_id]) {
      states[like.reel_id] = {
        count: 0,
        liked: false,
      };
    }

    states[like.reel_id].count += 1;

    if (user && like.user_id === user.id) {
      states[like.reel_id].liked = true;
    }
  }

  return states;
}

export async function toggleReelLike(
  supabase: SupabaseClient,
  reelId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول للإعجاب بالريل");
  }

  const { data: existingLike, error: checkError } = await supabase
    .from("reel_likes")
    .select("id")
    .eq("reel_id", reelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    throw checkError;
  }

  if (existingLike) {
    const { error } = await supabase
      .from("reel_likes")
      .delete()
      .eq("id", existingLike.id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return false;
  }

  const { error } = await supabase
    .from("reel_likes")
    .insert({
      reel_id: reelId,
      user_id: user.id,
    });

  if (error) {
    throw error;
  }

  return true;
}

export async function getReelComments(
  supabase: SupabaseClient,
  reelId: string
): Promise<ReelComment[]> {
  const { data, error } = await supabase
    .from("reel_comments")
    .select("id, reel_id, user_id, content, created_at")
    .eq("reel_id", reelId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ReelComment[];
}

export async function addReelComment(
  supabase: SupabaseClient,
  reelId: string,
  content: string
): Promise<ReelComment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول لإضافة تعليق");
  }

  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error("التعليق فارغ");
  }

  if (cleanContent.length > 500) {
    throw new Error("التعليق طويل بزاف");
  }

  const { data, error } = await supabase
    .from("reel_comments")
    .insert({
      reel_id: reelId,
      user_id: user.id,
      content: cleanContent,
    })
    .select("id, reel_id, user_id, content, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as ReelComment;
}

export async function deleteReelComment(
  supabase: SupabaseClient,
  commentId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول");
  }

  const { error } = await supabase
    .from("reel_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}