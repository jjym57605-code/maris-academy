-- ══════════════════════════════════════════════════════════════════
-- MARIS ACADEMY ²⁰²⁷ — مخطط قاعدة البيانات (V1)
-- ══════════════════════════════════════════════════════════════════
-- طريقة التنفيذ:
--   لوحة تحكم Supabase ← SQL Editor ← New query
--   الصق هذا الملف كاملاً ثم اضغط Run.
--
-- المبادئ:
--   • مفاتيح أساسية UUID
--   • Row Level Security على كل الجداول
--   • نقاط الخبرة تُمنح فقط من قاعدة البيانات
--     (مُحفّزات ودوال security definer) — لا يمكن
--     للواجهة تعديلها مباشرة
--   • الإجابات الصحيحة غير مكشوفة للطلاب:
--     جدول questions مغلق، والقراءة عبر العرض
--     questions_public الذي يخفي correct_option
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1) الملفات الشخصية
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name  text not null default '',
  stream     text,
  maris_id   text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2) المواد الدراسية
--    stream = null تعني مادة مشتركة بين كل الشعب
-- ─────────────────────────────────────────────
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  stream     text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3) الدورات
-- ─────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 4) الدروس
--    resources: مصفوفة JSONB بالشكل [{"title": "...", "url": "..."}]
-- ─────────────────────────────────────────────
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  content     text,
  resources   jsonb not null default '[]'::jsonb,
  order_index int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 5) تقدم الدروس (درس مكتمل = صف واحد)
-- ─────────────────────────────────────────────
create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ─────────────────────────────────────────────
-- 6) الاختبارات
-- ─────────────────────────────────────────────
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses (id) on delete set null,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 7) الأسئلة
--    options: مصفوفة JSONB بالشكل
--    [{"key": "أ", "text": "..."}, {"key": "ب", "text": "..."}]
-- ─────────────────────────────────────────────
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes (id) on delete cascade,
  text           text not null,
  options        jsonb not null default '[]'::jsonb,
  correct_option text not null,
  order_index    int  not null default 0,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 8) محاولات الاختبار
-- ─────────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  quiz_id          uuid not null references public.quizzes (id) on delete cascade,
  score            int  not null default 0,
  correct_answers  int  not null default 0,
  total_questions  int  not null default 0,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 9) إجابات المحاولات
-- ─────────────────────────────────────────────
create table if not exists public.quiz_answers (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id     uuid not null references public.questions (id) on delete cascade,
  selected_option text not null,
  is_correct      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 10) معاملات نقاط الخبرة
--     لا إدراج مباشر من الواجهة — فقط عبر
--     المُحفّزات والدوال الآمنة أدناه
-- ─────────────────────────────────────────────
create table if not exists public.xp_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  amount       int  not null,
  reason       text not null check (reason in ('lesson_complete', 'quiz_complete')),
  reference_id uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_lesson_progress_user on public.lesson_progress (user_id);
create index if not exists idx_lessons_course       on public.lessons (course_id);
create index if not exists idx_courses_subject      on public.courses (subject_id);
create index if not exists idx_questions_quiz       on public.questions (quiz_id);
create index if not exists idx_attempts_user        on public.quiz_attempts (user_id);
create index if not exists idx_answers_attempt      on public.quiz_answers (attempt_id);
create index if not exists idx_xp_user              on public.xp_transactions (user_id);

