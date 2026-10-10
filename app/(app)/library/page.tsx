"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getProfile } from "@/services/auth";
import { useStreamPreview } from "@/contexts/stream-preview";

type LibrarySubject = {
  id: string;
  stream: string;
  name: string;
  icon: string | null;
  description: string | null;
  order_index: number | null;
  is_active: boolean;
};

type LibraryResource = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  content: string | null;
  pdf_url: string | null;
  year: number | null;
  is_published: boolean;
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  summary: "ملخصات",
  exercise: "تمارين",
  bac_topic: "مواضيع بكالوريا",
  solution: "حلول",
};

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  summary: "📝",
  exercise: "✏️",
  bac_topic: "📄",
  solution: "✅",
};

export default function LibraryPage() {
  const { previewStream } = useStreamPreview();

  const [stream, setStream] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();

        if (!supabase) {
          setError("خدمة قاعدة البيانات غير متاحة حالياً.");
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setError("يجب تسجيل الدخول للوصول إلى مكتبة الدروس.");
          return;
        }

        const profile = await getProfile(supabase, user.id);

        if (!profile) {
          setError("لم يتم العثور على ملف الطالب.");
          return;
        }

        // المعاينة تتقدم على الشعبة الحقيقية دون تعديل بيانات الحساب.
        const effectiveStream = previewStream ?? profile.stream;

        if (!effectiveStream) {
          setStream(null);
          setSubjects([]);
          setResources([]);
          setError("لم يتم تحديد شعبة الحساب.");
          return;
        }

        const { data: subjectsData, error: subjectsError } =
          await supabase
            .from("library_subjects")
            .select(
              "id, stream, name, icon, description, order_index, is_active"
            )
            .eq("stream", effectiveStream)
            .eq("is_active", true)
            .order("order_index", { ascending: true })
            .order("name", { ascending: true });

        if (subjectsError) {
          throw subjectsError;
        }

        const loadedSubjects = (subjectsData ?? []) as LibrarySubject[];

        if (cancelled) return;

        setStream(effectiveStream);
        setSubjects(loadedSubjects);

        if (loadedSubjects.length === 0) {
          setResources([]);
          return;
        }

        const subjectIds = loadedSubjects.map((subject) => subject.id);

        const { data: resourcesData, error: resourcesError } =
          await supabase
            .from("library_resources")
            .select(
              "id, subject_id, title, description, resource_type, content, pdf_url, year, is_published"
            )
            .in("subject_id", subjectIds)
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (resourcesError) {
          throw resourcesError;
        }

        if (cancelled) return;

        setResources((resourcesData ?? []) as LibraryResource[]);
      } catch (err) {
        if (cancelled) return;

        console.error("Library loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء تحميل مكتبة الدروس."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [previewStream]);

  const resourcesBySubject = useMemo(() => {
    const map = new Map<string, LibraryResource[]>();

    for (const resource of resources) {
      const current = map.get(resource.subject_id) ?? [];
      current.push(resource);
      map.set(resource.subject_id, current);
    }

    return map;
  }, [resources]);

  const totalResources = resources.length;

  if (loading) {
    return (
      <div dir="rtl" className="w-full text-white">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded-xl bg-white/10" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-white/10" />

          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-48 rounded-3xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="w-full text-white">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
        >
          ← العودة إلى لوحة التحكم
        </Link>

        <section className="rounded-3xl border border-red-400/20 bg-red-500/5 p-6">
          <div className="mb-3 text-3xl">⚠️</div>

          <h1 className="mb-2 text-xl font-black">
            تعذر تحميل مكتبة الدروس
          </h1>

          <p className="text-sm leading-7 text-foam/60">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full text-white">
      {/* Header */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-ocean-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
              📖 MARIS LIBRARY
            </span>

            {stream && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-foam/60">
                🎓 {stream}
                {previewStream && (
                  <span className="mr-2 text-cyan-300">معاينة</span>
                )}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            مكتبة الدروس 📖
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-foam/60">
            كل الموارد التي تحتاجها للمراجعة والاستعداد للبكالوريا، مرتبة
            حسب مواد شعبتك.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <div className="text-xs font-bold text-foam/40">المواد</div>

              <div className="mt-1 text-xl font-black text-cyan-300">
                {subjects.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <div className="text-xs font-bold text-foam/40">الموارد</div>

              <div className="mt-1 text-xl font-black text-cyan-300">
                {totalResources}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Empty */}
      {subjects.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="text-5xl">🌊</div>

          <h2 className="mt-5 text-xl font-black">المكتبة قيد التجهيز</h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-foam/50">
            لم تتم إضافة مواد أو موارد لهذه الشعبة بعد. ستظهر هنا تلقائياً
            عند نشرها من لوحة الإدارة.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject) => {
            const subjectResources =
              resourcesBySubject.get(subject.id) ?? [];

            const typeCounts = subjectResources.reduce(
              (counts, resource) => {
                counts[resource.resource_type] =
                  (counts[resource.resource_type] ?? 0) + 1;

                return counts;
              },
              {} as Record<string, number>
            );

            return (
              <Link
                key={subject.id}
                href={`/library/${subject.id}`}
                className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              >
                <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/15" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/10 text-3xl">
                      {subject.icon || "📚"}
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-foam/50">
                      {subjectResources.length} مورد
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-black">{subject.name}</h2>

                  {subject.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-foam/50">
                      {subject.description}
                    </p>
                  )}

                  {subjectResources.length > 0 ? (
                    <div className="mt-5 space-y-2">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-sm font-bold text-foam/60">
                            <span>{RESOURCE_TYPE_ICONS[type] ?? "📚"}</span>
                            {RESOURCE_TYPE_LABELS[type] ?? type}
                          </span>

                          <span className="text-xs font-black text-cyan-300">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-3 text-center text-xs font-bold text-foam/30">
                      لا توجد موارد منشورة حالياً
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs font-bold text-foam/30">
                      اضغط لاستكشاف المادة
                    </span>

                    <span className="text-cyan-300 transition-transform duration-300 group-hover:-translate-x-1">
                      ←
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}