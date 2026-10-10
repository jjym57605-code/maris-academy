"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

const RESOURCE_TYPES = [
  { value: "summary", label: "الملخصات", icon: "📝" },
  { value: "exercise", label: "التمارين", icon: "✏️" },
  { value: "bac_topic", label: "مواضيع البكالوريا", icon: "📄" },
  { value: "solution", label: "الحلول", icon: "✅" },
];

export default function LibrarySubjectPage() {
  const params = useParams();
  const { previewStream } = useStreamPreview();

  const subjectId =
    typeof params.subjectId === "string" ? params.subjectId : "";

  const [subject, setSubject] = useState<LibrarySubject | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadSubject() {
      try {
        setLoading(true);
        setError(null);
        setSubject(null);
        setResources([]);

        const supabase = getSupabase();

        if (!supabase) {
          setError("خدمة قاعدة البيانات غير متاحة حالياً.");
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setError("يجب تسجيل الدخول للوصول إلى المكتبة.");
          return;
        }

        const profile = await getProfile(supabase, user.id);

        if (!profile) {
          setError("لم يتم العثور على ملف الطالب.");
          return;
        }

        if (!subjectId) {
          setError("المادة غير محددة.");
          return;
        }

        // نستخدم شعبة المعاينة إن كانت مفعّلة، وإلا شعبة الحساب الحقيقية.
        const effectiveStream = previewStream ?? profile.stream;

        if (!effectiveStream) {
          setError("لم يتم تحديد شعبة الحساب.");
          return;
        }

        const { data: subjectData, error: subjectError } =
          await supabase
            .from("library_subjects")
            .select(
              "id, stream, name, icon, description, order_index, is_active"
            )
            .eq("id", subjectId)
            .eq("stream", effectiveStream)
            .eq("is_active", true)
            .maybeSingle();

        if (subjectError) throw subjectError;

        // يمنع فتح مادة من شعبة أخرى حتى عند إدخال الرابط مباشرة.
        if (!subjectData) {
          if (!cancelled) {
            setError(
              previewStream
                ? "هذه المادة لا تنتمي إلى شعبة المعاينة الحالية. ارجع إلى المكتبة واختر مادة من الشعبة المحددة."
                : "هذه المادة غير متاحة لشعبتك أو لم تعد منشورة."
            );
          }
          return;
        }

        if (cancelled) return;

        setSubject(subjectData as LibrarySubject);

        const { data: resourcesData, error: resourcesError } =
          await supabase
            .from("library_resources")
            .select(
              "id, subject_id, title, description, resource_type, content, pdf_url, year, is_published"
            )
            .eq("subject_id", subjectId)
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (resourcesError) throw resourcesError;

        if (cancelled) return;

        setResources((resourcesData ?? []) as LibraryResource[]);
      } catch (err) {
        if (cancelled) return;

        console.error("Library subject loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء تحميل المادة."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [subjectId, previewStream]);

  const filteredResources = useMemo(() => {
    if (activeType === "all") return resources;

    return resources.filter(
      (resource) => resource.resource_type === activeType
    );
  }, [resources, activeType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const resource of resources) {
      counts[resource.resource_type] =
        (counts[resource.resource_type] ?? 0) + 1;
    }

    return counts;
  }, [resources]);

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
                className="h-44 rounded-3xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div dir="rtl" className="w-full text-white">
        <Link
          href="/library"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
        >
          → العودة إلى مكتبة الدروس
        </Link>

        <section className="rounded-3xl border border-red-400/20 bg-red-500/5 p-6">
          <div className="mb-3 text-3xl">⚠️</div>

          <h1 className="mb-2 text-xl font-black">
            تعذر تحميل المادة
          </h1>

          <p className="text-sm leading-7 text-foam/60">
            {error ?? "المادة غير متاحة حالياً."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full text-white">
      <Link
        href="/library"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
      >
        → العودة إلى مكتبة الدروس
      </Link>

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-ocean-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-3xl border border-cyan-400/10 bg-cyan-400/10 text-4xl">
              {subject.icon || "📚"}
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                  📖 MARIS LIBRARY
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-foam/50">
                  🎓 {subject.stream}
                  {previewStream && (
                    <span className="mr-2 text-cyan-300">معاينة</span>
                  )}
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {subject.name}
              </h1>

              {subject.description && (
                <p className="mt-2 max-w-3xl text-sm leading-7 text-foam/60">
                  {subject.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <div className="text-xs font-bold text-foam/40">
                    إجمالي الموارد
                  </div>
                  <div className="mt-1 text-xl font-black text-cyan-300">
                    {resources.length}
                  </div>
                </div>

                {RESOURCE_TYPES.map((type) => {
                  const count = typeCounts[type.value] ?? 0;

                  if (count === 0) return null;

                  return (
                    <div
                      key={type.value}
                      className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                    >
                      <div className="text-xs font-bold text-foam/40">
                        {type.icon} {type.label}
                      </div>
                      <div className="mt-1 text-xl font-black text-cyan-300">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          <button
            type="button"
            onClick={() => setActiveType("all")}
            className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
              activeType === "all"
                ? "bg-cyan-500 text-slate-950"
                : "border border-white/10 bg-white/[0.03] text-foam/60 hover:bg-white/[0.07]"
            }`}
          >
            📚 الكل
            <span className="mr-2 opacity-70">{resources.length}</span>
          </button>

          {RESOURCE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setActiveType(type.value)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                activeType === type.value
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-white/10 bg-white/[0.03] text-foam/60 hover:bg-white/[0.07]"
              }`}
            >
              {type.icon} {type.label}
              <span className="mr-2 opacity-70">
                {typeCounts[type.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      {filteredResources.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="text-5xl">🌊</div>

          <h2 className="mt-5 text-xl font-black">
            لا توجد موارد هنا حالياً
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-foam/50">
            سيتم إضافة الموارد ونشرها من لوحة إدارة MARIS ACADEMY.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {filteredResources.map((resource) => {
            const resourceType = RESOURCE_TYPES.find(
              (type) => type.value === resource.resource_type
            );

            return (
              <article
                key={resource.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.05]"
              >
                <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/15" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/10 text-2xl">
                      {resourceType?.icon ?? "📚"}
                    </div>

                    {resource.year && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-foam/40">
                        {resource.year}
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="text-xs font-bold text-cyan-300">
                      {resourceType?.label ?? resource.resource_type}
                    </div>

                    <h2 className="mt-2 text-lg font-black leading-7">
                      {resource.title}
                    </h2>

                    {resource.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-foam/50">
                        {resource.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {resource.content && (
                      <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-foam/40">
                        ✍️ محتوى داخلي
                      </span>
                    )}

                    {resource.pdf_url && (
                      <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-foam/40">
                        📄 PDF
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/library/resource/${resource.id}`}
                      className="flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
                    >
                      فتح المورد →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}