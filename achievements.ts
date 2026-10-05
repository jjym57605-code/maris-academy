import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, UserAchievement } from "@/types/database";

export interface UserAchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

/** جلب جميع الإنجازات المتاحة */
export async function getAchievements(
  supabase: SupabaseClient
): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Achievement[];
}

/** جلب إنجازات الطالب المكتسبة */
export async function getUserAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAchievementWithDetails[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select(
      `
      *,
      achievement:achievements(*)
      `
    )
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as UserAchievementWithDetails[];
}