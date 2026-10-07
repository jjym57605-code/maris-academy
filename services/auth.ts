"use client";

import type {
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_admin: boolean | null;
};

export type ProfileDefaults = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
};

/* =====================================================
   استخراج بيانات الطالب من Supabase Auth
===================================================== */

export function profileDefaultsFromUser(
  user: User
): ProfileDefaults {
  const firstName =
    typeof user.user_metadata?.firstName === "string"
      ? user.user_metadata.firstName
      : null;

  const lastName =
    typeof user.user_metadata?.lastName === "string"
      ? user.user_metadata.lastName
      : null;

  const stream =
    typeof user.user_metadata?.stream === "string"
      ? user.user_metadata.stream
      : null;

  return {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    stream,
  };
}

/* =====================================================
   تسجيل الدخول
===================================================== */

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

/* =====================================================
   إنشاء الحساب
   Profile يتخلق تلقائياً بواسطة Supabase Trigger
===================================================== */

export async function signUp(
  supabase: SupabaseClient,
  email: string,
  password: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

/* =====================================================
   جلب Session الحالية
===================================================== */

export async function getSession(
  supabase: SupabaseClient
): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  console.log("=== SUPABASE SESSION CHECK ===");
  console.log("HAS SESSION:", Boolean(session));
  console.log("USER ID:", session?.user?.id ?? null);
  console.log(
    "ACCESS TOKEN EXISTS:",
    Boolean(session?.access_token)
  );
  console.log("SESSION ERROR:", error);

  if (error) {
    throw error;
  }

  return session;
}

/* =====================================================
   تسجيل الخروج
===================================================== */

export async function signOut(
  supabase: SupabaseClient
): Promise<void> {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/* =====================================================
   جلب Profile الموجود
   مهم:
   هذه الدالة لا تنشئ Profile جديد.
===================================================== */

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  console.log("=== GET PROFILE ===");
  console.log("USER ID:", userId);

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      stream,
      maris_id,
      created_at,
      updated_at,
      is_admin
      `
    )
    .eq("id", userId)
    .maybeSingle();

  console.log("PROFILE:", data);
  console.log("PROFILE ERROR:", error);

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

/* =====================================================
   التأكد من وجود Profile
   لا يقوم بإنشاء Profile.
===================================================== */

export async function ensureProfile(
  supabase: SupabaseClient,
  user: User
): Promise<Profile> {
  console.log("=== ENSURE PROFILE ===");
  console.log("AUTH USER ID:", user.id);

  const profile = await getProfile(
    supabase,
    user.id
  );

  if (!profile) {
    console.error(
      "PROFILE NOT FOUND FOR AUTH USER:",
      user.id
    );

    throw new Error(
      "لم يتم العثور على الملف الشخصي لهذا الحساب. أعد تسجيل الدخول أو تواصل مع الإدارة."
    );
  }

  console.log("PROFILE FOUND:", profile);

  return profile;
}




