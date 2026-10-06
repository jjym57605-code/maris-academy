"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getProfile } from "@/services/auth";

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
  {
    value: "summary",
    label: "الملخصات",
    icon: "📝",
  },
  {
    value: "exercise",
    label: "التمارين",
    icon: "✏️",
  },
  {
    value: "bac_topic",
    label: "مواضيع البكالوريا",
    icon: "📄",
  },
  {
    value: "solution",
    label: "الحلول",
    icon: "✅",
  },
];

export default function LibrarySubjectPage() {
  const params = useParams();
  const router = useRouter();

  const subjectId =
    typeof params.subjectId === "string"
      ? params.subjectId
      : "";

  const [subject, setSubject] = useState<LibrarySubject | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    async function loadSubject() {
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
          setError("يجب تسجيل الدخول للوصول إلى المكتبة.");
          return;
        }

        const profile = await getProfile(supabase, user.id);

        if (!profile) {
          setError("لم يتم العثور على ملف الطالب.");
          return;
        }

        if (!profile.stream) {
          setError("لم يتم تحديد شعبة الطالب.");
          return;
        }

        if (!subjectId) {
          setError("المادة غير محددة.");
          return;
        }

        const { data: subjectData, error: subjectError } =
          await supabase
            .from("library_subjects")
            .select(
              "id, stream, name, icon, description, order_index, is_active"
            )
            .eq("id", subjectId)
            .eq("stream", profile.stream)
            .eq("is_active", true)
            .maybeSingle();

        if (subjectError) {
          throw subjectError;
        }

        if (!subjectData) {
          setError(
            "هذه المادة غير متاحة لشعبتك أو لم تعد منشورة."
          );
          return;
        }

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

        if (resourcesError) {
          throw resourcesError;
        }

        setResources((resourcesData ?? []) as LibraryResource[]);
      } catch (err) {
        console.error("Library subject loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء تحميل المادة."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSubject();
  }, [subjectId]);

  const filteredResources = useMemo(() => {
    if (activeType === "all") {
      return resources;
    }

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
      <main className="min-h-screen bg-[#06131f] px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-white/10" />
            <div className="h-5 w-96 max-w-full rounded-lg bg-white/10" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-48 rounded-3xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !subject) {
    return (
      <main className="min-h-screen bg-[#06131f] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/library"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            → العودة إلى مكتبة الدروس
          </Link>

          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6">
            <div className="mb-3 text-3xl">⚠️</div>

            <h1 className="mb-2 text-xl font-black">
              تعذر تحميل المادة
            </h1>

            <p className="text-sm leading-7 text-slate-300">
              {error ?? "المادة غير متاحة حالياً."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06131f] px-4 py-6 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Back */}
        <Link
          href="/library"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
        >
          → العودة إلى مكتبة الدروس
        </Link>

        {/* Subject Header */}
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-gradient-to-br from-cyan-400/[0.12] via-white/[0.04] to-blue-500/[0.08] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-cyan-300/10 bg-cyan-300/10 text-5xl">
                {subject.icon || "📚"}
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                    📖 MARIS LIBRARY
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                    🎓 {subject.stream}
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {subject.name}
                </h1>

                {subject.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                    {subject.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="text-xs font-bold text-slate-400">
                      إجمالي الموارد
                    </div>

                    <div className="mt-1 text-xl font-black text-cyan-200">
                      {resources.length}
                    </div>
                  </div>

                  {RESOURCE_TYPES.map((type) => {
                    const count = typeCounts[type.value] ?? 0;

                    if (count === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={type.value}
                        className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                      >
                        <div className="text-xs font-bold text-slate-400">
                          {type.icon} {type.label}
                        </div>

                        <div className="mt-1 text-xl font-black text-cyan-200">
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

        {/* Filters */}
        <section className="mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            <button
              onClick={() => setActiveType("all")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                activeType === "all"
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              📚 الكل
              <span className="mr-2 opacity-70">
                {resources.length}
              </span>
            </button>

            {RESOURCE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setActiveType(type.value)}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                  activeType === type.value
                    ? "bg-cyan-500 text-slate-950"
                    : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
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

        {/* Resources */}
        {filteredResources.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-10 text-center">
            <div className="text-5xl">🌊</div>

            <h2 className="mt-5 text-2xl font-black">
              لا توجد موارد هنا حالياً
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              سيتم إضافة الموارد ونشرها من لوحة إدارة MARIS ACADEMY.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => {
              const resourceType =
                RESOURCE_TYPES.find(
                  (type) => type.value === resource.resource_type
                );

              return (
                <article
                  key={resource.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.06]"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/15" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-300/10 text-2xl">
                        {resourceType?.icon ?? "📚"}
                      </div>

                      {resource.year && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-400">
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
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                          {resource.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {resource.content && (
                        <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-400">
                          ✍️ محتوى داخلي
                        </span>
                      )}

                      {resource.pdf_url && (
                        <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-400">
                          📄 PDF
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex gap-2">
                      <Link
                        href={`/library/resource/${resource.id}`}
                        className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-cyan-400"
                      >
                        فتح المورد →
                      </Link>

                      {resource.pdf_url && (
                        <a
                          href={resource.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
                        >
                          📄
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}