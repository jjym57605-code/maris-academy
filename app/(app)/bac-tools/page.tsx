
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Subject = {
  name: string;
  coefficient: number;
};

type Stream = {
  name: string;
  subjects: Subject[];
};

const BAC_START = new Date("2027-06-13T08:00:00+01:00").getTime();

const STREAMS: Stream[] = [
  {
    name: "علوم تجريبية",
    subjects: [
      { name: "علوم الطبيعة والحياة", coefficient: 6 },
      { name: "الرياضيات", coefficient: 5 },
      { name: "العلوم الفيزيائية", coefficient: 5 },
      { name: "اللغة العربية", coefficient: 3 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "التاريخ والجغرافيا", coefficient: 2 },
      { name: "اللغة الفرنسية", coefficient: 2 },
      { name: "اللغة الإنجليزية", coefficient: 2 },
      { name: "الفلسفة", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
  {
    name: "رياضيات",
    subjects: [
      { name: "الرياضيات", coefficient: 7 },
      { name: "العلوم الفيزيائية", coefficient: 6 },
      { name: "علوم الطبيعة والحياة", coefficient: 2 },
      { name: "اللغة العربية", coefficient: 3 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "التاريخ والجغرافيا", coefficient: 2 },
      { name: "اللغة الفرنسية", coefficient: 2 },
      { name: "اللغة الإنجليزية", coefficient: 2 },
      { name: "الفلسفة", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
  {
    name: "تقني رياضي",
    subjects: [
      { name: "التكنولوجيا", coefficient: 7 },
      { name: "الرياضيات", coefficient: 6 },
      { name: "العلوم الفيزيائية", coefficient: 6 },
      { name: "اللغة العربية", coefficient: 2 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "التاريخ والجغرافيا", coefficient: 2 },
      { name: "اللغة الفرنسية", coefficient: 2 },
      { name: "اللغة الإنجليزية", coefficient: 2 },
      { name: "الفلسفة", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
  {
    name: "تسيير واقتصاد",
    subjects: [
      { name: "التسيير المحاسبي والمالي", coefficient: 6 },
      { name: "الاقتصاد والمناجمنت", coefficient: 5 },
      { name: "الرياضيات", coefficient: 5 },
      { name: "التاريخ والجغرافيا", coefficient: 4 },
      { name: "اللغة العربية", coefficient: 3 },
      { name: "القانون", coefficient: 2 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "اللغة الفرنسية", coefficient: 2 },
      { name: "اللغة الإنجليزية", coefficient: 2 },
      { name: "الفلسفة", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
  {
    name: "آداب وفلسفة",
    subjects: [
      { name: "اللغة العربية", coefficient: 6 },
      { name: "الفلسفة", coefficient: 6 },
      { name: "التاريخ والجغرافيا", coefficient: 4 },
      { name: "اللغة الفرنسية", coefficient: 3 },
      { name: "اللغة الإنجليزية", coefficient: 3 },
      { name: "الرياضيات", coefficient: 2 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
  {
    name: "لغات أجنبية",
    subjects: [
      { name: "اللغة العربية", coefficient: 5 },
      { name: "اللغة الفرنسية", coefficient: 5 },
      { name: "اللغة الإنجليزية", coefficient: 5 },
      { name: "اللغة الأجنبية الثالثة", coefficient: 4 },
      { name: "التاريخ والجغرافيا", coefficient: 3 },
      { name: "الفلسفة", coefficient: 2 },
      { name: "الرياضيات", coefficient: 2 },
      { name: "العلوم الإسلامية", coefficient: 2 },
      { name: "التربية البدنية", coefficient: 1 },
    ],
  },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#071321] px-3 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/10";

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-cyan-300/10 bg-[#0a1727]/90 p-5 shadow-xl shadow-black/10 transition duration-300 hover:border-cyan-300/20 sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-2xl shadow-lg shadow-cyan-500/5">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-white sm:text-xl">{title}</h2>
        <p className="mt-1 text-xs leading-6 text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = now === null ? null : BAC_START - now;

  const units = useMemo(() => {
    if (remaining === null || remaining <= 0) return null;

    return [
      { value: Math.floor(remaining / 86400000), label: "يوم", icon: "📅" },
      {
        value: Math.floor((remaining % 86400000) / 3600000),
        label: "ساعة",
        icon: "⏰",
      },
      {
        value: Math.floor((remaining % 3600000) / 60000),
        label: "دقيقة",
        icon: "⌛",
      },
      {
        value: Math.floor((remaining % 60000) / 1000),
        label: "ثانية",
        icon: "✨",
      },
    ];
  }, [remaining]);

  return (
    <div>
      {remaining !== null && remaining <= 0 ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-7 text-center">
          <div className="text-4xl">🎓</div>
          <p className="mt-3 text-xl font-black text-emerald-200">
            بالتوفيق في امتحان البكالوريا!
          </p>
        </div>
      ) : units ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="group rounded-2xl border border-cyan-300/10 bg-[#071321] p-4 text-center transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/[0.04] sm:p-5"
            >
              <div className="mb-2 text-lg opacity-70 transition group-hover:scale-110 group-hover:opacity-100">
                {unit.icon}
              </div>
              <p className="text-3xl font-black tabular-nums text-cyan-300 sm:text-4xl">
                {String(unit.value).padStart(2, "0")}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-pulse rounded-2xl bg-slate-800/60 p-8" />
      )}

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-300/10 bg-gradient-to-l from-cyan-300/[0.07] to-transparent p-4">
        <span className="text-2xl">🌊</span>
        <div>
          <p className="text-sm font-black text-cyan-200">
            الأحد 13 جوان 2027
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            العدّ التنازلي ثابت، وموعده لا يمكن تغييره من الصفحة.
          </p>
        </div>
        <span className="mr-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan-300" />
      </div>
    </div>
  );
}

export default function BacToolsPage() {
  const [streamIndex, setStreamIndex] = useState(0);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [coefficients, setCoefficients] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        STREAMS[0].subjects.map((subject) => [
          subject.name,
          String(subject.coefficient),
        ])
      )
  );

  const stream = STREAMS[streamIndex];

  const enteredCount = stream.subjects.filter(
    (subject) =>
      grades[subject.name] !== undefined && grades[subject.name] !== ""
  ).length;

  const validSubjects = stream.subjects.filter((subject) => {
    const grade = grades[subject.name];
    const coefficient = coefficients[subject.name];

    return (
      grade !== undefined &&
      grade.trim() !== "" &&
      Number.isFinite(Number(grade)) &&
      Number(grade) >= 0 &&
      Number(grade) <= 20 &&
      coefficient !== undefined &&
      coefficient.trim() !== "" &&
      Number.isFinite(Number(coefficient)) &&
      Number(coefficient) > 0 &&
      Number(coefficient) <= 100
    );
  });

  const result = useMemo(() => {
    let weightedSum = 0;
    let totalCoefficients = 0;

    for (const subject of stream.subjects) {
      const rawGrade = grades[subject.name];
      const rawCoefficient = coefficients[subject.name];

      if (
        rawGrade === undefined ||
        rawGrade.trim() === "" ||
        rawCoefficient === undefined ||
        rawCoefficient.trim() === ""
      ) {
        continue;
      }

      const grade = Number(rawGrade);
      const coefficient = Number(rawCoefficient);

      if (
        !Number.isFinite(grade) ||
        grade < 0 ||
        grade > 20 ||
        !Number.isFinite(coefficient) ||
        coefficient <= 0 ||
        coefficient > 100
      ) {
        continue;
      }

      weightedSum += grade * coefficient;
      totalCoefficients += coefficient;
    }

    return {
      average:
        totalCoefficients > 0 ? weightedSum / totalCoefficients : null,
      totalCoefficients,
    };
  }, [stream, grades, coefficients]);

  function changeStream(value: string) {
    const nextIndex = Number(value);
    const nextStream = STREAMS[nextIndex];

    setStreamIndex(nextIndex);
    setGrades({});
    setCoefficients(
      Object.fromEntries(
        nextStream.subjects.map((subject) => [
          subject.name,
          String(subject.coefficient),
        ])
      )
    );
  }

  function updateGrade(subject: string, value: string) {
    if (value !== "" && !/^\d{0,2}([.,]\d{0,2})?$/.test(value)) return;

    const normalized = value.replace(",", ".");
    const number = Number(normalized);

    if (value !== "" && (!Number.isFinite(number) || number > 20)) return;

    setGrades((current) => ({ ...current, [subject]: normalized }));
  }

  function updateCoefficient(subject: string, value: string) {
    if (value !== "" && !/^\d{0,3}([.,]\d{0,2})?$/.test(value)) return;

    const normalized = value.replace(",", ".");
    const number = Number(normalized);

    if (
      value !== "" &&
      (!Number.isFinite(number) || number <= 0 || number > 100)
    ) {
      return;
    }

    setCoefficients((current) => ({ ...current, [subject]: normalized }));
  }

  function resetCalculator() {
    setGrades({});
    setCoefficients(
      Object.fromEntries(
        stream.subjects.map((subject) => [
          subject.name,
          String(subject.coefficient),
        ])
      )
    );
  }

  const progress = (enteredCount / stream.subjects.length) * 100;

  const resultMessage =
    result.average === null
      ? "أدخل أول علامة باش تبدأ تحسب معدلك"
      : result.average >= 16
        ? "ممتاز! واصل بنفس العزيمة 💎"
        : result.average >= 14
          ? "مستوى مليح، تقدر تزيد للأفضل 🚀"
          : result.average >= 10
            ? "بداية مليحة، بالمراجعة تقدر تحسّن نتيجتك 📚"
            : "كل خطوة في المراجعة تقرّبك لهدفك 🌱";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-x-clip bg-[#06101d] px-3 py-5 text-white sm:px-6 sm:py-8 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-32 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-3xl" />
        <div className="absolute -left-40 top-[35%] h-96 w-96 rounded-full bg-blue-500/[0.07] blur-3xl" />
        <div className="absolute right-1/3 top-[70%] h-72 w-72 rounded-full bg-teal-400/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-bl from-[#10283a] via-[#091a2b] to-[#071321] p-6 shadow-2xl shadow-black/20 sm:p-9 lg:p-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 -top-16 h-64 w-64 rounded-full border border-cyan-300/[0.07]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-2 -top-6 h-44 w-44 rounded-full border border-cyan-300/[0.07]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-40 w-2/3 bg-gradient-to-r from-cyan-400/[0.05] to-transparent blur-2xl"
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                <span>→</span>
                لوحة التحكم
              </Link>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-bold text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                فضاء المراجعة
              </span>
            </div>

            <div className="mt-9 flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-xs font-black text-cyan-200">
                  <span>🌊</span>
                  MARIS ACADEMY ²⁰²⁷
                </div>

                <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  طريقك نحو{" "}
                  <span className="bg-gradient-to-l from-cyan-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    البكالوريا
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
                  نظّم حساباتك، تابع الوقت المتبقي، وخلي هدفك قدام عينيك.
                  كل خطوة صغيرة اليوم تقدر تصنع فرقًا غدوة.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="#calculator"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-cyan-400 px-5 py-3 text-sm font-black text-[#061321] shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:shadow-cyan-400/20"
                  >
                    🧮 احسب معدلك
                    <span>←</span>
                  </a>
                  <a
                    href="#countdown"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
                  >
                    ⏳ الوقت المتبقي
                  </a>
                </div>
              </div>

              <div className="mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/[0.04] shadow-[0_0_70px_rgba(34,211,238,0.08)] sm:mx-0 sm:h-44 sm:w-44">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.12] to-blue-400/[0.03] text-6xl transition duration-500 hover:scale-105 sm:h-36 sm:w-36 sm:text-7xl">
                  🐋
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-5 sm:gap-4">
              <div className="rounded-xl bg-white/[0.025] p-3">
                <p className="text-lg font-black text-cyan-200 sm:text-2xl">
                  {stream.subjects.length}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                  مادة في شعبتك
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.025] p-3">
                <p className="text-lg font-black text-cyan-200 sm:text-2xl">
                  {enteredCount}/{stream.subjects.length}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                  علامات مدخلة
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.025] p-3">
                <p className="text-lg font-black text-cyan-200 sm:text-2xl">
                  {result.average === null ? "—" : result.average.toFixed(2)}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                  المعدل الحالي
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <a
            href="#calculator"
            className="group rounded-3xl border border-cyan-300/10 bg-[#0a1727]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-[#0d2032]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/[0.08] text-2xl transition group-hover:scale-110">
                🧮
              </div>
              <span className="text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-200">
                ←
              </span>
            </div>
            <h2 className="mt-4 font-black text-white transition group-hover:text-cyan-200">
              حاسبة معدل البكالوريا
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">
              أدخل العلامات والمعاملات الخاصة بك، وشوف النتيجة تتبدل مباشرة.
            </p>
          </a>

          <a
            href="#countdown"
            className="group rounded-3xl border border-cyan-300/10 bg-[#0a1727]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-[#0d2032]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-300/[0.08] text-2xl transition group-hover:scale-110">
                ⏳
              </div>
              <span className="text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-200">
                ←
              </span>
            </div>
            <h2 className="mt-4 font-black text-white transition group-hover:text-cyan-200">
              العدّ التنازلي للباك
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">
              تابع الأيام والساعات والدقائق والثواني المتبقية.
            </p>
          </a>
        </section>

        <div id="countdown" className="scroll-mt-6">
          <Panel>
            <SectionTitle
              icon="⏳"
              title="العدّ التنازلي للبكالوريا"
              description="كل ثانية تقرّبك من الموعد، استغل وقتك مليح."
            />
            <Countdown />
          </Panel>
        </div>

        <div id="calculator" className="scroll-mt-6">
          <Panel>
            <SectionTitle
              icon="🧮"
              title="حاسبة معدل البكالوريا"
              description="خصّص معاملاتك، أدخل علاماتك، وتابع معدلك لحظة بلحظة."
            />

            <div className="rounded-2xl border border-cyan-300/10 bg-gradient-to-l from-cyan-300/[0.06] to-transparent p-4">
              <label
                htmlFor="stream"
                className="mb-3 block text-sm font-black text-slate-200"
              >
                🎓 اختار الشعبة نتاعك
              </label>
              <select
                id="stream"
                value={streamIndex}
                onChange={(event) => changeStream(event.target.value)}
                className={inputClass}
              >
                {STREAMS.map((item, index) => (
                  <option key={item.name} value={index}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                المعاملات المعروضة افتراضية، تقدر تعدّل كل معامل حسب المعامل
                المعتمد عندك.
              </p>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-200">
                  تقدّم إدخال العلامات
                </p>
                <p className="text-xs font-bold tabular-nums text-cyan-200">
                  {enteredCount} من {stream.subjects.length}
                </p>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={stream.subjects.length}
                aria-valuenow={enteredCount}
                aria-label="تقدم إدخال العلامات"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-blue-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {stream.subjects.map((subject, index) => (
                <div
                  key={subject.name}
                  className="group rounded-2xl border border-white/[0.07] bg-[#071321] p-4 transition duration-300 hover:border-cyan-300/25 hover:bg-[#0a1a2a]"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.06] text-xs font-black text-cyan-200 transition group-hover:border-cyan-300/30">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <label
                      htmlFor={`grade-${index}`}
                      className="text-sm font-bold leading-6 text-slate-200"
                    >
                      {subject.name}
                    </label>
                    {grades[subject.name] !== undefined &&
                      grades[subject.name] !== "" && (
                        <span className="mr-auto text-xs text-emerald-300">
                          ✓
                        </span>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`grade-${index}`}
                        className="mb-2 block text-xs font-bold text-slate-400"
                      >
                        العلامة / 20
                      </label>
                      <input
                        id={`grade-${index}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="مثال: 14.50"
                        value={grades[subject.name] ?? ""}
                        onChange={(event) =>
                          updateGrade(subject.name, event.target.value)
                        }
                        className={inputClass}
                        aria-label={`علامة ${subject.name}`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`coefficient-${index}`}
                        className="mb-2 block text-xs font-bold text-cyan-200"
                      >
                        المعامل
                      </label>
                      <input
                        id={`coefficient-${index}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="المعامل"
                        value={coefficients[subject.name] ?? ""}
                        onChange={(event) =>
                          updateCoefficient(subject.name, event.target.value)
                        }
                        className={inputClass}
                        aria-label={`معامل ${subject.name}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#102c40] via-[#0b1c2d] to-[#071321] p-5 shadow-lg shadow-cyan-950/10 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black text-cyan-200">
                    ✨ نتيجتك الحالية
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-300">
                    المعدل حسب العلامات والمعاملات الصحيحة المدخلة
                  </p>
                </div>
                <div className="text-3xl">🏆</div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <span className="text-6xl font-black tabular-nums tracking-tight text-cyan-300 sm:text-7xl">
                  {result.average === null
                    ? "—"
                    : result.average.toFixed(2)}
                </span>
                <span className="mb-2 text-sm font-bold text-slate-400">
                  / 20
                </span>
              </div>

              <p className="mt-3 text-sm font-bold text-cyan-100">
                {resultMessage}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                  <p className="text-xs text-slate-400">مواد بعلامات مدخلة</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {enteredCount}/{stream.subjects.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                  <p className="text-xs text-slate-400">مواد محسوبة فعليًا</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {validSubjects.length}/{stream.subjects.length}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-6 text-slate-400">
                يُحسب المعدل باستعمال المواد التي أدخلت علاماتها ومعاملاتها
                الصحيحة فقط. لإتمام الحساب، أدخل جميع العلامات والمعاملات.
              </p>

              {validSubjects.length === stream.subjects.length && (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm font-bold leading-7 text-emerald-200">
                  🎉 أدخلت العلامات والمعاملات لجميع المواد. بالتوفيق في
                  البكالوريا!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={resetCalculator}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-rose-300/30 hover:bg-rose-300/[0.05] hover:text-white"
            >
              ↻ إعادة ضبط العلامات والمعاملات
            </button>

            <p className="mt-4 text-[11px] leading-6 text-amber-200/80">
              تنبيه: الحاسبة تقديرية، والمعاملات الافتراضية قابلة للتعديل.
              راجع المعاملات الرسمية الخاصة بشعبتك ودورة 2027 قبل الاعتماد
              على النتيجة النهائية.
            </p>
          </Panel>
        </div>

        <footer className="rounded-3xl border border-white/[0.06] bg-[#081523]/70 px-5 py-7 text-center">
          <div className="text-3xl">🐋</div>
          <p className="mt-3 text-sm font-black text-cyan-200">
            MARIS ACADEMY ²⁰²⁷
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            خطوة بخطوة نحو النجاح. نظّم وقتك، وواصل مراجعتك.
          </p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-l from-cyan-300 to-blue-500" />
        </footer>
      </div>
    </main>
  );
}