-- ─────────────────────────────────────────────
-- تحديث updated_at تلقائياً للملفات الشخصية
-- ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────
-- مُحفّز نقاط الخبرة لإتمام الدرس (+20 XP)
-- يعمل بصلاحيات المالك ويتجاوز RLS بأمان
-- ─────────────────────────────────────────────
create or replace function public.handle_lesson_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.xp_transactions
    where user_id = new.user_id
      and reason = 'lesson_complete'
      and reference_id = new.lesson_id
  ) then
    insert into public.xp_transactions (user_id, amount, reason, reference_id)
    values (new.user_id, 20, 'lesson_complete', new.lesson_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lesson_complete on public.lesson_progress;
create trigger trg_lesson_complete
  after insert on public.lesson_progress
  for each row execute function public.handle_lesson_complete();

-- ─────────────────────────────────────────────
-- دالة تسليم الاختبار: تصحيح + محاولة + إجابات + XP
-- في معاملة واحدة. الواجهة ترسل الإجابات المختارة فقط.
-- النتيجة: 10 XP عن كل إجابة صحيحة.
-- ─────────────────────────────────────────────
create or replace function public.submit_quiz(
  p_quiz_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_total      int;
  v_correct    int := 0;
  v_score      int;
  v_xp         int;
  v_attempt_id uuid;
  v_answer     jsonb;
  v_question   record;
  v_is_correct boolean;

  -- Achievement
  v_achievement_id uuid;
  v_achievement_title text;
  v_achievement_description text;
  v_achievement_icon text;
  v_achievement_xp int;
  v_achievement_unlocked boolean := false;
begin

  -- ================================
  -- التحقق من تسجيل الدخول
  -- ================================
  if v_user is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;


  -- ================================
  -- عدد الأسئلة
  -- ================================
  select count(*)
  into v_total
  from public.questions
  where quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'الاختبار غير موجود أو لا يحتوي على أسئلة';
  end if;


  -- ================================
  -- إنشاء محاولة الاختبار
  -- ================================
  insert into public.quiz_attempts (
    user_id,
    quiz_id,
    total_questions
  )
  values (
    v_user,
    p_quiz_id,
    v_total
  )
  returning id into v_attempt_id;


  -- ================================
  -- تصحيح الإجابات
  -- ================================
  for v_answer in
    select * from jsonb_array_elements(p_answers)
  loop

    select *
    into v_question
    from public.questions
    where id = (v_answer ->> 'question_id')::uuid
      and quiz_id = p_quiz_id;

    if found then

      v_is_correct :=
        v_question.correct_option =
        (v_answer ->> 'selected_option');

      if v_is_correct then
        v_correct := v_correct + 1;
      end if;

      insert into public.quiz_answers (
        attempt_id,
        question_id,
        selected_option,
        is_correct
      )
      values (
        v_attempt_id,
        v_question.id,
        v_answer ->> 'selected_option',
        v_is_correct
      );

    end if;

  end loop;


  -- ================================
  -- حساب النتيجة و XP
  -- ================================
  v_score := round(100.0 * v_correct / v_total);
  v_xp := v_correct * 10;


  update public.quiz_attempts
  set
    correct_answers = v_correct,
    score = v_score,
    completed_at = now()
  where id = v_attempt_id;


  -- ================================
  -- تسجيل XP الاختبار
  -- ================================
  insert into public.xp_transactions (
    user_id,
    amount,
    reason,
    reference_id
  )
  values (
    v_user,
    v_xp,
    'quiz_complete',
    v_attempt_id
  );


  -- =====================================================
  -- ACHIEVEMENT: أول اختبار
  -- =====================================================

  /*
    إذا كانت هذه أول محاولة اختبار للطالب،
    نبحث عن Achievement بالكود:
    
    first_quiz
  */

  if (
    select count(*)
    from public.quiz_attempts
    where user_id = v_user
  ) = 1 then

    select
      id,
      title,
      description,
      icon,
      xp_reward
    into
      v_achievement_id,
      v_achievement_title,
      v_achievement_description,
      v_achievement_icon,
      v_achievement_xp
    from public.achievements
    where code = 'first_quiz'
    limit 1;


    -- إذا كان الإنجاز موجوداً
    if v_achievement_id is not null then

      -- نتأكد أنه لم يُمنح سابقاً
      if not exists (
        select 1
        from public.user_achievements
        where user_id = v_user
          and achievement_id = v_achievement_id
      ) then

        insert into public.user_achievements (
          user_id,
          achievement_id,
          unlocked_at
        )
        values (
          v_user,
          v_achievement_id,
          now()
        );

        v_achievement_unlocked := true;

      end if;

    end if;

  end if;


  -- ================================
  -- النتيجة للواجهة
  -- ================================
  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'correct', v_correct,
    'wrong', v_total - v_correct,
    'total', v_total,
    'xp_earned', v_xp,

    -- Achievement
    'achievement_unlocked', v_achievement_unlocked,

    'achievement',
      case
        when v_achievement_unlocked then
          jsonb_build_object(
            'id', v_achievement_id,
            'title', v_achievement_title,
            'description', v_achievement_description,
            'icon', v_achievement_icon,
            'xp_reward', v_achievement_xp
          )
        else
          null
      end
  );

end;
$$;

-- ─────────────────────────────────────────────
-- العرض العام للأسئلة — بدون الإجابة الصحيحة
-- ─────────────────────────────────────────────
create or replace view public.questions_public
with (security_invoker = false) as
  select id, quiz_id, text, options, order_index
  from public.questions;

-- ══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles        enable row level security;
alter table public.subjects        enable row level security;
alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes         enable row level security;
alter table public.questions       enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.quiz_answers    enable row level security;
alter table public.xp_transactions enable row level security;

-- ── الملفات الشخصية: كل طالب يرى ويعدّل ملفه فقط ──
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ── المحتوى التعليمي: قراءة لكل مستخدم موثّق ──
drop policy if exists subjects_read on public.subjects;
create policy subjects_read on public.subjects
  for select to authenticated using (true);

drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select to authenticated using (true);

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to authenticated using (true);

drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes
  for select to authenticated using (true);

-- ── جدول الأسئلة: لا وصول مباشر (القراءة عبر questions_public فقط) ──
-- لا ننشئ أي سياسة select هنا — RLS يمنع الوصول افتراضياً.

-- ── تقدم الدروس: الطالب يقرأ ويسجّل تقدمه فقط ──
drop policy if exists lesson_progress_select_own on public.lesson_progress;
create policy lesson_progress_select_own on public.lesson_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists lesson_progress_insert_own on public.lesson_progress;
create policy lesson_progress_insert_own on public.lesson_progress
  for insert to authenticated with check (auth.uid() = user_id);

-- ── محاولات الاختبار: قراءة المحاولات الخاصة فقط ──
-- (الإدراج يتم عبر دالة submit_quiz الآمنة)
drop policy if exists attempts_select_own on public.quiz_attempts;
create policy attempts_select_own on public.quiz_attempts
  for select to authenticated using (auth.uid() = user_id);

-- ── إجابات الاختبار: قراءة إجابات محاولات الطالب فقط ──
drop policy if exists answers_select_own on public.quiz_answers;
create policy answers_select_own on public.quiz_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

-- ── نقاط الخبرة: قراءة فقط — لا إدراج ولا تعديل من الواجهة ──
drop policy if exists xp_select_own on public.xp_transactions;
create policy xp_select_own on public.xp_transactions
  for select to authenticated using (auth.uid() = user_id);

-- ── صلاحيات العرض والدوال ──
grant select on public.questions_public to authenticated;
revoke all on public.questions from authenticated, anon;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
