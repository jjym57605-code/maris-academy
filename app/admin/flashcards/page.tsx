
"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { BAC_STREAMS } from "@/types/database";

type Subject = "history" | "geography";
type CardType = "term" | "personality" | "date";
type PersonalityGroup =
  | "historical"
  | "national"
  | "french"
  | "western"
  | "eastern"
  | "third_world";

type StreamGroup = "science" | "economics_literature" | "languages";

type Flashcard = {
  id: string;
  subject: Subject;
  card_type: CardType;
  title: string;
  front_content: string;
  back_content: string;
  image_url: string | null;
  sort_order: number;
  unit_name: string | null;
  personality_group: string | null;
  unit_number: number | null;
  stream: string | null;
  is_active: boolean;
  created_at: string;
};

type CardForm = {
  subject: Subject;
  card_type: CardType;
  title: string;
  front_content: string;
  back_content: string;
  image_url: string;
  sort_order: string;
  unit_name: string;
  personality_group: PersonalityGroup | "";
  stream: string;
  is_active: boolean;
};

const emptyForm: CardForm = {
  subject: "history",
  card_type: "term",
  title: "",
  front_content: "",
  back_content: "",
  image_url: "",
  sort_order: "0",
  unit_name: "",
  personality_group: "",
  stream: "all",
  is_active: true,
};

const SCIENCE_STREAMS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
];

const ECONOMICS_LITERATURE_STREAMS = [
  "تسيير واقتصاد",
  "آداب وفلسفة",
];

const UNIT_OPTIONS_BY_GROUP: Record<
  StreamGroup,
  Record<Subject, string[]>
> = {
  science: {
    history: [
      "تطور العالم في ظل القطبية الثنائية ما بين 1945 و1989",
      "الجزائر ما بين 1945 و1989",
      "تطور العالم الثالث ما بين 1945 و1989",
    ],
    geography: [
      "واقع الاقتصاد العالمي",
      "القوى الاقتصادية الكبرى في العالم",
      "الاقتصاد والتنمية في دول الجنوب",
    ],
  },

  economics_literature: {
    history: [
      "تطور العالم في ظل الثنائية القطبية (1945 - 1989)",
      "الجزائر ما بين 1945 - 1989",
      "العالم الثالث بين تراجع الاستعمار التقليدي واستمرارية حركات التحرر",
    ],
    geography: [
      "واقع الاقتصاد العالمي",
      "القوى الاقتصادية الكبرى في العالم",
      "الاقتصاد الجزائري والفوارق الإقليمية",
    ],
  },

  languages: {
    history: [
      "تطور العالم في ظل الثنائية القطبية (1945 - 1989)",
      "الجزائر بين 1945 و1989",
      "العالم الثالث بين تراجع الاستعمار التقليدي واستمرار حركات التحرر",
    ],
    geography: [
      "واقع الاقتصاد العالمي",
      "القوى الاقتصادية الكبرى في العالم",
      "الاقتصاد الجزائري وعلاقته بالعالم الخارجي",
    ],
  },
};

function getStreamGroup(stream: string): StreamGroup | null {
  if (SCIENCE_STREAMS.includes(stream)) {
    return "science";
  }

  if (ECONOMICS_LITERATURE_STREAMS.includes(stream)) {
    return "economics_literature";
  }

  if (stream === "لغات أجنبية") {
    return "languages";
  }

  return null;
}

function getUnitOptions(subject: Subject, stream: string): string[] {
  if (stream === "all") {
    return Array.from(
      new Set(
        Object.values(UNIT_OPTIONS_BY_GROUP).flatMap(
          (group) => group[subject]
        )
      )
    );
  }

  const group = getStreamGroup(stream) ?? "science";

  return UNIT_OPTIONS_BY_GROUP[group][subject];
}

const typeLabels: Record<CardType, string> = {
  term: "مصطلح",
  personality: "شخصية",
  date: "تاريخ",
};

const groupLabels: Record<PersonalityGroup, string> = {
  historical: "شخصيات تاريخية",
  national: "شخصيات وطنية جزائرية",
  french: "شخصيات فرنسية",
  western: "شخصيات المعسكر الغربي",
  eastern: "شخصيات المعسكر الشرقي",
  third_world: "شخصيات العالم الثالث",
};

const streamOptions = [...BAC_STREAMS];

