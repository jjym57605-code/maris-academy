"use client";

import { getSupabase } from "@/lib/supabase";

export type AnnouncementType =
  | "general"
  | "course"
  | "teacher"
  | "update";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
};

export const ANNOUNCEMENT_TYPES: {
  value: AnnouncementType;
  label: string;
}[] = [
  {
    value: "general",
    label: "عام",
  },
  {
    value: "course",
    label: "دورة",
  },
  {
    value: "teacher",
    label: "أستاذ",
  },
  {
    value: "update",
    label: "تحديث",
  },
];

function getClient() {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error("تعذر الاتصال بقاعدة البيانات.");
  }

  return supabase;
}

/* =========================================================
   GET ACTIVE ANNOUNCEMENTS
========================================================= */

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      content,
      type,
      is_active,
      created_by,
      created_at,
      updated_at,
      image_url
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active announcements:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Announcement[];
}

/* =========================================================
   GET ALL ANNOUNCEMENTS
========================================================= */

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      content,
      type,
      is_active,
      created_by,
      created_at,
      updated_at,
      image_url
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Announcement[];
}

/* =========================================================
   CREATE ANNOUNCEMENT
========================================================= */

export async function createAnnouncement(params: {
  title: string;
  content: string;
  type: AnnouncementType;
  image_url?: string | null;
}): Promise<Announcement> {
  const supabase = getClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولًا.");
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: params.title,
      content: params.content,
      type: params.type,
      image_url: params.image_url ?? null,
      created_by: user.id,
    })
    .select(`
      id,
      title,
      content,
      type,
      is_active,
      created_by,
      created_at,
      updated_at,
      image_url
    `)
    .single();

  if (error) {
    console.error("Error creating announcement:", error);
    throw new Error(error.message);
  }

  return data as Announcement;
}

/* =========================================================
   UPDATE ANNOUNCEMENT
========================================================= */

export async function updateAnnouncement(
  id: string,
  params: {
    title: string;
    content: string;
    type: AnnouncementType;
    image_url?: string | null;
  },
): Promise<Announcement> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("announcements")
    .update({
      title: params.title,
      content: params.content,
      type: params.type,
      image_url: params.image_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      id,
      title,
      content,
      type,
      is_active,
      created_by,
      created_at,
      updated_at,
      image_url
    `)
    .single();

  if (error) {
    console.error("Error updating announcement:", error);
    throw new Error(error.message);
  }

  return data as Announcement;
}

/* =========================================================
   TOGGLE ANNOUNCEMENT
========================================================= */

export async function toggleAnnouncement(
  id: string,
  isActive: boolean,
): Promise<void> {
  const supabase = getClient();

  const { error } = await supabase
    .from("announcements")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error toggling announcement:", error);
    throw new Error(error.message);
  }
}

/* =========================================================
   DELETE ANNOUNCEMENT
========================================================= */

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = getClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting announcement:", error);
    throw new Error(error.message);
  }
}

/* =========================================================
   UPLOAD ANNOUNCEMENT IMAGE
========================================================= */

export async function uploadAnnouncementImage(
  file: File,
): Promise<string> {
  const supabase = getClient();

  if (!file) {
    throw new Error("لم يتم اختيار صورة.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 10MB.");
  }

  const fileExtension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;

  const filePath = `announcements/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("announcements")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Error uploading announcement image:", uploadError);
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("announcements")
    .getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error("تعذر الحصول على رابط الصورة.");
  }

  return publicUrl;
}

/* =========================================================
   DELETE ANNOUNCEMENT IMAGE
========================================================= */

export async function deleteAnnouncementImage(
  imageUrl: string | null | undefined,
): Promise<void> {
  const supabase = getClient();

  if (!imageUrl) {
    return;
  }

  try {
    const marker = "/storage/v1/object/public/announcements/";

    const markerIndex = imageUrl.indexOf(marker);

    if (markerIndex === -1) {
      return;
    }

    const filePath = decodeURIComponent(
      imageUrl.substring(markerIndex + marker.length),
    );

    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage
      .from("announcements")
      .remove([filePath]);

    if (error) {
      console.error(
        "Error deleting announcement image:",
        error,
      );
    }
  } catch (error) {
    console.error(
      "Error parsing announcement image URL:",
      error,
    );
  }
}
