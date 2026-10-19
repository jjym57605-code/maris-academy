
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getVisitorHash(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  return createHash("sha256")
    .update(`${secret}:${ip}:${userAgent}`)
    .digest("hex");
}

export async function GET(request: Request) {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Visitor counter is not configured." },
      { status: 503 },
    );
  }

  const visitorHash = getVisitorHash(request);

  const { error: recordError } = await supabase.rpc(
    "record_site_visit",
    { p_visitor_hash: visitorHash },
  );

  if (recordError) {
    console.error("Failed to record site visit:", recordError.message);

    return NextResponse.json(
      { error: "Could not record visit." },
      { status: 500 },
    );
  }

  const [
    { data: visitorsData, error: visitorsError },
    { count: studentsCount, error: studentsError },
  ] = await Promise.all([
    supabase.rpc("get_site_visitors_count"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  if (visitorsError || studentsError) {
    console.error("Failed to load homepage statistics:", {
      visitorsError: visitorsError?.message,
      studentsError: studentsError?.message,
    });

    return NextResponse.json(
      { error: "Could not load homepage statistics." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      visitors: Number(visitorsData ?? 0),
      students: studentsCount ?? 0,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
