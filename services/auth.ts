
"use client";

import type {
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

export type ProfileDefaults = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
};

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

function generateMarisId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return `MR-${code}`;
}

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

export async function getSession(
  supabase: SupabaseClient
): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function signOut(
  supabase: SupabaseClient
): Promise<void> {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function ensureProfile(
  supabase: SupabaseClient,
  user: User
) {
  console.log("=== ENSURE PROFILE ===");
  console.log("AUTH USER ID:", user.id);

  // ============================================
  // 1. نبحث عن Profile موجود
  // ============================================

  const {
    data: existingProfile,
    error: selectError,
  } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, stream, maris_id, created_at, updated_at, is_admin"
    )
    .eq("id", user.id)
    .maybeSingle();

  console.log("EXISTING PROFILE:", existingProfile);
  console.log("PROFILE SELECT ERROR:", selectError);

  if (selectError) {
    throw selectError;
  }

  // ============================================
  // 2. إذا موجود → نرجعو مباشرة
  // ============================================

  if (existingProfile) {
    console.log("PROFILE FOUND:", existingProfile);

    return existingProfile;
  }

  // ============================================
  // 3. Profile غير موجود → ننشئ واحد
  // ============================================

  console.log(
    "PROFILE NOT FOUND. CREATING PROFILE..."
  );

  const defaults = profileDefaultsFromUser(user);

  const newProfile = {
    id: user.id,
    first_name: defaults.first_name,
    last_name: defaults.last_name,
    stream: defaults.stream,
    maris_id: generateMarisId(),
    is_admin: false,
  };

  console.log(
    "NEW PROFILE DATA:",
    newProfile
  );

  const {
    data: createdProfile,
    error: insertError,
  } = await supabase
    .from("profiles")
    .insert(newProfile)
    .select(
      "id, first_name, last_name, stream, maris_id, created_at, updated_at, is_admin"
    )
    .single();

  if (insertError) {
    console.error(
      "PROFILE INSERT ERROR:",
      insertError
    );

    throw insertError;
  }

  if (!createdProfile) {
    throw new Error(
      "Profile creation returned no data."
    );
  }

  console.log(
    "PROFILE CREATED SUCCESSFULLY:",
    createdProfile
  );

  return createdProfile;
}





