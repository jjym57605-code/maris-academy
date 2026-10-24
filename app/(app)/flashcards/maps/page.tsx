
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type CountryFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { name?: string }
> & {
  id?: string | number;
};

type DrawnCountry = {
  key: string;
  name: string;
  alpha3: string;
  d: string;
};

type MapLesson = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
};

type MapLessonCountry = {
  lesson_id: string;
  country_code: string;
};

const BASE_W = 1200;
const BASE_H = 640;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export default function MapsPage() {
  const [countries, setCountries] = useState<DrawnCountry[]>([]);
  const [bordersPath, setBordersPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lessons, setLessons] = useState<MapLesson[]>([]);
  const [lessonCountries, setLessonCountries] = useState<MapLessonCountry[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pointerDown, setPointerDown] = useState(false);
  const [search, setSearch] = useState("");
  const [showLessonList, setShowLessonList] = useState(true);

  const drag = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
    pointerId: number;
  } | null>(null);

  const moved = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLessons() {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error("Supabase is not configured");

        const { data: lessonData, error: lessonQueryError } = await supabase
          .from("map_lessons")
          .select("id, title, description, sort_order")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (lessonQueryError) throw lessonQueryError;

        const publishedLessons = (lessonData ?? []) as MapLesson[];

        if (publishedLessons.length === 0) {
          if (!cancelled) {
            setLessons([]);
            setLessonCountries([]);
            setLessonsLoading(false);
          }
          return;
        }

        const { data: countryData, error: countryQueryError } = await supabase
          .from("map_lesson_countries")
          .select("lesson_id, country_code")
          .in("lesson_id", publishedLessons.map((lesson) => lesson.id));

        if (countryQueryError) throw countryQueryError;

        if (!cancelled) {
          setLessons(publishedLessons);
          setLessonCountries((countryData ?? []) as MapLessonCountry[]);
          setLessonsError("");
          setLessonsLoading(false);
        }
      } catch (cause) {
        console.error("Map lessons loading error:", cause);
        if (!cancelled) {
          setLessonsError("ما قدرناش نحمّلو الدروس. عاود حدّث الصفحة.");
          setLessonsLoading(false);
        }
      }
    }

    void loadLessons();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      try {
        const [geo, topo, worldModule, countriesModule, arabicModule] =
          await Promise.all([
            import("d3-geo"),
            import("topojson-client"),
            import("world-atlas/countries-110m.json"),
            import("i18n-iso-countries"),
            import("i18n-iso-countries/langs/ar.json"),
          ]);

        if (cancelled) return;

        const countriesLib = countriesModule.default;
        countriesLib.registerLocale(arabicModule.default);

        const importedWorld = worldModule as unknown as {
          default?: {
            type?: string;
            objects: Record<string, unknown>;
            arcs?: unknown;
            transform?: unknown;
            bbox?: unknown;
          };
          type?: string;
          objects?: Record<string, unknown>;
          arcs?: unknown;
          transform?: unknown;
          bbox?: unknown;
        };

        const topology = importedWorld.default ?? importedWorld;
        const object = topology.objects?.countries;
        if (!object) throw new Error("World topology has no countries");

        const collection = topo.feature(
          topology as never,
          object as never
        ) as unknown as { features: CountryFeature[] };

        if (!Array.isArray(collection.features) || !collection.features.length) {
          throw new Error("No country features were returned");
        }

        const visibleFeatures = collection.features.filter(
          (feature) => String(feature.id ?? "").padStart(3, "0") !== "010"
        );

        const projection = geo.geoNaturalEarth1().fitExtent(
          [[12, 12], [BASE_W - 12, BASE_H - 12]],
          {
            type: "FeatureCollection",
            features: visibleFeatures,
          } as never
        );

        const path = geo.geoPath(projection);

        const drawnCountries: DrawnCountry[] = visibleFeatures
          .map((feature, index) => {
            const numericCode = String(feature.id ?? "").padStart(3, "0");
            const alpha2 = countriesLib.numericToAlpha2(numericCode);
            const alpha3 = alpha2
              ? countriesLib.alpha2ToAlpha3(alpha2)
              : undefined;
            const arabicName = alpha2
              ? countriesLib.getName(alpha2, "ar")
              : undefined;

            return {
              key: `${numericCode}-${index}`,
              name: arabicName || feature.properties?.name || "اسم الدولة غير متوفر",
              alpha3: alpha3 || "",
              d: path(feature as never) || "",
            };
          })
          .filter((country) => country.d.length > 0);

        const mesh = topo.mesh(
          topology as never,
          object as never,
          (a: unknown, b: unknown) => a !== b
        ) as never;

        const borders = path(mesh) || "";

        if (!drawnCountries.length || !borders) {
          throw new Error("Country paths or borders could not be generated");
        }

        if (!cancelled) {
          setCountries(drawnCountries);
          setBordersPath(borders);
          setLoading(false);
        }
      } catch (cause) {
        console.error("World map initialization error:", cause);
        if (!cancelled) {
          setError("ما قدرناش نحمّلو الخريطة. تأكد من تثبيت المكتبات المطلوبة.");
          setLoading(false);
        }
      }
    }

    void loadWorld();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const highlightedCodes = useMemo(
    () =>
      new Set(
        lessonCountries
          .filter((item) => item.lesson_id === selectedLessonId)
          .map((item) => item.country_code.toUpperCase())
      ),
    [lessonCountries, selectedLessonId]
  );

  const selectedCountry = countries.find((country) => country.key === selected);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    if (!query) return lessons;
    return lessons.filter((lesson) =>
      `${lesson.title} ${lesson.description || ""}`
        .toLocaleLowerCase("ar")
        .includes(query)
    );
  }, [lessons, search]);

  const highlightedCount = useMemo(
    () =>
      countries.filter((country) =>
        highlightedCodes.has(country.alpha3.toUpperCase())
      ).length,
    [countries, highlightedCodes]
  );

  function selectLesson(lesson: MapLesson) {
    if (selectedLessonId === lesson.id) {
      setSelectedLessonId(null);
      setSelected(null);
      return;
    }

    setSelectedLessonId(lesson.id);
    setSelected(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function changeZoom(nextZoom: number) {
    const bounded = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    setZoom(bounded);
    if (bounded === 1) setOffset({ x: 0, y: 0 });
  }

  function resetMap() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelected(null);
    setSelectedLessonId(null);
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
  }

  function startDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;

    drag.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
      pointerId: event.pointerId,
    };

    moved.current = false;
    setPointerDown(true);
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = ((event.clientX - drag.current.x) / rect.width) * BASE_W;
    const dy = ((event.clientY - drag.current.y) / rect.height) * BASE_H;

    if (Math.abs(dx) + Math.abs(dy) > 5) moved.current = true;

    if (moved.current) {
      setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
    }
  }

  function endDrag(event?: React.PointerEvent<SVGSVGElement>) {
    if (
      event &&
      drag.current &&
      drag.current.pointerId !== event.pointerId
    ) return;

    drag.current = null;
    setPointerDown(false);
  }

  function selectCountry(
    countryKey: string,
    event: React.MouseEvent<SVGPathElement>
  ) {
    event.stopPropagation();
    if (moved.current) return;
    setSelected(countryKey);
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      {/* رأس الصفحة */}
      <section className="relative isolate overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#071321] shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.15),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.14),transparent_45%)]" />
        <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-3xl shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              🌍
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-extrabold tracking-wide text-cyan-200">
                  MARIS • INTERACTIVE MAPS
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-300">
                  BAC 2027
                </span>
              </div>
              <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                الخرائط التفاعلية
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                اكتشف المواقع الجغرافية، استكشف الدول، وراجع دروسك بطريقة بصرية وتفاعلية.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
            <div className="rounded-2xl border border-white/10 bg-[#0c2035]/80 p-3 text-center">
              <p className="text-xl font-black text-cyan-200 sm:text-2xl">
                {countries.length || "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">دولة على الخريطة</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0c2035]/80 p-3 text-center">
              <p className="text-xl font-black text-cyan-200 sm:text-2xl">
                {lessons.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">درس منشور</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0c2035]/80 p-3 text-center">
              <p className="text-xl font-black text-cyan-200 sm:text-2xl">
                {selectedLesson ? highlightedCount : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">دولة مرتبطة</p>
            </div>
          </div>
        </div>
      </section>

      {/* اختيار الدروس */}
      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#091727]">
        <button
          type="button"
          onClick={() => setShowLessonList((value) => !value)}
          aria-expanded={showLessonList}
          className="flex w-full items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 text-right transition hover:bg-white/[0.025] sm:px-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-xl">📚</span>
            <div>
              <h2 className="font-extrabold text-white sm:text-lg">استكشف الدروس</h2>
              <p className="mt-1 text-xs text-slate-400">اختار درس باش تبرز الدول المرتبطة به</p>
            </div>
          </div>
          <span className="flex items-center gap-2 text-xs font-bold text-cyan-200">
            {lessons.length} درس
            <span className="text-lg">{showLessonList ? "−" : "+"}</span>
          </span>
        </button>

        {showLessonList && (
          <div className="p-4 sm:p-6">
            {!lessonsLoading && lessons.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-300">الدروس المنشورة من الإدارة</p>
                <div className="relative w-full sm:max-w-xs">
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="قلّب على درس..."
                    aria-label="البحث عن درس"
                    className="w-full rounded-xl border border-white/10 bg-[#06111f] py-2.5 pr-9 pl-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  />
                </div>
              </div>
            )}

            {lessonsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-10 text-sm text-cyan-100">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
                جارٍ تحميل الدروس...
              </div>
            ) : lessonsError ? (
              <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-7 text-amber-100">
                {lessonsError}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mr-2 font-bold text-cyan-200 underline underline-offset-4"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cyan-300/20 bg-white/[0.02] px-4 py-9 text-center">
                <div className="mb-3 text-4xl">🗺️</div>
                <p className="font-extrabold text-slate-200">ما كاين حتى درس منشور حاليًا</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">تقدر تستكشف الخريطة مباشرة، والدروس المنشورة راح تظهر هنا.</p>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
                ما لقيناش درس بهذا الاسم. جرّب كلمة أخرى.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredLessons.map((lesson, index) => {
                  const active = selectedLessonId === lesson.id;
                  const linkedCount = new Set(
                    lessonCountries
                      .filter((item) => item.lesson_id === lesson.id)
                      .map((item) => item.country_code.toUpperCase())
                  ).size;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectLesson(lesson)}
                      className={`group relative flex min-h-[150px] flex-col overflow-hidden rounded-2xl border p-4 text-right transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 ${
                        active
                          ? "border-cyan-300/60 bg-gradient-to-br from-cyan-300/[0.13] to-blue-500/[0.06] shadow-[0_0_28px_rgba(34,211,238,0.07)]"
                          : "border-white/[0.09] bg-[#0b1b2d] hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[#0e2238]"
                      }`}
                    >
                      <div className="mb-3 flex w-full items-center justify-between gap-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${active ? "bg-cyan-300 text-[#071321]" : "bg-white/[0.06] text-cyan-200"}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${active ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[0.05] text-slate-400"}`}>
                          {active ? "✓ محدد" : "استكشف الدرس"}
                        </span>
                      </div>

                      <span className="text-base font-extrabold leading-7 text-white">{lesson.title}</span>
                      {lesson.description?.trim() && (
                        <span className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{lesson.description}</span>
                      )}

                      <div className="mt-auto flex w-full items-center justify-between gap-2 pt-4">
                        <span className="text-xs text-slate-400">
                          <span className="font-extrabold text-cyan-200">{linkedCount}</span>{" "}
                          {linkedCount === 1 ? "دولة مرتبطة" : "دول مرتبطة"}
                        </span>
                        <span className="text-xs font-extrabold text-cyan-200 transition group-hover:translate-x-[-2px]">
                          {active ? "إلغاء التحديد ↑" : "عرض على الخريطة ←"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedLesson && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl">✨</span>
                  <div>
                    <p className="text-xs font-bold text-cyan-300">الدرس النشط</p>
                    <p className="mt-1 font-extrabold text-white">{selectedLesson.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">الدول المضيئة في الخريطة هي الدول المرتبطة بهذا الدرس.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLessonId(null);
                    setSelected(null);
                  }}
                  className="rounded-xl border border-cyan-300/20 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10"
                >
                  إلغاء اختيار الدرس
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* الخريطة */}
      <section className="overflow-hidden rounded-[24px] border border-cyan-300/15 bg-[#071321] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-gradient-to-l from-[#102b45] via-[#0b1d31] to-[#091727] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-xl">🗺️</div>
            <div>
              <h2 className="font-extrabold text-white sm:text-lg">خريطة العالم</h2>
              <p className="mt-1 text-xs text-slate-400">اضغط على دولة لمعرفة اسمها • كبّر واسحب لاستكشاف الخريطة</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#315982]" />
              دول أخرى
            </span>
            {selectedLesson && (
              <span className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16b9d4]" />
                دول الدرس
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[15%] top-[15%] h-48 w-48 rounded-full bg-cyan-400/[0.035] blur-3xl" />
            <div className="absolute bottom-[10%] right-[20%] h-56 w-56 rounded-full bg-blue-500/[0.04] blur-3xl" />
          </div>

          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#071321]/95 text-sm text-cyan-100">
              <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-cyan-300/20 border-t-cyan-300" />
              <span className="font-semibold">جارٍ تجهيز خريطة العالم...</span>
              <span className="text-xs text-slate-500">لحظات ونكونو واجدين</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#071321]/95 p-6 text-center">
              <span className="text-4xl">🌐</span>
              <p className="max-w-md text-sm leading-7 text-amber-100">{error}</p>
              <p dir="ltr" className="max-w-full overflow-x-auto rounded-xl border border-white/10 bg-[#0b1b30] px-4 py-3 font-mono text-xs text-cyan-100">
                npm install d3-geo topojson-client world-atlas i18n-iso-countries
              </p>
              <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-extrabold text-[#071321] transition hover:bg-cyan-200">
                إعادة تحميل الخريطة
              </button>
            </div>
          )}

          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 sm:left-5 sm:top-5">
            <button
              type="button"
              onClick={() => changeZoom(zoom + 0.5)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="تكبير الخريطة"
              title="تكبير"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-[#0b1b30]/95 text-2xl font-bold text-cyan-100 shadow-lg backdrop-blur transition hover:border-cyan-200/50 hover:bg-[#16304d] disabled:cursor-not-allowed disabled:opacity-40"
            >+</button>
            <button
              type="button"
              onClick={() => changeZoom(zoom - 0.5)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="تصغير الخريطة"
              title="تصغير"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-[#0b1b30]/95 text-2xl font-bold text-cyan-100 shadow-lg backdrop-blur transition hover:border-cyan-200/50 hover:bg-[#16304d] disabled:cursor-not-allowed disabled:opacity-40"
            >−</button>
            <button
              type="button"
              onClick={resetMap}
              aria-label="إرجاع الخريطة للوضع الأصلي"
              title="إرجاع العرض الكامل"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-[#0b1b30]/95 text-xl font-bold text-cyan-100 shadow-lg backdrop-blur transition hover:border-cyan-200/50 hover:bg-[#16304d]"
            >↺</button>
            <span className="rounded-lg border border-white/10 bg-[#0b1b30]/90 px-2 py-1 text-center text-[10px] font-bold text-slate-300">{Math.round(zoom * 100)}%</span>
          </div>

          <svg
            viewBox={`0 0 ${BASE_W} ${BASE_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="خريطة العالم التفاعلية"
            className="relative block h-[52vh] min-h-[320px] w-full touch-none sm:h-[62vh] sm:min-h-[420px] lg:h-[70vh] lg:min-h-[500px]"
            style={{
              background: "transparent",
              cursor: pointerDown ? "grabbing" : zoom > 1 ? "grab" : "default",
            }}
            onWheel={handleWheel}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelected(null);
            }}
          >
            <g transform={`translate(${offset.x} ${offset.y}) translate(${BASE_W / 2} ${BASE_H / 2}) scale(${zoom}) translate(${-BASE_W / 2} ${-BASE_H / 2})`}>
              {countries.map((country) => {
                const isSelected = selected === country.key;
                const isHighlighted =
                  Boolean(selectedLessonId) &&
                  highlightedCodes.has(country.alpha3.toUpperCase());

                return (
                  <path
                    key={country.key}
                    d={country.d}
                    fill={
                      isSelected
                        ? "#4b83b5"
                        : isHighlighted
                          ? "#16b9d4"
                          : "#203f66"
                    }
                    stroke={isSelected ? "#e0fbff" : isHighlighted ? "#67e8f9" : "#0b2036"}
                    strokeWidth={isSelected ? 1.8 : isHighlighted ? 1.25 : 0.45}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    className="cursor-pointer transition-colors duration-150 hover:fill-[#3d719e] focus:outline-none"
                    onClick={(event) => selectCountry(country.key, event)}
                    style={{ pointerEvents: "visiblePainted" }}
                  >
                    <title>{country.name}{isHighlighted ? " — مرتبطة بالدرس المحدد" : ""}</title>
                  </path>
                );
              })}

              <path
                d={bordersPath}
                fill="none"
                stroke="#071321"
                strokeWidth={0.9}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            </g>
          </svg>

          {!loading && !error && (
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-white/10 bg-[#071321]/85 px-3 py-2 text-[10px] text-slate-400 backdrop-blur sm:bottom-5 sm:right-5 sm:text-xs">
              <span className="text-cyan-200">●</span> اسحب الخريطة للتنقل
              <span className="mx-2 text-slate-600">•</span>
              <span className="text-cyan-200">⌕</span> استعمل أزرار التكبير
            </div>
          )}
        </div>

        {/* بطاقة الدولة المحددة */}
        <div className="border-t border-white/[0.07] bg-[#091727] p-4 sm:p-5">
          {selectedCountry ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-2xl">📍</div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">الدولة المحددة</p>
                  <h3 className="mt-1 text-xl font-black text-white">{selectedCountry.name}</h3>
                  {selectedLesson && (
                    <p className="mt-1 text-xs text-cyan-200">ضمن درس: {selectedLesson.title}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-cyan-300/30 hover:bg-white/[0.04] hover:text-white"
              >
                إلغاء تحديد الدولة
              </button>
            </div>
          ) : selectedLesson ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xl">✨</div>
              <div>
                <p className="text-sm font-extrabold text-white">{selectedLesson.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {highlightedCount > 0
                    ? `الدول المضيئة مرتبطة بهذا الدرس. عدد الدول الظاهرة المطابقة: ${highlightedCount}.`
                    : "ما بان حتى تطابق في الخريطة مع رموز الدول المرتبطة بهذا الدرس."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl">👆</div>
              <div>
                <p className="font-bold text-slate-200">اختار دولة من الخريطة</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">اسم الدولة يظهر هنا، وتقدر تختار درس باش تميّز الدول المرتبطة به.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="flex flex-col items-center justify-center gap-2 py-2 text-center">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-200/70">
          <span>🌊</span>
          <span>MARIS ACADEMY ²⁰²⁷</span>
          <span>•</span>
          <span>تعلّم بطريقة مختلفة</span>
        </div>
        <p className="text-[11px] text-slate-500">استكشف، اربط المعلومات بالمواقع، وثبّت دروسك بصريًا.</p>
      </footer>
    </main>
  );
}
