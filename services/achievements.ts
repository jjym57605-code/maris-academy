
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement,
  UserAchievement,
} from "@/types/database";

export interface UserAchievementWithDetails
  extends UserAchievement {
  achievement: Achievement;
}

/**
 * جلب جميع الإنجازات المتاحة في المنصة.
 */
export async function getAchievements(
  supabase: SupabaseClient
): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as Achievement[];
}

/**
 * جلب الإنجازات التي حصل عليها الطالب.
 */
export async function getUserAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAchievementWithDetails[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq("user_id", userId)
    .order("unlocked_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as UserAchievementWithDetails[];
}

/**
 * جلب الإنجازات الجديدة التي لم يشاهدها الطالب بعد.
 */
export async function getUnseenUserAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAchievementWithDetails[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq("user_id", userId)
    .is("seen_at", null)
    .order("unlocked_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as UserAchievementWithDetails[];
}

/**
 * تسجيل أن الطالب شاهد إنجازاً معيناً.
 */
export async function markAchievementAsSeen(
  supabase: SupabaseClient,
  userAchievementId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_achievements")
    .update({
      seen_at: new Date().toISOString(),
    })
    .eq("id", userAchievementId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

/**
 * تسجيل عدة إنجازات كمشاهدة دفعة واحدة.
 */
export async function markAchievementsAsSeen(
  supabase: SupabaseClient,
  userAchievementIds: string[],
  userId: string
): Promise<void> {
  if (userAchievementIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("user_achievements")
    .update({
      seen_at: new Date().toISOString(),
    })
    .in("id", userAchievementIds)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

