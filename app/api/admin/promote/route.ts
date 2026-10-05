
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    // الحصول على Access Token
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

    const accessToken = authorization.replace("Bearer ", "").trim();

    // Client للتحقق من الجلسة
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
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !currentUser) {
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

    // التحقق مباشرة من profiles.is_admin
    // بدل الاعتماد على RPC
    const {
      data: currentProfile,
      error: currentProfileError,
    } = await serviceSupabase
      .from("profiles")
      .select("id, is_admin, is_super_admin")
      .eq("id", currentUser.id)
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
          message: "You do not have permission to promote users.",
        },
        { status: 403 }
      );
    }

    // قراءة MARIS ID
    const body = await request.json();
    const marisId = body?.maris_id?.trim();

    if (!marisId) {
      return NextResponse.json(
        {
          success: false,
          message: "MARIS ID is required.",
        },
        { status: 400 }
      );
    }

    // البحث عن الطالب
    const {
      data: student,
      error: studentError,
    } = await serviceSupabase
      .from("profiles")
      .select(
        "id, first_name, last_name, maris_id, is_admin, is_super_admin"
      )
      .eq("maris_id", marisId)
      .maybeSingle();

    if (studentError) {
      console.error("FIND STUDENT ERROR:", studentError);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to find student.",
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Student with this MARIS ID was not found.",
        },
        { status: 404 }
      );
    }

    // لا يمكن ترقية Admin أصلاً
    if (student.is_admin) {
      return NextResponse.json(
        {
          success: false,
          message: "This user is already an admin.",
        },
        { status: 409 }
      );
    }

    // ترقية الطالب إلى Admin ثانوي
    const {
      error: updateError,
    } = await serviceSupabase
      .from("profiles")
      .update({
        is_admin: true,
        is_super_admin: false,
      })
      .eq("id", student.id);

    if (updateError) {
      console.error("PROMOTE USER ERROR:", updateError);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to promote user.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User promoted to admin successfully.",
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        maris_id: student.maris_id,
        is_admin: true,
        is_super_admin: false,
      },
    });
  } catch (error) {
    console.error("PROMOTE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

