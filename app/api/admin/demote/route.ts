import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // التحقق من متغيرات Supabase على السيرفر
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("DEMOTE ENV ERROR:", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(supabaseAnonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });

      return NextResponse.json(
        {
          success: false,
          message: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    // الحصول على Authorization Header
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing access token.",
        },
        { status: 401 }
      );
    }

    // Client للتحقق من Session
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
      console.error("DEMOTE AUTH ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    // Service Role Client
    const serviceSupabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // التحقق من صلاحيات الأدمن الحالي
    const {
      data: currentProfile,
      error: currentProfileError,
    } = await serviceSupabase
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
        {
          success: false,
          message: "Failed to verify admin permissions.",
        },
        { status: 500 }
      );
    }

    if (!currentProfile?.is_admin) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to demote users.",
        },
        { status: 403 }
      );
    }

    // قراءة البيانات
    const body = await request.json();

    const marisId =
      typeof body?.maris_id === "string"
        ? body.maris_id.trim()
        : "";

    if (!marisId) {
      return NextResponse.json(
        {
          success: false,
          message: "MARIS ID is required.",
        },
        { status: 400 }
      );
    }

    // البحث عن المستخدم المستهدف
    const {
      data: target,
      error: targetError,
    } = await serviceSupabase
      .from("profiles")
      .select(
        "id, first_name, last_name, maris_id, is_admin, is_super_admin"
      )
      .eq("maris_id", marisId)
      .maybeSingle();

    if (targetError) {
      console.error("FIND TARGET ADMIN ERROR:", targetError);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to find user.",
        },
        { status: 500 }
      );
    }

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    // منع إزالة صلاحيات الأدمن من الحساب الحالي
    if (target.id === user.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot remove your own admin privileges.",
        },
        { status: 403 }
      );
    }

    // حماية Super Admin
    if (target.is_super_admin === true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This admin is protected and cannot be demoted.",
        },
        { status: 403 }
      );
    }

    // إذا لم يكن Admin
    if (!target.is_admin) {
      return NextResponse.json(
        {
          success: false,
          message: "This user is not an admin.",
        },
        { status: 409 }
      );
    }

    // إزالة صلاحيات Admin
    const {
      error: updateError,
    } = await serviceSupabase
      .from("profiles")
      .update({
        is_admin: false,
        is_super_admin: false,
      })
      .eq("id", target.id);

    if (updateError) {
      console.error("DEMOTE USER UPDATE ERROR:", updateError);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to remove admin privileges.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User demoted successfully.",
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
      {
        success: false,
        message: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
