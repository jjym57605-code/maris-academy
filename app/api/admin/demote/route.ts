
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    // التحقق من جلسة المستخدم
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    // Service Role Client
    const adminSupabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // التحقق مباشرة من صلاحية المستخدم الحالي
    const {
      data: currentProfile,
      error: currentProfileError,
    } = await adminSupabase
      .from("profiles")
      .select("id, is_admin, is_super_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (currentProfileError) {
      console.error(
        "CURRENT ADMIN CHECK ERROR:",
        currentProfileError
      );

      return NextResponse.json(
        { error: "Failed to verify admin permissions." },
        { status: 500 }
      );
    }

    if (!currentProfile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    // قراءة MARIS ID
    const body = await request.json();
    const marisId = body?.maris_id?.trim();

    if (!marisId) {
      return NextResponse.json(
        { error: "maris_id is required." },
        { status: 400 }
      );
    }

    // البحث عن الـ Admin المستهدف
    const {
      data: target,
      error: targetError,
    } = await adminSupabase
      .from("profiles")
      .select(
        "id, first_name, last_name, maris_id, is_admin, is_super_admin"
      )
      .eq("maris_id", marisId)
      .maybeSingle();

    if (targetError) {
      console.error("FIND TARGET ADMIN ERROR:", targetError);

      return NextResponse.json(
        { error: "Failed to find user." },
        { status: 500 }
      );
    }

    if (!target) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // منع إزالة صلاحيات نفسك
    if (target.id === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot remove your own admin privileges.",
        },
        { status: 403 }
      );
    }

    // حماية الـ Admin الأساسي
    if (target.is_super_admin === true) {
      return NextResponse.json(
        {
          error:
            "This admin is protected and cannot be demoted.",
        },
        { status: 403 }
      );
    }

    // إذا لم يكن Admin أصلاً
    if (!target.is_admin) {
      return NextResponse.json(
        {
          error: "This user is not an admin.",
        },
        { status: 409 }
      );
    }

    // إزالة صلاحيات الـ Admin الثانوي
    const {
      error: updateError,
    } = await adminSupabase
      .from("profiles")
      .update({
        is_admin: false,
        is_super_admin: false,
      })
      .eq("id", target.id);

    if (updateError) {
      console.error("DEMOTE ADMIN ERROR:", updateError);

      return NextResponse.json(
        {
          error: "Failed to remove admin privileges.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin privileges removed successfully.",
      student: {
        id: target.id,
        first_name: target.first_name,
        last_name: target.last_name,
        maris_id: target.maris_id,
        is_admin: false,
        is_super_admin: false,
      },
    });
  } catch (error) {
    console.error("DEMOTE API ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

