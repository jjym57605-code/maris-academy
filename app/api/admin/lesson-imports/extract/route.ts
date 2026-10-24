import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 1_000_000;

type ImportRow = {
  id: string;
  created_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

export async function POST(request: NextRequest) {
  let pdfParser: PDFParse | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonError(
        "إعدادات Supabase ناقصة في متغيرات بيئة السيرفر.",
        500
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("لازم تسجل الدخول بحساب الإدارة.", 401);
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    if (!accessToken) {
      return jsonError("جلسة الدخول غير صالحة.", 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonError("جلسة الدخول غير صالحة أو انتهت.", 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Lesson extraction admin check failed:", profileError);
      return jsonError("تعذر التحقق من صلاحيات الإدارة.", 500);
    }

    if (!profile?.is_admin) {
      return jsonError("هذه العملية مخصصة للإدارة فقط.", 403);
    }

    let body: { import_id?: unknown };

    try {
      body = await request.json();
    } catch {
      return jsonError("البيانات المرسلة غير صالحة.", 400);
    }

    const importId =
      typeof body.import_id === "string" ? body.import_id.trim() : "";

    if (
      !importId ||
      importId.length > 100 ||
      !/^[0-9a-f-]+$/i.test(importId)
    ) {
      return jsonError("معرّف الملف غير صالح.", 400);
    }

    const { data: importRow, error: importError } = await adminClient
      .from("lesson_imports")
      .select(
        "id, created_by, file_name, file_path, file_type, file_size, status"
      )
      .eq("id", importId)
      .maybeSingle();

    if (importError) {
      console.error("Lesson import lookup failed:", importError);
      return jsonError("تعذر العثور على سجل الاستيراد.", 500);
    }

    const row = importRow as ImportRow | null;

    if (!row) {
      return jsonError("ملف الاستيراد غير موجود.", 404);
    }

    if (row.status === "approved") {
      return jsonError("لا يمكن إعادة معالجة سجل مقبول.", 409);
    }

    if (row.status === "processing") {
      return jsonError("هذا الملف قيد المعالجة بالفعل.", 409);
    }

    if (row.status === "rejected") {
      return jsonError(
        "هذا الملف مرفوض. غيّر حالته قبل إعادة معالجته.",
        409
      );
    }

    if (!row.file_path || row.file_path.length > 1024) {
      return jsonError("مسار الملف المخزن غير صالح.", 400);
    }

    if (row.file_size !== null && row.file_size > MAX_FILE_SIZE) {
      return jsonError(
        "حجم الملف يتجاوز الحد المسموح وهو 50 MB.",
        413
      );
    }

    const extension = row.file_name.split(".").pop()?.toLowerCase() ?? "";

    if (!["pdf", "docx", "txt"].includes(extension)) {
      return jsonError(
        "المرحلة الحالية تدعم PDF وDOCX وTXT فقط.",
        415
      );
    }

    const { data: storedFile, error: downloadError } = await adminClient
      .storage
      .from("lesson-imports")
      .download(row.file_path);

    if (downloadError || !storedFile) {
      console.error("Lesson import download failed:", downloadError);
      return jsonError("تعذر تنزيل الملف من التخزين الخاص.", 500);
    }

    if (storedFile.size <= 0 || storedFile.size > MAX_FILE_SIZE) {
      return jsonError(
        "حجم الملف الفعلي غير صالح أو يتجاوز 50 MB.",
        413
      );
    }

    const buffer = Buffer.from(await storedFile.arrayBuffer());
    const signature = buffer.subarray(0, 8);

    let extractedText = "";

    if (extension === "pdf") {
      const isPdf =
        buffer.length >= 5 &&
        buffer.subarray(0, 5).toString("ascii") === "%PDF-";

      if (!isPdf) {
        return jsonError(
          "محتوى الملف لا يبدو ملف PDF صالحًا.",
          415
        );
      }

      const workerPath = path.join(
        process.cwd(),
        "node_modules",
        "pdf-parse",
        "node_modules",
        "pdfjs-dist",
        "legacy",
        "build",
        "pdf.worker.mjs"
      );

      PDFParse.setWorker(pathToFileURL(workerPath).href);

      pdfParser = new PDFParse({
        data: new Uint8Array(buffer),
      });

      const result = await pdfParser.getText();
      extractedText = result.text ?? "";
    } else if (extension === "docx") {
      const isZip =
        signature[0] === 0x50 &&
        signature[1] === 0x4b;

      if (!isZip) {
        return jsonError(
          "محتوى الملف لا يبدو ملف DOCX صالحًا.",
          415
        );
      }

      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value ?? "";
    } else {
      const textContentType =
        row.file_type?.toLowerCase().includes("text/plain") ?? false;

      if (!textContentType && !extension) {
        return jsonError(
          "تعذر التحقق من صيغة الملف النصي.",
          415
        );
      }

      extractedText = buffer.toString("utf8");
    }

    const cleanedText = cleanExtractedText(extractedText);

    if (!cleanedText) {
      const { error: emptyUpdateError } = await adminClient
        .from("lesson_imports")
        .update({
          status: "review",
          review_notes:
            "لم يتم العثور على نص قابل للاستخراج. قد يكون PDF مصورًا ويحتاج OCR.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (emptyUpdateError) {
        console.error(
          "Lesson import empty-result update failed:",
          emptyUpdateError
        );
        return jsonError(
          "لم يُعثر على نص، وتعذر تحديث سجل الاستيراد.",
          500
        );
      }

      return NextResponse.json({
        success: true,
        extracted: false,
        message:
          "لم نجد نصًا قابلًا للاستخراج. إذا كان الملف ممسوحًا ضوئيًا، يحتاج إلى OCR.",
        character_count: 0,
      });
    }

    const { error: updateError } = await adminClient
      .from("lesson_imports")
      .update({
        extracted_content: cleanedText,
        status: "review",
        review_notes:
          "تم استخراج النص. راجعه قبل إنشاء درس أو نشره.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("Lesson extracted text save failed:", updateError);
      return jsonError(
        "تم استخراج النص لكن تعذر حفظه في قاعدة البيانات.",
        500
      );
    }

    return NextResponse.json({
      success: true,
      extracted: true,
      message: "تم استخراج النص وحفظه للمراجعة.",
      character_count: cleanedText.length,
      truncated: cleanedText.length >= MAX_EXTRACTED_CHARACTERS,
    });
  } catch (error) {
    console.error("Lesson extraction error:", error);

    return jsonError(
      error instanceof Error
        ? `تعذرت معالجة الملف: ${error.message}`
        : "حدث خطأ غير متوقع أثناء استخراج النص.",
      500
    );
  } finally {
    if (pdfParser) {
      try {
        await pdfParser.destroy();
      } catch (error) {
        console.error("PDF parser cleanup error:", error);
      }
    }
  }
}