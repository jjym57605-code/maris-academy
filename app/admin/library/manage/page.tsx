"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
created_at: string | null;
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
created_at: string | null;
updated_at: string | null;
};

const RESOURCE_TYPES: Record<string, string> = {
summary: "📘 ملخص",
exercise: "📝 تمرين",
bac_topic: "🎓 موضوع بكالوريا",
solution: "✅ حل",
};

export default function LibraryManagePage() {
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [search, setSearch] = useState("");

const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
const [resources, setResources] = useState<LibraryResource[]>([]);

useEffect(() => {
loadData();
}, []);

async function loadData() {
setLoading(true);
setError("");


try {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("يجب تسجيل الدخول أولاً.");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.is_admin) {
    throw new Error("ليس لديك صلاحية الوصول إلى هذه الصفحة.");
  }

  const [subjectsResult, resourcesResult] = await Promise.all([
    supabase
      .from("library_subjects")
      .select(
        "id, stream, name, icon, description, order_index, is_active, created_at"
      )
      .order("stream", { ascending: true })
      .order("order_index", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("library_resources")
      .select(
        "id, subject_id, title, description, resource_type, content, pdf_url, year, is_published, created_at, updated_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }

  if (resourcesResult.error) {
    throw new Error(resourcesResult.error.message);
  }

  setSubjects((subjectsResult.data ?? []) as LibrarySubject[]);
  setResources((resourcesResult.data ?? []) as LibraryResource[]);
} catch (err) {
  setError(
    err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات."
  );
} finally {
  setLoading(false);
}


}

const normalizedSearch = search.trim().toLocaleLowerCase("ar");

const subjectMap = useMemo(() => {
return new Map(subjects.map((subject) => [subject.id, subject]));
}, [subjects]);

const filteredSubjects = useMemo(() => {
if (!normalizedSearch) {
return subjects;
}


return subjects.filter((subject) => {
  const text = [
    subject.name,
    subject.stream,
    subject.description ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("ar");

  return text.includes(normalizedSearch);
});


}, [subjects, normalizedSearch]);

const filteredResources = useMemo(() => {
if (!normalizedSearch) {
return resources;
}


return resources.filter((resource) => {
  const subject = subjectMap.get(resource.subject_id);

  const text = [
    resource.title,
    resource.description ?? "",
    resource.resource_type,
    RESOURCE_TYPES[resource.resource_type] ?? "",
    subject?.name ?? "",
    subject?.stream ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("ar");

  return text.includes(normalizedSearch);
});


}, [resources, subjectMap, normalizedSearch]);

return ( <main
   dir="rtl"
   className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8"
 > <div className="mx-auto max-w-7xl"> <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"> <div> <h1 className="text-2xl font-bold sm:text-3xl">
🗂️ إدارة المواد والموارد </h1>


        <p className="mt-2 text-sm text-white/60">
          ابحث وشوف جميع المواد والموارد الموجودة حالياً في المكتبة.
        </p>
      </div>

      <Link
        href="/admin/library"
        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/15"
      >
        ← العودة إلى مكتبة الدروس
      </Link>
    </div>

    <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
      <div className="relative">
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg">
          🔎
        </span>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مادة أو مورد..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pr-12 pl-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-cyan-400/50 focus:bg-white/10"
        />
      </div>

      {search.trim() && (
        <div className="mt-3 text-sm text-white/50">
          النتائج: {filteredSubjects.length} مادة ·{" "}
          {filteredResources.length} مورد
        </div>
      )}
    </div>

    {error && (
      <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
        ⚠️ {error}
      </div>
    )}

    {loading ? (
      <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-white/60">
        جاري تحميل المواد والموارد...
      </div>
    ) : (
      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📚 المواد</h2>
              <p className="mt-1 text-sm text-white/50">
                {filteredSubjects.length} مادة
              </p>
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-white/50">
              لا توجد مواد مطابقة للبحث.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((subject) => (
                <article
                  key={subject.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl transition hover:border-cyan-400/20 hover:bg-black/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                      {subject.icon || "📚"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">
                        {subject.name}
                      </h3>

                      <p className="mt-1 text-xs text-cyan-300/80">
                        {subject.stream}
                      </p>
                    </div>
                  </div>

                  {subject.description && (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/55">
                      {subject.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                    <span
                      className={
                        subject.is_active
                          ? "text-emerald-300"
                          : "text-red-300"
                      }
                    >
                      {subject.is_active ? "● مفعّلة" : "● مخفية"}
                    </span>

                    <span className="text-white/40">
                      {resources.filter(
                        (resource) => resource.subject_id === subject.id
                      ).length}{" "}
                      مورد
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📄 الموارد</h2>
              <p className="mt-1 text-sm text-white/50">
                {filteredResources.length} مورد
              </p>
            </div>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-white/50">
              لا توجد موارد مطابقة للبحث.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource) => {
                const subject = subjectMap.get(resource.subject_id);

                return (
                  <article
                    key={resource.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl transition hover:border-cyan-400/20 hover:bg-black/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold leading-6">
                          {resource.title}
                        </h3>

                        <p className="mt-1 text-xs text-cyan-300/80">
                          {subject?.name || "مادة غير معروفة"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-xs">
                        {RESOURCE_TYPES[resource.resource_type] ||
                          resource.resource_type}
                      </span>
                    </div>

                    {resource.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/55">
                        {resource.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs">
                      {resource.year && (
                        <span className="rounded-xl bg-white/5 px-3 py-1.5 text-white/50">
                          📅 {resource.year}
                        </span>
                      )}

                      <span
                        className={
                          resource.is_published
                            ? "rounded-xl bg-emerald-500/10 px-3 py-1.5 text-emerald-300"
                            : "rounded-xl bg-yellow-500/10 px-3 py-1.5 text-yellow-300"
                        }
                      >
                        {resource.is_published
                          ? "● منشور"
                          : "● غير منشور"}
                      </span>

                      {resource.pdf_url && (
                        <span className="rounded-xl bg-red-500/10 px-3 py-1.5 text-red-300">
                          📄 PDF
                        </span>
                      )}

                      {resource.content && !resource.pdf_url && (
                        <span className="rounded-xl bg-blue-500/10 px-3 py-1.5 text-blue-300">
                          📝 محتوى
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    )}
  </div>
</main>


);
}