export default function AdminFlashcardsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterStream, setFilterStream] = useState("all");
  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCards() {
    const supabase = getSupabase();

    if (!supabase) {
      setErrorMessage("تعذر الاتصال بـ Supabase.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminData, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminData !== true) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from("flashcards")
        .select(
          "id, subject, card_type, title, front_content, back_content, image_url, sort_order, unit_name, personality_group, unit_number, stream, is_active, created_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCards((data ?? []) as Flashcard[]);
    } catch (error) {
      console.error("ADMIN FLASHCARDS ERROR:", error);
      setErrorMessage(
        "تعذر تحميل البطاقات. تحقق من الاتصال بقاعدة البيانات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof CardForm>(
    key: K,
    value: CardForm[K]
  ) {
    setForm((previous) => {
      const next = { ...previous, [key]: value };

      if (key === "subject" && value === "geography") {
        next.card_type = "term";
        next.personality_group = "";
      }

      if (key === "card_type" && value !== "personality") {
        next.personality_group = "";
      }

      if (key === "stream" || key === "subject") {
        const newOptions = getUnitOptions(
          next.subject,
          next.stream
        );

        if (!newOptions.includes(next.unit_name)) {
          next.unit_name = "";
        }
      }

      return next;
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function getCardUnitName(card: Flashcard) {
    return (
      card.unit_name?.trim() ||
      (card.unit_number !== null ? `الوحدة ${card.unit_number}` : "")
    );
  }

  function getStreamLabel(stream: string | null) {
    return stream || "عام — جميع الشعب";
  }

  function startEditing(card: Flashcard) {
    setEditingId(card.id);

    const savedGroup = card.personality_group;
    const validGroup =
      savedGroup === "historical" ||
      savedGroup === "national" ||
      savedGroup === "french" ||
      savedGroup === "western" ||
      savedGroup === "eastern" ||
      savedGroup === "third_world"
        ? savedGroup
        : "";

    setForm({
      subject: card.subject,
      card_type: card.card_type,
      title: card.title,
      front_content: card.front_content,
      back_content: card.back_content,
      image_url: card.image_url ?? "",
      sort_order: String(card.sort_order),
      unit_name: getCardUnitName(card),
      personality_group: validGroup,
      stream: card.stream ?? "all",
      is_active: card.is_active,
    });

    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const supabase = getSupabase();

    if (!supabase) {
      setErrorMessage("تعذر الاتصال بـ Supabase.");
      return;
    }

    if (
      !form.title.trim() ||
      !form.front_content.trim() ||
      !form.back_content.trim()
    ) {
      setErrorMessage("عمّر العنوان ومحتوى الوجهين.");
      return;
    }

    if (!form.unit_name.trim()) {
      setErrorMessage("اختار الوحدة من القائمة.");
      return;
    }

    if (
      form.card_type === "personality" &&
      !form.personality_group
    ) {
      setErrorMessage("اختار تصنيف الشخصية.");
      return;
    }

    if (
      form.image_url.trim() &&
      !/^https?:\/\/\S+$/i.test(form.image_url.trim())
    ) {
      setErrorMessage(
        "رابط الصورة غير صالح. استعمل رابطًا يبدأ بـ https:// أو http://"
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        subject: form.subject,
        card_type: form.card_type,
        title: form.title.trim(),
        front_content: form.front_content.trim(),
        back_content: form.back_content.trim(),
        image_url: form.image_url.trim() || null,
        sort_order: Math.max(0, Number(form.sort_order) || 0),
        unit_name: form.unit_name.trim(),
        personality_group:
          form.card_type === "personality"
            ? form.personality_group || null
            : null,
        stream: form.stream === "all" ? null : form.stream,
        unit_number: null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("flashcards")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMessage("تم تعديل البطاقة بنجاح.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { error } = await supabase.from("flashcards").insert({
          ...payload,
          created_by: user.id,
        });

        if (error) throw error;

        setMessage(
          form.is_active
            ? "تمت إضافة البطاقة ونشرها للطلبة."
            : "تمت إضافة البطاقة، وهي مخفية عن الطلبة."
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadCards();
    } catch (error) {
      console.error("SAVE FLASHCARD ERROR:", error);
      setErrorMessage(
        "ما قدرناش نحفظو البطاقة. تحقق من صلاحيات Supabase وحاول مجددًا."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(card: Flashcard) {
    const supabase = getSupabase();
    if (!supabase) return;

    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("flashcards")
      .update({
        is_active: !card.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    if (error) {
      console.error("TOGGLE FLASHCARD ERROR:", error);
      setErrorMessage("تعذر تغيير حالة نشر البطاقة.");
      return;
    }

    setMessage(
      !card.is_active
        ? "تم نشر البطاقة."
        : "تم إخفاء البطاقة عن الطلبة."
    );

    await loadCards();
  }

  async function deleteCard(card: Flashcard) {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف بطاقة «${card.title}» نهائيًا؟`
      )
    ) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", card.id);

    if (error) {
      console.error("DELETE FLASHCARD ERROR:", error);
      setErrorMessage("تعذر حذف البطاقة.");
      return;
    }

    if (editingId === card.id) resetForm();

    setMessage("تم حذف البطاقة.");
    await loadCards();
  }

  const unitOptions = getUnitOptions(form.subject, form.stream);

  const availableUnitOptions =
    form.unit_name && !unitOptions.includes(form.unit_name)
      ? [form.unit_name, ...unitOptions]
      : unitOptions;

  const unitNames = Array.from(
    new Set(
      cards
        .map(getCardUnitName)
        .filter((unitName) => unitName.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ar"));

  const filteredCards = cards.filter((card) => {
    const matchesSubject =
      filterSubject === "all" || card.subject === filterSubject;

    const matchesType =
      filterType === "all" || card.card_type === filterType;

    const matchesUnit =
      filterUnit === "all" || getCardUnitName(card) === filterUnit;

    const matchesStream =
      filterStream === "all" ||
      (filterStream === "common" && card.stream === null) ||
      card.stream === filterStream;

    const matchesSearch =
      !search.trim() ||
      card.title.toLowerCase().includes(search.trim().toLowerCase());

    return (
      matchesSubject &&
      matchesType &&
      matchesUnit &&
      matchesStream &&
      matchesSearch
    );
  });

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-300">
        جاري تحميل إدارة حفظني...
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main
      dir="rtl"
      className="min-h-full px-4 py-6 text-slate-100 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← الرجوع إلى لوحة الإدارة
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#071b2d] via-[#08283d] to-[#063247] p-6 md:p-8">
          <div className="relative">
            <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              MARIS ACADEMY ²⁰²⁷
            </span>

            <h1 className="mt-4 text-3xl font-bold text-white">
              🧠 إدارة حفظني
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              أنشئ بطاقات التاريخ والجغرافيا، وحدّد الشعبة والوحدة
              وتصنيف الشخصية، ثم تحكّم في المحتوى ونشره.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryCard label="كل البطاقات" value={cards.length} />
              <SummaryCard
                label="منشورة"
                value={cards.filter((card) => card.is_active).length}
              />
              <SummaryCard
                label="مخفية"
                value={cards.filter((card) => !card.is_active).length}
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingId ? "✏️ تعديل بطاقة" : "➕ إضافة بطاقة جديدة"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                حدّد المادة والشعبة والوحدة، ثم اكتب محتوى الوجهين.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="المادة">
                <select
                  value={form.subject}
                  onChange={(event) =>
                    updateForm("subject", event.target.value as Subject)
                  }
                  className={inputClass}
                >
                  <option value="history">التاريخ</option>
                  <option value="geography">الجغرافيا</option>
                </select>
              </Field>

              <Field label="نوع البطاقة">
                <select
                  value={form.card_type}
                  onChange={(event) =>
                    updateForm("card_type", event.target.value as CardType)
                  }
                  className={inputClass}
                >
                  <option value="term">مصطلح</option>
                  {form.subject === "history" && (
                    <>
                      <option value="personality">شخصية</option>
                      <option value="date">تاريخ</option>
                    </>
                  )}
                </select>
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="الشعبة المستهدفة">
                <select
                  value={form.stream}
                  onChange={(event) =>
                    updateForm("stream", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="all">عام — جميع الشعب</option>
                  {streamOptions.map((stream) => (
                    <option key={stream} value={stream}>
                      {stream}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الوحدة التعليمية">
                <select
                  value={form.unit_name}
                  onChange={(event) =>
                    updateForm("unit_name", event.target.value)
                  }
                  className={inputClass}
                  required
                >
                  <option value="">اختار الوحدة</option>
                  {availableUnitOptions.map((unitName) => (
                    <option key={unitName} value={unitName}>
                      {unitName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {form.card_type === "personality" && (
              <Field label="تصنيف الشخصية">
                <select
                  value={form.personality_group}
                  onChange={(event) =>
                    updateForm(
                      "personality_group",
                      event.target.value as PersonalityGroup | ""
                    )
                  }
                  className={inputClass}
                  required
                >
                  <option value="">اختار تصنيف الشخصية</option>
                  {Object.entries(groupLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="عنوان البطاقة">
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="مثال: الحرب الباردة"
                className={inputClass}
                maxLength={200}
                required
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="الوجه الأمامي — السؤال أو المصطلح">
                <textarea
                  value={form.front_content}
                  onChange={(event) =>
                    updateForm("front_content", event.target.value)
                  }
                  placeholder="المحتوى الذي يراه الطالب أولًا..."
                  className={`${inputClass} min-h-36 resize-y`}
                  required
                />
              </Field>

              <Field label="الوجه الخلفي — التعريف أو الشرح">
                <textarea
                  value={form.back_content}
                  onChange={(event) =>
                    updateForm("back_content", event.target.value)
                  }
                  placeholder="المحتوى الذي يظهر عند قلب البطاقة..."
                  className={`${inputClass} min-h-36 resize-y`}
                  required
                />
              </Field>
            </div>

            <Field label="رابط الصورة (اختياري)">
              <input
                type="url"
                value={form.image_url}
                onChange={(event) =>
                  updateForm("image_url", event.target.value)
                }
                placeholder="https://..."
                className={inputClass}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="ترتيب البطاقة">
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateForm("sort_order", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateForm("is_active", event.target.checked)
                    }
                    className="h-5 w-5 accent-cyan-400"
                  />
                  <span>
                    <span className="block font-semibold text-white">
                      نشر البطاقة للطلبة
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      أزل العلامة لإبقائها مخفية.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-cyan-400 px-5 py-3.5 font-bold text-[#041724] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-48"
            >
              {saving
                ? "جاري الحفظ..."
                : editingId
                  ? "حفظ التعديلات"
                  : "إضافة البطاقة"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 md:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">
              📚 البطاقات الموجودة
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              صفِّ المحتوى حسب الشعبة والمادة والنوع والوحدة، دون تغيير حسابك.
            </p>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بعنوان البطاقة..."
              className={inputClass}
            />

            <select
              value={filterStream}
              onChange={(event) => setFilterStream(event.target.value)}
              className={inputClass}
            >
              <option value="all">كل الشعب والبطاقات العامة</option>
              <option value="common">البطاقات العامة فقط</option>
              {streamOptions.map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
            </select>

            <select
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
              className={inputClass}
            >
              <option value="all">كل المواد</option>
              <option value="history">التاريخ</option>
              <option value="geography">الجغرافيا</option>
            </select>

            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className={inputClass}
            >
              <option value="all">كل الأنواع</option>
              <option value="term">مصطلحات</option>
              <option value="personality">شخصيات</option>
              <option value="date">تواريخ</option>
            </select>

            <select
              value={filterUnit}
              onChange={(event) => setFilterUnit(event.target.value)}
              className={inputClass}
            >
              <option value="all">كل الوحدات</option>
              {unitNames.map((unitName) => (
                <option key={unitName} value={unitName}>
                  {unitName}
                </option>
              ))}
            </select>
          </div>

          {filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <div className="text-4xl">🗂️</div>
              <p className="mt-3 font-semibold text-white">
                ما كاين حتى بطاقة هنا
              </p>
              <p className="mt-2 text-sm text-slate-500">
                أضف أول بطاقة من النموذج أعلاه أو غيّر عوامل التصفية.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Tag>
                          {card.subject === "history" ? "التاريخ" : "الجغرافيا"}
                        </Tag>

                        <Tag>{typeLabels[card.card_type]}</Tag>

                        <Tag>
                          {getCardUnitName(card) || "وحدة غير محددة"}
                        </Tag>

                        <Tag>{getStreamLabel(card.stream)}</Tag>

                        {card.card_type === "personality" &&
                          card.personality_group &&
                          card.personality_group in groupLabels && (
                            <Tag>
                              {
                                groupLabels[
                                  card.personality_group as PersonalityGroup
                                ]
                              }
                            </Tag>
                          )}

                        <Tag>{card.is_active ? "منشورة" : "مخفية"}</Tag>
                      </div>

                      <h3 className="break-words text-lg font-bold text-white">
                        {card.title}
                      </h3>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
                        <span className="font-semibold text-cyan-300">
                          الأمامي:{" "}
                        </span>
                        {card.front_content}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
                        <span className="font-semibold text-emerald-300">
                          الخلفي:{" "}
                        </span>
                        {card.back_content}
                      </p>

                      {card.image_url && (
                        <a
                          href={card.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-xs text-cyan-300 underline"
                        >
                          فتح الصورة المرفقة
                        </a>
                      )}

                      <p className="mt-3 text-xs text-slate-600">
                        الترتيب: {card.sort_order}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-40 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => startEditing(card)}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/15"
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => void togglePublished(card)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                      >
                        {card.is_active ? "إخفاء" : "نشر"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteCard(card)}
                        className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#061522] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cyan-300">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}
