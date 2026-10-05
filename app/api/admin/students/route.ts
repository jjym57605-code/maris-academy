
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: "إعدادات Supabase الأساسية غير موجودة.",
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY غير موجود في .env.local.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error: "لم يتم إرسال Authorization.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Access Token غير موجود.",
        },
        { status: 401 }
      );
    }

    // Client المستخدم الحالي
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // التحقق من المستخدم
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !currentUser) {
      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة. سجل الدخول من جديد.",
        },
        { status: 401 }
      );
    }

    // التحقق من Admin
    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_current_user_admin");

    if (adminError) {
      console.error(
        "ADMIN CHECK ERROR:",
        adminError
      );

      return NextResponse.json(
        {
          error:
            `تعذر التحقق من صلاحيات Admin: ${adminError.message}`,
        },
        { status: 500 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "ليس لديك صلاحية للوصول إلى قائمة الطلاب.",
        },
        { status: 403 }
      );
    }

    // Admin client
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // جلب الطلاب
    const { data: students, error: studentsError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          `
          id,
          first_name,
          last_name,
          stream,
          maris_id,
          created_at,
          is_admin,
          total_xp
        `
        )
        .order("created_at", {
          ascending: false,
        });

    if (studentsError) {
      console.error(
        "GET STUDENTS ERROR:",
        studentsError
      );

      return NextResponse.json(
        {
          error:
            `تعذر تحميل الطلاب: ${studentsError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      students: students ?? [],
    });
  } catch (error) {
    console.error(
      "GET STUDENTS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف.",
      },
      { status: 500 }
    );
  }
}

