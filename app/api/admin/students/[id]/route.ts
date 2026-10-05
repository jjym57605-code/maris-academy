
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: targetUserId } = await context.params;

    if (!targetUserId) {
      return NextResponse.json(
        {
          error: "معرف الطالب غير موجود.",
        },
        { status: 400 }
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

    // Client باستعمال Session المستخدم الحالي
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

    // التحقق من المستخدم الحالي
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !currentUser) {
      console.error("CURRENT USER ERROR:", userError);

      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة. سجل الدخول من جديد.",
        },
        { status: 401 }
      );
    }

    // منع حذف الحساب الحالي
    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        {
          error: "لا يمكنك حذف حسابك الحالي.",
        },
        { status: 403 }
      );
    }

    // التحقق من صلاحية Admin
    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_current_user_admin");

    if (adminError) {
      console.error("ADMIN CHECK ERROR:", adminError);

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
          error: "ليس لديك صلاحية حذف الطلاب.",
        },
        { status: 403 }
      );
    }

    // Admin client باستعمال Service Role
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

    // التأكد أن الطالب موجود
    const { data: targetProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", targetUserId)
        .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      return NextResponse.json(
        {
          error:
            `تعذر الوصول إلى بيانات الطالب: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        {
          error: "الطالب غير موجود.",
        },
        { status: 404 }
      );
    }

    // التحقق من أن الطالب ليس Admin
    const { data: adminProfiles, error: adminProfilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, is_admin")
        .eq("id", targetUserId)
        .maybeSingle();

    if (adminProfilesError) {
      console.error(
        "TARGET ADMIN CHECK ERROR:",
        adminProfilesError
      );

      return NextResponse.json(
        {
          error:
            `تعذر التحقق من صلاحيات الطالب: ${adminProfilesError.message}`,
        },
        { status: 500 }
      );
    }

    if (adminProfiles?.is_admin === true) {
      return NextResponse.json(
        {
          error: "لا يمكن حذف حساب Admin.",
        },
        { status: 403 }
      );
    }

    // حذف المستخدم من Supabase Auth
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(
        targetUserId
      );

    if (deleteError) {
      console.error(
        "AUTH DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            `فشل حذف حساب الطالب: ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف الطالب بنجاح.",
    });
  } catch (error) {
    console.error(
      "DELETE STUDENT API ERROR:",
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

