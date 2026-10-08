"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";

import { getSupabase } from "@/lib/supabase";
import { getSession, getProfile } from "@/services/auth";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Resource = {
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

type Subject = {
  id: string;
  name: string;
  icon: string | null;
  stream: string;
  is_active: boolean;
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  summary: "ملخص",
  exercise: "تمرين",
  bac_topic: "موضوع بكالوريا",
  solution: "حل",
};

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  summary: "📝",
  exercise: "✏️",
  bac_topic: "📄",
  solution: "✅",
};

function isStoragePath(value: string | null) {
  return Boolean(
    value &&
      (value.startsWith("library-pdfs/") ||
        value.startsWith("library-pdfs\\"))
  );
}

function cleanStoragePath(value: string) {
  return value
    .replace(/^library-pdfs[\\/]/, "")
    .replace(/^[/\\]+/, "");
}

function getFileName(path: string) {
  const cleanPath = cleanStoragePath(path);
  const lastPart = cleanPath.split("/").pop();

  return lastPart || "document.pdf";
}

export default function LibraryResourcePage() {
  const params = useParams();
  const router = useRouter();

  const resourceId = String(params.resourceId);

  const viewerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<Resource | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [pdfPages, setPdfPages] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(0);

  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const element = viewerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      const width = element.clientWidth;

      if (width > 0) {
        setPdfWidth(Math.min(width - 16, 1000));
      }
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [pdfUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadResource() {
      try {
        setLoading(true);
        setError("");
        setPdfError("");
        setPdfUrl(null);
        setPdfPages(0);

        const supabase = getSupabase();

        if (!supabase) {
          throw new Error("Supabase غير مهيأ.");
        }

        const session = await getSession(supabase);

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const profile = await getProfile(supabase, session.user.id);

        if (!profile) {
          throw new Error("تعذر العثور على ملف الطالب.");
        }

        if (!profile.stream) {
          throw new Error("لم يتم تحديد شعبة الطالب.");
        }

        const { data: resourceData, error: resourceError } =
          await supabase
            .from("library_resources")
            .select(
              `
                id,
                subject_id,
                title,
                description,
                resource_type,
                content,
                pdf_url,
                year,
                is_published
              `
            )
            .eq("id", resourceId)
            .eq("is_published", true)
            .maybeSingle();

        if (resourceError) {
          throw resourceError;
        }

        if (!resourceData) {
          throw new Error("هذا المورد غير موجود أو غير منشور.");
        }

        const { data: subjectData, error: subjectError } =
          await supabase
            .from("library_subjects")
            .select(
              `
                id,
                name,
                icon,
                stream,
                is_active
              `
            )
            .eq("id", resourceData.subject_id)
            .eq("stream", profile.stream)
            .eq("is_active", true)
            .maybeSingle();

        if (subjectError) {
          throw subjectError;
        }

        if (!subjectData) {
          throw new Error("لا يمكنك الوصول إلى هذا المورد.");
        }

        if (cancelled) {
          return;
        }

        setResource(resourceData as Resource);
        setSubject(subjectData as Subject);

        /*
         * PDF مخزن في Supabase Storage.
         *
         * نستعمل Signed URL فقط للعرض داخل React PDF Viewer.
         * لا نستعمل download هنا.
         */
        if (resourceData.pdf_url && isStoragePath(resourceData.pdf_url)) {
          setPdfLoading(true);

          const storagePath = cleanStoragePath(resourceData.pdf_url);

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("library-pdfs")
              .createSignedUrl(storagePath, 60 * 60);

          if (signedError) {
            console.error("Signed PDF URL error:", signedError);

            if (!cancelled) {
              setPdfError("تعذر تجهيز ملف PDF حالياً.");
            }
          } else if (!cancelled) {
            setPdfUrl(signedData.signedUrl);
          }

          if (!cancelled) {
            setPdfLoading(false);
          }
        } else if (resourceData.pdf_url) {
          /*
           * دعم روابط PDF الخارجية أيضاً.
           */
          setPdfUrl(resourceData.pdf_url);
        }
      } catch (err) {
        console.error("Library resource error:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "حدث خطأ أثناء تحميل المورد."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResource();

    return () => {
      cancelled = true;
    };
  }, [resourceId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06131f] text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

            <p className="text-sm text-slate-400">
              جاري تحميل المورد...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !resource || !subject) {
    return (
      <main className="min-h-screen bg-[#06131f] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-red-400/20 bg-red-400/5 p-8 text-center">
            <div className="mb-4 text-5xl">⚠️</div>

            <h1 className="mb-3 text-2xl font-bold">
              تعذر تحميل المورد
            </h1>

            <p className="mb-6 text-sm leading-7 text-slate-400">
              {error || "المورد غير متوفر حالياً."}
            </p>

            <Link
              href="/library"
              className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-400"
            >
              العودة إلى المكتبة
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const typeLabel =
    RESOURCE_TYPE_LABELS[resource.resource_type] ||
    resource.resource_type;

  const typeIcon =
    RESOURCE_TYPE_ICONS[resource.resource_type] || "📚";

  const hasPdf = Boolean(resource.pdf_url);

  return (
    <main className="min-h-screen bg-[#06131f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            href="/library"
            className="transition hover:text-cyan-400"
          >
            المكتبة
          </Link>

          <span>←</span>

          <Link
            href={`/library/${subject.id}`}
            className="transition hover:text-cyan-400"
          >
            {subject.icon || "📚"} {subject.name}
          </Link>

          <span>←</span>

          <span className="text-slate-300">
            {resource.title}
          </span>
        </div>

        {/* Header */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                {typeIcon} {typeLabel}
              </span>

              {resource.year && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  BAC {resource.year}
                </span>
              )}

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {subject.icon || "📚"} {subject.name}
              </span>
            </div>

            <h1 className="text-2xl font-black leading-tight sm:text-3xl">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                {resource.description}
              </p>
            )}
          </div>
        </section>

        {/* PDF */}
        {hasPdf && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-cyan-400/20 bg-white/[0.03]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="font-bold">📄 ملف PDF</h2>

                <p className="mt-1 text-xs text-slate-500">
                  يمكنك قراءة الملف مباشرة داخل المنصة أو تحميله.
                </p>
              </div>

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download={getFileName(
                    resource.pdf_url || "document.pdf"
                  )}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-400"
                >
                  ⬇️ تحميل PDF
                </a>
              )}
            </div>

            <div className="bg-black/20 p-2 sm:p-4">
              {pdfLoading ? (
                <div className="flex min-h-[500px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

                    <p className="text-sm text-slate-400">
                      جاري تجهيز ملف PDF...
                    </p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div
                  ref={viewerRef}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-200 p-2 sm:p-4"
                >
                  {pdfError ? (
                    <div className="flex min-h-[300px] items-center justify-center rounded-xl bg-[#06131f]">
                      <div className="px-5 text-center">
                        <div className="mb-3 text-4xl">📄</div>

                        <p className="text-sm text-red-300">
                          {pdfError}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Document
                      file={pdfUrl}
                      loading={
                        <div className="flex min-h-[500px] items-center justify-center bg-[#06131f]">
                          <div className="text-center">
                            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

                            <p className="text-sm text-slate-400">
                              جاري تحميل صفحات PDF...
                            </p>
                          </div>
                        </div>
                      }
                      error={
                        <div className="flex min-h-[300px] items-center justify-center bg-[#06131f]">
                          <div className="px-5 text-center">
                            <div className="mb-3 text-4xl">⚠️</div>

                            <p className="text-sm text-red-300">
                              تعذر عرض ملف PDF داخل المنصة.
                            </p>

                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
                            >
                              فتح الملف مباشرة
                            </a>
                          </div>
                        </div>
                      }
                      onLoadSuccess={({ numPages }) => {
                        setPdfPages(numPages);
                        setPdfError("");
                      }}
                      onLoadError={(pdfLoadError) => {
                        console.error(
                          "PDF viewer error:",
                          pdfLoadError
                        );

                        setPdfError(
                          "تعذر عرض ملف PDF داخل المنصة."
                        );
                      }}
                    >
                      <div className="flex flex-col items-center gap-4">
                        {Array.from(
                          { length: pdfPages },
                          (_, index) => (
                            <div
                              key={`page_${index + 1}`}
                              className="overflow-hidden rounded-lg bg-white shadow-2xl"
                            >
                              {pdfWidth > 0 && (
                                <Page
                                  pageNumber={index + 1}
                                  width={pdfWidth}
                                  renderTextLayer
                                  renderAnnotationLayer
                                  loading={
                                    <div
                                      className="flex items-center justify-center bg-white"
                                      style={{
                                        width: pdfWidth,
                                        minHeight: 300,
                                      }}
                                    >
                                      <div className="text-sm text-slate-500">
                                        جاري تحميل الصفحة...
                                      </div>
                                    </div>
                                  }
                                />
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </Document>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
                  <div className="text-center">
                    <div className="mb-3 text-4xl">📄</div>

                    <p className="text-sm text-slate-400">
                      تعذر تجهيز ملف PDF.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Content */}
        {resource.content && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
                📖
              </div>

              <div>
                <h2 className="font-bold">محتوى المورد</h2>

                <p className="text-xs text-slate-500">
                  الشرح والملاحظات
                </p>
              </div>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-8 text-slate-300 sm:text-base">
              {resource.content}
            </div>
          </section>
        )}

        {/* Navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            href={`/library/${subject.id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            → العودة إلى {subject.name}
          </Link>

          <Link
            href="/library"
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            📚 كل المكتبة
          </Link>
        </div>
      </div>
    </main>
  );
}